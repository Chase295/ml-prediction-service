"""
n8n Webhook Client für ML Prediction Service

Sendet Vorhersagen an n8n mit vollständigen Modell-Informationen.
"""
import json
import aiohttp
from datetime import datetime
from typing import List, Dict, Optional
from app.utils.config import N8N_WEBHOOK_URL, N8N_WEBHOOK_TIMEOUT, DEFAULT_ALERT_THRESHOLD
from app.utils.logging_config import get_logger
from app.database.connection import get_pool
from app.database.models import save_webhook_log

logger = get_logger(__name__)


async def send_to_n8n(
    coin_id: str,
    timestamp: datetime,
    predictions: List[Dict],
    active_models: List[Dict]
) -> bool:
    """
    Sendet Vorhersagen an n8n Webhook (pro Modell individuell konfigurierbar).
    
    Payload enthält:
    - Coin-Informationen
    - Vorhersagen mit vollständigen Modell-Informationen (gefiltert nach Modell-Einstellungen)
    - Alert-Flag für jede Vorhersage
    - Metadata (Anzahl Vorhersagen, Alerts, etc.)
    
    Args:
        coin_id: Coin-ID (mint)
        timestamp: Zeitstempel der Daten
        predictions: Liste von Vorhersagen (aus predict_coin_all_models)
        active_models: Liste von aktiven Modell-Konfigurationen
        
    Returns:
        True wenn mindestens ein Webhook erfolgreich war, False sonst
    """
    logger.info(f"📥 send_to_n8n aufgerufen: coin_id={coin_id[:20]}..., predictions={len(predictions)}, active_models={len(active_models)}")
    # Debug: Zeige alle active_models
    for m in active_models:
        logger.info(f"  - Active Model: id={m.get('id')}, model_id={m.get('model_id')}, n8n_webhook_url={m.get('n8n_webhook_url')}, n8n_send_mode={m.get('n8n_send_mode')}, n8n_enabled={m.get('n8n_enabled', True)}")
    
    # Gruppiere Predictions nach Modell (für individuelle n8n URLs)
    models_to_send = {}
    
    for pred in predictions:
        model_id = pred['model_id']
        
        # Finde Modell-Informationen
        model_info = next(
            (m for m in active_models if m['model_id'] == model_id),
            None
        )
        
        if not model_info:
            logger.warning(f"Modell-Informationen nicht gefunden für model_id={model_id}")
            continue
        
        # Prüfe ob n8n für dieses Modell aktiviert ist
        n8n_enabled = model_info.get('n8n_enabled', True) if model_info.get('n8n_enabled') is not None else True
        if not n8n_enabled:
            logger.debug(f"⏭️ n8n deaktiviert für Modell {model_id} (active_model_id={model_info.get('id')}) - überspringe")
            continue
        
        # Hole n8n Einstellungen (pro Modell oder global)
        model_n8n_url = model_info.get('n8n_webhook_url')
        n8n_url = model_n8n_url if model_n8n_url else N8N_WEBHOOK_URL
        n8n_send_mode = model_info.get('n8n_send_mode', 'all')
        
        logger.info(f"🔗 Modell {model_id} (active_model_id={model_info.get('id')}): model_n8n_url={model_n8n_url}, n8n_url={n8n_url}, n8n_send_mode={n8n_send_mode}, n8n_enabled={n8n_enabled}, N8N_WEBHOOK_URL={N8N_WEBHOOK_URL}")
        
        # Prüfe ob Webhook URL gesetzt ist
        if not n8n_url:
            logger.warning(f"⚠️ Keine n8n URL für Modell {model_id} (active_model_id={model_info.get('id')}) - überspringe")
            continue
        
        # Alert-Threshold prüfen
        threshold = model_info.get('alert_threshold', DEFAULT_ALERT_THRESHOLD)
        is_alert = pred['probability'] >= threshold
        
        # Filter nach Send-Mode
        if n8n_send_mode == 'alerts_only' and not is_alert:
            logger.info(f"⏭️ Modell {model_id} sendet nur Alerts - überspringe (probability={pred['probability']:.2f} < threshold={threshold:.2f})")
            continue
        
        # Gruppiere nach URL (verschiedene Modelle können verschiedene URLs haben)
        if n8n_url not in models_to_send:
            models_to_send[n8n_url] = {
                'predictions': [],
                'models': []
            }
        
        # Erweiterte Prediction
        enriched_pred = {
            # Vorhersage-Daten
            "prediction": pred['prediction'],
            "probability": float(pred['probability']),
            "is_alert": is_alert,
            "alert_threshold": float(threshold),
            
            # Modell-Informationen
            "model": {
                "id": model_id,
                "active_model_id": model_info['id'],
                "name": model_info.get('custom_name') or model_info.get('name', 'Unknown'),
                "model_type": model_info['model_type'],
                "target_variable": model_info['target_variable'],
                "target_operator": model_info.get('target_operator'),
                "target_value": float(model_info['target_value']) if model_info.get('target_value') else None,
                "future_minutes": model_info.get('future_minutes'),
                "price_change_percent": float(model_info['price_change_percent']) if model_info.get('price_change_percent') else None,
                "target_direction": model_info.get('target_direction'),
                "features": model_info['features'],
                "phases": model_info.get('phases'),
                "total_predictions": model_info.get('total_predictions', 0),
                "last_prediction_at": model_info.get('last_prediction_at').isoformat() if model_info.get('last_prediction_at') else None
            }
        }
        
        models_to_send[n8n_url]['predictions'].append(enriched_pred)
        if model_info not in models_to_send[n8n_url]['models']:
            models_to_send[n8n_url]['models'].append(model_info)
    
    if not models_to_send:
        logger.warning(f"⚠️ Keine Vorhersagen zum Senden an n8n (keine URLs konfiguriert oder alle gefiltert). Predictions: {len(predictions)}, Active Models: {len(active_models)}")
        # Debug: Zeige alle Modelle
        for m in active_models:
            logger.info(f"  - Modell {m.get('model_id')} (active_id={m.get('id')}): n8n_url={m.get('n8n_webhook_url')}, send_mode={m.get('n8n_send_mode')}")
        return False
    
    # Sende an jede URL (können mehrere sein, wenn Modelle verschiedene URLs haben)
    logger.info(f"📤 Sende Vorhersagen an {len(models_to_send)} n8n URL(s): {list(models_to_send.keys())}")
    success_count = 0
    for n8n_url, data in models_to_send.items():
        enriched_predictions = data['predictions']
        logger.info(f"📤 Sende {len(enriched_predictions)} Vorhersagen an n8n URL: {n8n_url}")
        
        # Vollständige Payload
        payload = {
            "coin_id": coin_id,
            "timestamp": timestamp.isoformat(),
            "predictions": enriched_predictions,
            "metadata": {
                "total_predictions": len(enriched_predictions),
                "alerts_count": sum(1 for p in enriched_predictions if p['is_alert']),
                "service": "ml-prediction-service",
                "version": "1.0.0"
            }
        }
        
        # Sende an n8n
        pool = await get_pool()
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    n8n_url,
                    json=payload,  # ⚠️ WICHTIG: json= für JSON-Format!
                    timeout=aiohttp.ClientTimeout(total=N8N_WEBHOOK_TIMEOUT),
                    headers={"Content-Type": "application/json"}
                ) as response:
                    response_body = await response.text()
                    
                    if response.status >= 200 and response.status < 300:
                        logger.info(
                            f"✅ Vorhersagen an n8n gesendet für Coin {coin_id[:8]}... (URL: {n8n_url}, Status: {response.status})",
                            extra={
                                "coin_id": coin_id,
                                "predictions_count": len(enriched_predictions),
                                "alerts_count": sum(1 for p in enriched_predictions if p['is_alert']),
                                "webhook_url": n8n_url
                            }
                        )
                        
                        # Log in DB
                        await save_webhook_log(
                            coin_id=coin_id,
                            data_timestamp=timestamp,
                            webhook_url=n8n_url,
                            payload=payload,
                            response_status=response.status,
                            response_body=response_body,
                            error_message=None
                        )
                        success_count += 1
                    else:
                        logger.error(
                            f"❌ n8n Webhook Fehler: {response.status} (URL: {n8n_url[:80]}...)\n"
                            f"   Response Body: {response_body[:500]}",
                            extra={
                                "coin_id": coin_id,
                                "status": response.status,
                                "error": response_body,
                                "webhook_url": n8n_url
                            }
                        )
                        
                        # Log in DB
                        await save_webhook_log(
                            coin_id=coin_id,
                            data_timestamp=timestamp,
                            webhook_url=n8n_url,
                            payload=payload,
                            response_status=response.status,
                            response_body=response_body,
                            error_message=None
                        )
                        
        except Exception as e:
            logger.error(
                f"❌ Fehler beim Senden an n8n (URL: {n8n_url[:50]}...): {e}",
                extra={"coin_id": coin_id, "error": str(e), "webhook_url": n8n_url},
                exc_info=True
            )
            
            # Log in DB
            await save_webhook_log(
                coin_id=coin_id,
                data_timestamp=timestamp,
                webhook_url=n8n_url,
                payload=payload,
                response_status=None,
                response_body=None,
                error_message=str(e)
            )
    
    return success_count > 0

