"""
Prediction Engine für ML Prediction Service

Macht Vorhersagen mit geladenen Modellen.
"""
import time
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
import asyncpg
import numpy as np
from app.prediction.feature_processor import prepare_features
from app.prediction.model_manager import get_model
from app.utils.logging_config import get_logger
from app.utils.metrics import (
    increment_predictions, increment_errors,
    ml_prediction_duration_seconds, ml_feature_processing_duration_seconds
)

logger = get_logger(__name__)


async def predict_coin(
    coin_id: str,
    timestamp: datetime,
    model_config: Dict[str, Any],
    pool: Optional[asyncpg.Pool] = None
) -> Dict[str, Any]:
    """
    Macht Vorhersage für einen Coin mit einem Modell.
    
    Args:
        coin_id: Coin-ID (mint)
        timestamp: Zeitstempel der Daten
        model_config: Modell-Konfiguration (aus prediction_active_models)
        pool: Datenbank-Pool (optional)
        
    Returns:
        Dict mit 'prediction' (0 oder 1) und 'probability' (0.0 - 1.0)
        
    Raises:
        ValueError: Wenn Features fehlen oder Modell-Fehler
    """
    start_time = time.time()
    
    try:
        # 1. Bereite Features auf
        feature_start = time.time()
        features_df = await prepare_features(
            coin_id=coin_id,
            model_config=model_config,
            pool=pool
        )
        feature_duration = time.time() - feature_start
        ml_feature_processing_duration_seconds.observe(feature_duration)
        
        # 2. Lade Modell (aus Cache oder Datei)
        model = get_model(model_config)
        
        # 3. Mache Vorhersage
        X = features_df.values
        
        # ⚠️ WICHTIG: Modell erwartet 2D-Array (n_samples, n_features)
        if X.ndim == 1:
            X = X.reshape(1, -1)
        
        prediction = model.predict(X)
        probability = model.predict_proba(X)[:, 1]  # Wahrscheinlichkeit für Klasse 1
        
        # 4. Letzter Eintrag (neueste Vorhersage)
        result = {
            "prediction": int(prediction[-1]),
            "probability": float(probability[-1])
        }
        
        # Metrics
        prediction_duration = time.time() - start_time
        ml_prediction_duration_seconds.labels(model_id=str(model_config['model_id'])).observe(prediction_duration)
        
        model_name = model_config.get('custom_name') or model_config.get('name', 'Unknown')
        increment_predictions(model_config['model_id'], model_name)
        
        logger.debug(
            f"✅ Vorhersage für Coin {coin_id[:8]}... mit Modell {model_config['model_id']}: "
            f"prediction={result['prediction']}, probability={result['probability']:.4f}"
        )
        
        return result
        
    except ValueError as e:
        # Spezielle Behandlung für Feature-Fehler (z.B. keine Historie, fehlende Features)
        increment_errors("prediction")
        logger.warning(
            f"⚠️ Feature-Fehler bei Vorhersage für Coin {coin_id[:8]}... mit Modell {model_config.get('id', 'unknown')} (Model ID: {model_config['model_id']}): {e}"
        )
        raise
    except Exception as e:
        increment_errors("prediction")
        logger.error(
            f"❌ Fehler bei Vorhersage für Coin {coin_id[:8]}... mit Modell {model_config.get('id', 'unknown')} (Model ID: {model_config['model_id']}): {e}",
            exc_info=True
        )
        raise


async def predict_coin_all_models(
    coin_id: str,
    timestamp: datetime,
    active_models: List[Dict[str, Any]],
    pool: Optional[asyncpg.Pool] = None
) -> List[Dict[str, Any]]:
    """
    Macht Vorhersagen mit ALLEN aktiven Modellen.
    
    Args:
        coin_id: Coin-ID (mint)
        timestamp: Zeitstempel der Daten
        active_models: Liste von aktiven Modell-Konfigurationen
        pool: Datenbank-Pool (optional)
        
    Returns:
        Liste von Vorhersagen (pro Modell ein Dict)
    """
    results = []
    
    for model_config in active_models:
        try:
            result = await predict_coin(
                coin_id=coin_id,
                timestamp=timestamp,
                model_config=model_config,
                pool=pool
            )
            
            results.append({
                "model_id": model_config['model_id'],
                "active_model_id": model_config['id'],
                "model_name": model_config.get('custom_name') or model_config.get('name', 'Unknown'),
                "prediction": result['prediction'],
                "probability": result['probability']
            })
            
        except ValueError as e:
            # Feature-Fehler (z.B. keine Historie, fehlende Features, Phase-Filter)
            logger.warning(
                f"⚠️ Feature-Fehler bei Modell ID {model_config.get('id', 'unknown')} (Model ID: {model_config['model_id']}, Name: {model_config.get('custom_name') or model_config.get('name', 'Unknown')}) für Coin {coin_id[:8]}...: {e}"
            )
            # Weiter mit nächstem Modell (überspringe dieses Modell für diesen Coin)
            continue
        except Exception as e:
            logger.error(
                f"❌ Fehler bei Modell ID {model_config.get('id', 'unknown')} (Model ID: {model_config['model_id']}, Name: {model_config.get('custom_name') or model_config.get('name', 'Unknown')}) für Coin {coin_id[:8]}...: {e}",
                exc_info=True
            )
            # Weiter mit nächstem Modell
            continue
    
    if len(results) < len(active_models):
        failed_count = len(active_models) - len(results)
        logger.warning(
            f"⚠️ Vorhersagen für Coin {coin_id[:8]}...: {len(results)}/{len(active_models)} erfolgreich, {failed_count} fehlgeschlagen"
        )
    else:
        logger.info(f"✅ Vorhersagen für Coin {coin_id[:8]}...: {len(results)}/{len(active_models)} erfolgreich")
    
    return results

