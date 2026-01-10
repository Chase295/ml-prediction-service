"""
FastAPI Routes für ML Prediction Service
"""
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, Response, status
from fastapi.responses import PlainTextResponse
import asyncpg

from app.api.schemas import (
    PredictRequest, PredictionResponse, PredictionResult, PredictionDetail,
    PredictionsListResponse, ModelInfo, ModelsListResponse, AvailableModelsResponse,
    AvailableModel, ModelImportRequest, ImportModelResponse, RenameModelRequest,
    UpdateAlertThresholdRequest, UpdateN8nSettingsRequest, UpdateAlertConfigRequest,
    UpdateIgnoreSettingsRequest, IgnoreSettingsResponse,
    HealthResponse, StatsResponse, ModelStatisticsResponse
)
from app.database.connection import get_pool
from app.database.models import (
    get_available_models, get_active_models, import_model,
    activate_model, deactivate_model, delete_active_model, rename_active_model,
    update_alert_threshold, update_n8n_settings, update_alert_config, save_prediction, get_predictions, get_latest_prediction, get_model_statistics,
    get_n8n_status_for_model, update_model_performance_metrics,
    update_ignore_settings, get_ignore_settings
)
from app.database.alert_models import get_alerts, get_alert_details, get_alert_statistics, get_model_alert_statistics
from app.prediction.engine import predict_coin_all_models
from app.prediction.model_manager import download_model_file
# from app.training.engine import train_model  # Training module entfernt
# from app.training.model_loader import test_model  # Training module entfernt
# from app.queue.job_manager import create_training_job, get_job_status  # Temporär deaktiviert
# from app.database.models_ml_training import (  # Training module entfernt
#     create_ml_model_job, get_ml_model, list_ml_models,
#     create_test_job, create_comparison_job,
#     get_ml_jobs, get_ml_job
# )
from app.utils.metrics import get_health_status, generate_metrics
from app.utils.logging_config import get_logger, set_request_id
from app.utils.config import MODEL_STORAGE_PATH
import os

logger = get_logger(__name__)

router = APIRouter(prefix="/api", tags=["ML Prediction Service"])

# ============================================================
# Dependency: DB Pool
# ============================================================

async def get_db_pool() -> asyncpg.Pool:
    """Dependency für DB-Pool"""
    return await get_pool()

# ============================================================
# Models Endpoints
# ============================================================

@router.get("/models/available", response_model=AvailableModelsResponse)
async def get_available_models_endpoint():
    """
    Liste aller verfügbaren Modelle aus ml_models (für Import).
    
    Filter: status = 'READY' AND is_deleted = false
    """
    try:
        models = await get_available_models()
        
        available_models = [
            AvailableModel(
                id=m['id'],
                name=m['name'],
                model_type=m['model_type'],
                target_variable=m['target_variable'],
                target_operator=m['target_operator'],
                target_value=m['target_value'],
                future_minutes=m['future_minutes'],
                price_change_percent=m['price_change_percent'],
                target_direction=m['target_direction'],
                features=m['features'],
                phases=m['phases'],
                training_accuracy=m['training_accuracy'],
                training_f1=m['training_f1'],
                created_at=m['created_at']
            )
            for m in models
        ]
        
        return AvailableModelsResponse(
            models=available_models,
            total=len(available_models)
        )
    except Exception as e:
        logger.error(f"❌ Fehler beim Laden verfügbarer Modelle: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/models/import", response_model=ImportModelResponse, status_code=status.HTTP_201_CREATED)
async def import_model_endpoint(request: ModelImportRequest):
    """
    Importiert Modell vom Training Service.
    
    Lädt Modell-Datei herunter und speichert in prediction_active_models.
    
    ⚠️ WICHTIG: Prüft doppelt ob Modell bereits importiert ist (auch wenn gelöscht).
    """
    try:
        import asyncio
        from datetime import datetime
        
        logger.info(f"📥 Import-Anfrage für Modell ID: {request.model_id} um {datetime.now().isoformat()}")
        logger.info(f"🔍 Prüfe ob Modell {request.model_id} bereits importiert ist...")
        
        # 1. Prüfe ob Modell bereits importiert (VOR Download - spart Zeit)
        # Verwende direkte DB-Abfrage für atomare Prüfung (verhindert Race Conditions)
        from app.database.connection import get_pool
        pool = await get_pool()
        existing_db = await pool.fetchrow("""
            SELECT id, is_active FROM prediction_active_models WHERE model_id = $1
        """, request.model_id)
        
        if existing_db:
            existing_id = existing_db['id']
            is_active = existing_db.get('is_active', False)
            status = "aktiv" if is_active else "pausiert"
            logger.warning(f"⚠️ Modell {request.model_id} ist bereits importiert (active_model_id: {existing_id}, Status: {status})")
            raise HTTPException(
                status_code=400, 
                detail=f"Modell {request.model_id} ist bereits importiert (active_model_id: {existing_id}, Status: {status}). Lösche es zuerst, um es erneut zu importieren."
            )
        
        logger.info(f"✅ Modell {request.model_id} ist noch nicht importiert - fahre fort...")
        
        # 2. Lade Modell-Datei vom Training Service
        logger.info(f"📥 Lade Modell {request.model_id} vom Training Service...")
        local_model_path = await download_model_file(request.model_id)
        logger.info(f"✅ Modell-Datei heruntergeladen: {local_model_path}")
        
        # 3. Importiere Modell in prediction_active_models (prüft nochmal intern)
        logger.info(f"💾 Speichere Modell {request.model_id} in Datenbank...")
        try:
            active_model_id = await import_model(
                model_id=request.model_id,
                local_model_path=local_model_path,
                model_file_url=request.model_file_url
            )
            logger.info(f"✅ Modell {request.model_id} erfolgreich importiert (active_model_id: {active_model_id})")
        except ValueError as e:
            # Modell bereits importiert - das sollte nicht passieren, da wir oben prüfen
            logger.error(f"❌ Modell {request.model_id} ist bereits importiert (zweite Prüfung): {e}")
            # Lösche heruntergeladene Datei wieder
            try:
                import os
                if os.path.exists(local_model_path):
                    os.remove(local_model_path)
                    logger.info(f"🗑️ Heruntergeladene Datei gelöscht: {local_model_path}")
            except:
                pass
            raise HTTPException(status_code=400, detail=str(e))
        
        # 4. Hole Modell-Informationen
        active_models = await get_active_models()
        imported_model = next((m for m in active_models if m['id'] == active_model_id), None)
        
        if not imported_model:
            # Versuche auch inaktive Modelle
            active_models_all = await get_active_models(include_inactive=True)
            imported_model = next((m for m in active_models_all if m['id'] == active_model_id), None)
        
        if not imported_model:
            logger.error(f"❌ Importiertes Modell {active_model_id} nicht gefunden nach Import")
            raise HTTPException(status_code=404, detail="Importiertes Modell nicht gefunden")
        
        return ImportModelResponse(
            active_model_id=active_model_id,
            model_id=request.model_id,
            model_name=imported_model['name'],
            local_model_path=local_model_path,
            message=f"Modell {request.model_id} erfolgreich importiert"
        )
    except HTTPException:
        raise
    except ValueError as e:
        logger.warning(f"⚠️ Validierungsfehler beim Import: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"❌ Fehler beim Modell-Import: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/models", response_model=ModelsListResponse)
async def get_models_endpoint(include_inactive: str = "false"):
    """
    Liste aller Modelle (Alias für /models/active)
    """
    return await get_active_models_endpoint(include_inactive)


@router.get("/models/{active_model_id}", response_model=ModelInfo)
async def get_active_model_endpoint(active_model_id: int):
    """
    Details eines aktiven Modells abrufen
    """
    try:
        # Hole alle aktiven Modelle und finde das richtige
        models = await get_active_models(include_inactive=True)
        model = next((m for m in models if m['id'] == active_model_id), None)

        if not model:
            raise HTTPException(status_code=404, detail="Modell nicht gefunden")

        # Konvertiere zu ModelInfo Response
        return ModelInfo(
            id=model['id'],
            model_id=model['model_id'],
            name=model['name'],
            custom_name=model.get('custom_name'),
            model_type=model['model_type'],
            target_variable=model['target_variable'],
            target_operator=model.get('target_operator'),
            target_value=model.get('target_value'),
            future_minutes=model.get('future_minutes'),
            price_change_percent=model.get('price_change_percent'),
            target_direction=model.get('target_direction'),
            features=model.get('features', []),
            phases=model.get('phases'),
            params=model.get('params'),
            is_active=model.get('is_active', True),
            total_predictions=model.get('total_predictions', 0),
            last_prediction_at=model.get('last_prediction_at'),
            alert_threshold=model.get('alert_threshold', 0.7),
            n8n_webhook_url=model.get('n8n_webhook_url'),
            n8n_send_mode=model.get('n8n_send_mode', 'all'),
            n8n_enabled=model.get('n8n_enabled', True),
            coin_filter_mode=model.get('coin_filter_mode', 'all'),
            coin_whitelist=model.get('coin_whitelist'),
            # 🔄 NEU: Coin-Ignore-Einstellungen
            ignore_bad_seconds=model.get('ignore_bad_seconds'),
            ignore_positive_seconds=model.get('ignore_positive_seconds'),
            ignore_alert_seconds=model.get('ignore_alert_seconds'),
            stats=model.get('stats'),
            created_at=model.get('created_at')
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Fehler beim Laden des Modells {active_model_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/models/active", response_model=ModelsListResponse)
async def get_active_models_endpoint(include_inactive: str = "false"):
    """
    Liste aller aktiven Modelle (aus prediction_active_models)
    
    Args:
        include_inactive: Query-Parameter als String ("true" oder "false")
    """
    try:
        # Konvertiere String zu bool
        include_inactive_bool = include_inactive.lower() == "true"
        models = await get_active_models(include_inactive=include_inactive_bool)
        
        model_infos = [
            ModelInfo(
                id=m['id'],
                model_id=m['model_id'],
                name=m['name'],
                custom_name=m.get('custom_name'),
                model_type=m['model_type'],
                target_variable=m['target_variable'],
                target_operator=m['target_operator'],
                target_value=m['target_value'],
                future_minutes=m['future_minutes'],
                price_change_percent=m['price_change_percent'],
                target_direction=m['target_direction'],
                features=m['features'],
                phases=m['phases'],
                params=m['params'],
                is_active=m['is_active'],
                total_predictions=m['total_predictions'],
                last_prediction_at=m['last_prediction_at'],
                alert_threshold=m.get('alert_threshold', 0.7),
                n8n_webhook_url=m.get('n8n_webhook_url'),
                n8n_send_mode=m.get('n8n_send_mode', 'all'),
                n8n_enabled=m.get('n8n_enabled', True),  # WICHTIG: Muss explizit übergeben werden!
                stats=m.get('stats'),
                created_at=m['created_at']
            )
            for m in models
        ]
        
        return ModelsListResponse(
            models=model_infos,
            total=len(model_infos)
        )
    except Exception as e:
        logger.error(f"❌ Fehler beim Laden aktiver Modelle: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/models/{active_model_id}/activate", status_code=status.HTTP_200_OK)
async def activate_model_endpoint(active_model_id: int):
    """Aktiviert Modell (setzt is_active = true)"""
    try:
        success = await activate_model(active_model_id)
        if not success:
            raise HTTPException(status_code=404, detail=f"Modell {active_model_id} nicht gefunden")
        return {"message": f"Modell {active_model_id} aktiviert", "active_model_id": active_model_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Fehler beim Aktivieren: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/models/{active_model_id}/deactivate", status_code=status.HTTP_200_OK)
async def deactivate_model_endpoint(active_model_id: int):
    """Deaktiviert Modell (setzt is_active = false)"""
    try:
        success = await deactivate_model(active_model_id)
        if not success:
            raise HTTPException(status_code=404, detail=f"Modell {active_model_id} nicht gefunden")
        return {"message": f"Modell {active_model_id} deaktiviert", "active_model_id": active_model_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Fehler beim Deaktivieren: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/models/{active_model_id}/rename", status_code=status.HTTP_200_OK)
async def rename_model_endpoint(active_model_id: int, request: RenameModelRequest):
    """Benennt Modell um (setzt custom_name)"""
    try:
        success = await rename_active_model(active_model_id, request.name)
        if not success:
            raise HTTPException(status_code=404, detail=f"Modell {active_model_id} nicht gefunden")
        return {"message": f"Modell {active_model_id} umbenannt zu '{request.name}'", "active_model_id": active_model_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Fehler beim Umbenennen: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/models/{active_model_id}/alert-threshold", status_code=status.HTTP_200_OK)
async def update_alert_threshold_endpoint(active_model_id: int, request: UpdateAlertThresholdRequest):
    """Aktualisiert Alert-Threshold für ein Modell"""
    try:
        success = await update_alert_threshold(active_model_id, request.alert_threshold)
        if not success:
            raise HTTPException(status_code=404, detail=f"Modell {active_model_id} nicht gefunden")
        return {
            "message": f"Alert-Threshold für Modell {active_model_id} auf {request.alert_threshold:.0%} gesetzt",
            "active_model_id": active_model_id,
            "alert_threshold": request.alert_threshold
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Fehler beim Aktualisieren des Alert-Thresholds: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/models/{active_model_id}/n8n-settings", status_code=status.HTTP_200_OK)
async def update_n8n_settings_endpoint(active_model_id: int, request: UpdateN8nSettingsRequest):
    """Aktualisiert n8n Einstellungen für ein aktives Modell"""
    try:
        success = await update_n8n_settings(
            active_model_id, 
            n8n_webhook_url=request.n8n_webhook_url, 
            n8n_send_mode=request.n8n_send_mode,
            n8n_enabled=request.n8n_enabled
        )
        if not success:
            raise HTTPException(status_code=404, detail=f"Modell {active_model_id} nicht gefunden oder keine Änderungen vorgenommen")
        return {
            "message": f"n8n Einstellungen für Modell {active_model_id} aktualisiert",
            "active_model_id": active_model_id,
            "n8n_webhook_url": request.n8n_webhook_url,
            "n8n_send_mode": request.n8n_send_mode,
            "n8n_enabled": request.n8n_enabled
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Fehler beim Aktualisieren der n8n Einstellungen: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/models/{active_model_id}/alert-config", status_code=status.HTTP_200_OK)
async def update_alert_config_endpoint(active_model_id: int, request: UpdateAlertConfigRequest):
    """Aktualisiert komplette Alert-Konfiguration für ein aktives Modell"""
    try:
        success = await update_alert_config(
            active_model_id=active_model_id,
            n8n_webhook_url=request.n8n_webhook_url,
            n8n_enabled=request.n8n_enabled,
            n8n_send_mode=request.n8n_send_mode,
            alert_threshold=request.alert_threshold,
            coin_filter_mode=request.coin_filter_mode,
            coin_whitelist=request.coin_whitelist
        )
        if not success:
            raise HTTPException(status_code=404, detail=f"Modell {active_model_id} nicht gefunden oder keine Änderungen vorgenommen")

        return {
            "message": f"Alert-Konfiguration für Modell {active_model_id} erfolgreich aktualisiert",
            "active_model_id": active_model_id,
            "config": {
                "n8n_webhook_url": request.n8n_webhook_url,
                "n8n_enabled": request.n8n_enabled,
                "n8n_send_mode": request.n8n_send_mode,
                "alert_threshold": request.alert_threshold,
                "coin_filter_mode": request.coin_filter_mode,
                "coin_whitelist": request.coin_whitelist
            }
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Fehler beim Aktualisieren der Alert-Konfiguration: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/models/{active_model_id}/ignore-settings", status_code=status.HTTP_200_OK)
async def update_ignore_settings_endpoint(
    active_model_id: int,
    request: UpdateIgnoreSettingsRequest,
    pool: asyncpg.Pool = Depends(get_pool)
):
    """Aktualisiert Coin-Ignore-Einstellungen für ein Modell"""
    logger.info(f"🔥 DEBUG API: Ignore-Settings Update für Modell {active_model_id}")
    logger.info(f"🔥 DEBUG API: Eingehende Daten: bad={request.ignore_bad_seconds}, positive={request.ignore_positive_seconds}, alert={request.ignore_alert_seconds}")

    try:
        logger.info(f"🔥 DEBUG API: Rufe update_ignore_settings auf...")
        success = await update_ignore_settings(
            pool=pool,
            active_model_id=active_model_id,
            ignore_bad_seconds=request.ignore_bad_seconds,
            ignore_positive_seconds=request.ignore_positive_seconds,
            ignore_alert_seconds=request.ignore_alert_seconds
        )
        logger.info(f"🔥 DEBUG API: update_ignore_settings returned: {success}")

        if not success:
            logger.error(f"🔥 DEBUG API: Modell {active_model_id} nicht gefunden!")
            raise HTTPException(status_code=404, detail=f"Modell {active_model_id} nicht gefunden")

        response_data = {
            "message": f"Coin-Ignore-Einstellungen für Modell {active_model_id} aktualisiert",
            "active_model_id": active_model_id,
            "ignore_bad_seconds": request.ignore_bad_seconds,
            "ignore_positive_seconds": request.ignore_positive_seconds,
            "ignore_alert_seconds": request.ignore_alert_seconds
        }
        logger.info(f"🔥 DEBUG API: Sende Response: {response_data}")
        return response_data
    except ValueError as e:
        logger.error(f"🔥 DEBUG API: ValueError: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Fehler beim Aktualisieren der Ignore-Einstellungen: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/models/{active_model_id}/ignore-settings", response_model=IgnoreSettingsResponse)
async def get_ignore_settings_endpoint(
    active_model_id: int,
    pool: asyncpg.Pool = Depends(get_pool)
):
    """Holt aktuelle Coin-Ignore-Einstellungen für ein Modell"""
    try:
        settings = await get_ignore_settings(pool=pool, active_model_id=active_model_id)
        if settings is None:
            raise HTTPException(status_code=404, detail=f"Modell {active_model_id} nicht gefunden")

        return IgnoreSettingsResponse(**settings)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Fehler beim Laden der Ignore-Einstellungen: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/models/{active_model_id}/n8n-status")
async def get_n8n_status_endpoint(active_model_id: int):
    """Gibt den n8n-Status für ein Modell zurück"""
    try:
        status = await get_n8n_status_for_model(active_model_id)
        return status
    except Exception as e:
        logger.error(f"❌ Fehler beim Abrufen des n8n-Status: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/models/{active_model_id}/statistics", response_model=ModelStatisticsResponse)
async def get_model_statistics_endpoint(active_model_id: int):
    """Detaillierte Statistiken für ein aktives Modell"""
    try:
        stats = await get_model_statistics(active_model_id)
        return ModelStatisticsResponse(**stats)
    except Exception as e:
        logger.error(f"❌ Fehler beim Laden der Modell-Statistiken: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/debug/active-models", status_code=status.HTTP_200_OK)
async def debug_active_models(pool: asyncpg.Pool = Depends(get_db_pool)):
    """Debug: Zeigt alle aktiven Modelle"""
    try:
        from app.database.models import get_active_models
        models = await get_active_models()
        return {"active_models": models, "count": len(models)}
    except Exception as e:
        logger.error(f"❌ Debug Fehler: {e}", exc_info=True)
        return {"error": str(e)}

@router.get("/debug/coin-metrics", status_code=status.HTTP_200_OK)
async def debug_coin_metrics(pool: asyncpg.Pool = Depends(get_db_pool)):
    """Debug: Zeigt coin_metrics Statistiken"""
    try:
        # Hole Statistiken
        row = await pool.fetchrow("""
            SELECT COUNT(*) as total,
                   MAX(timestamp) as latest,
                   MIN(timestamp) as earliest,
                   COUNT(DISTINCT mint) as unique_coins
            FROM coin_metrics
        """)
        return dict(row) if row else {"message": "Keine Daten"}
    except Exception as e:
        logger.error(f"❌ Debug coin_metrics Fehler: {e}", exc_info=True)
        return {"error": str(e)}


@router.post("/admin/migrate-performance-metrics", status_code=status.HTTP_200_OK)
async def migrate_performance_metrics():
    """Führt die Datenbank-Migration für Performance-Metriken aus"""
    try:
        pool = await get_pool()

        # Führe die Migration aus
        await pool.execute("""
            ALTER TABLE prediction_active_models
            ADD COLUMN IF NOT EXISTS training_accuracy NUMERIC(5, 4),
            ADD COLUMN IF NOT EXISTS training_f1 NUMERIC(5, 4),
            ADD COLUMN IF NOT EXISTS training_precision NUMERIC(5, 4),
            ADD COLUMN IF NOT EXISTS training_recall NUMERIC(5, 4),
            ADD COLUMN IF NOT EXISTS roc_auc NUMERIC(5, 4),
            ADD COLUMN IF NOT EXISTS mcc NUMERIC(5, 4),
            ADD COLUMN IF NOT EXISTS confusion_matrix JSONB,
            ADD COLUMN IF NOT EXISTS simulated_profit_pct NUMERIC(8, 4)
        """)

        # Füge Kommentare hinzu
        await pool.execute("COMMENT ON COLUMN prediction_active_models.training_accuracy IS 'Training Accuracy (0.0000-1.0000)'")
        await pool.execute("COMMENT ON COLUMN prediction_active_models.training_f1 IS 'Training F1-Score (0.0000-1.0000)'")
        await pool.execute("COMMENT ON COLUMN prediction_active_models.training_precision IS 'Training Precision (0.0000-1.0000)'")
        await pool.execute("COMMENT ON COLUMN prediction_active_models.training_recall IS 'Training Recall (0.0000-1.0000)'")
        await pool.execute("COMMENT ON COLUMN prediction_active_models.roc_auc IS 'ROC AUC Score (0.0000-1.0000)'")
        await pool.execute("COMMENT ON COLUMN prediction_active_models.mcc IS 'Matthews Correlation Coefficient (-1.0000-1.0000)'")
        await pool.execute("COMMENT ON COLUMN prediction_active_models.confusion_matrix IS 'Confusion Matrix als JSON: {\"tp\": int, \"tn\": int, \"fp\": int, \"fn\": int}'")
        await pool.execute("COMMENT ON COLUMN prediction_active_models.simulated_profit_pct IS 'Simulierte Profitabilität in Prozent (-999.9999 bis 999.9999)'")

        # Füge Indizes hinzu
        await pool.execute("CREATE INDEX IF NOT EXISTS idx_active_models_accuracy ON prediction_active_models(training_accuracy)")
        await pool.execute("CREATE INDEX IF NOT EXISTS idx_active_models_f1 ON prediction_active_models(training_f1)")
        await pool.execute("CREATE INDEX IF NOT EXISTS idx_active_models_profit ON prediction_active_models(simulated_profit_pct)")

        return {"message": "Performance-Metriken Migration erfolgreich ausgeführt"}

    except Exception as e:
        logger.error(f"❌ Fehler bei der Migration: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Migration fehlgeschlagen: {str(e)}")


@router.post("/models/{active_model_id}/update-metrics", status_code=status.HTTP_200_OK)
async def update_model_metrics_endpoint(active_model_id: int):
    """Aktualisiert Performance-Metriken eines Modells aus dem Training-Service"""
    try:
        # Hole model_id aus der Datenbank
        pool = await get_pool()
        row = await pool.fetchrow("""
            SELECT model_id FROM prediction_active_models WHERE id = $1
        """, active_model_id)

        if not row:
            raise HTTPException(status_code=404, detail=f"Modell {active_model_id} nicht gefunden")

        model_id = row['model_id']

        # Aktualisiere Metriken
        success = await update_model_performance_metrics(active_model_id, model_id)
        if not success:
            raise HTTPException(status_code=500, detail="Fehler beim Aktualisieren der Metriken")

        return {"message": f"Performance-Metriken für Modell {active_model_id} aktualisiert"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Fehler beim Aktualisieren der Metriken: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/models/{active_model_id}", status_code=status.HTTP_200_OK)
async def delete_model_endpoint(active_model_id: int):
    """Löscht Modell (aus prediction_active_models + lokale Datei)"""
    try:
        logger.info(f"🗑️ Lösche Modell (active_model_id: {active_model_id})...")

        # Hole Modell-Informationen für lokale Datei (auch inaktive Modelle prüfen)
        from app.database.models import get_active_models
        active_models = await get_active_models(include_inactive=True)
        model_to_delete = next((m for m in active_models if m['id'] == active_model_id), None)

        if not model_to_delete:
            logger.warning(f"⚠️ Modell {active_model_id} nicht gefunden")
            raise HTTPException(status_code=404, detail=f"Modell {active_model_id} nicht gefunden")

        model_id = model_to_delete.get('model_id')
        model_name = model_to_delete.get('name', 'Unknown')
        logger.info(f"🗑️ Lösche Modell: {model_name} (model_id: {model_id}, active_model_id: {active_model_id})")

        # Lösche lokale Datei
        local_path = model_to_delete.get('local_model_path')
        if local_path and os.path.exists(local_path):
            try:
                os.remove(local_path)
                logger.info(f"✅ Lokale Modell-Datei gelöscht: {local_path}")
            except Exception as e:
                logger.warning(f"⚠️ Fehler beim Löschen der lokalen Datei: {e}")
        elif local_path:
            logger.debug(f"ℹ️ Modell-Datei existiert nicht: {local_path}")

        # Lösche aus DB
        success = await delete_active_model(active_model_id)
        if not success:
            logger.error(f"❌ Fehler beim Löschen aus Datenbank: active_model_id {active_model_id}")
            raise HTTPException(status_code=404, detail=f"Modell {active_model_id} konnte nicht aus Datenbank gelöscht werden")

        logger.info(f"✅ Modell {active_model_id} erfolgreich gelöscht (model_id: {model_id})")
        return {
            "message": f"Modell {active_model_id} gelöscht",
            "active_model_id": active_model_id,
            "model_id": model_id,
            "model_name": model_name
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Fehler beim Löschen: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================
# Predictions Endpoints
# ============================================================

@router.post("/predict", response_model=PredictionResponse)
async def predict_endpoint(request: PredictRequest):
    """
    Manuelle Vorhersage für einen Coin.

    Macht Vorhersagen mit allen aktiven Modellen (oder nur bestimmten).
    """
    try:
        # Hole aktive Modelle (exakt wie in der Debug-Route)
        from app.database.models import get_active_models
        active_models = await get_active_models()
        logger.info(f"🔍 Predict: {len(active_models)} aktive Modelle gefunden für coin {request.coin_id}")

        if not active_models:
            logger.warning("⚠️ Predict: Keine aktiven Modelle gefunden")
            # Debug: Verwende direkten Pool-Zugriff
            pool = await get_pool()
            active_models = await get_active_models()
            logger.info(f"🔍 Predict: Nach direktem Pool-Zugriff: {len(active_models)} aktive Modelle gefunden")
            if not active_models:
                raise HTTPException(status_code=400, detail="Keine aktiven Modelle gefunden")
        
        # Filter nach model_ids (wenn angegeben)
        if request.model_ids:
            active_models = [m for m in active_models if m['model_id'] in request.model_ids]
            if not active_models:
                raise HTTPException(status_code=404, detail="Keine der angegebenen Modelle sind aktiv")
        
        # Timestamp (aktuell wenn nicht angegeben)
        timestamp = request.timestamp or datetime.now(timezone.utc)
        
        # Hole Pool für Vorhersagen
        pool = await get_pool()

        # Mache Vorhersagen
        results = await predict_coin_all_models(
            coin_id=request.coin_id,
            timestamp=timestamp,
            active_models=active_models,
            pool=pool
        )
        
        # Konvertiere zu Response-Format
        prediction_results = [
            PredictionResult(
                model_id=r['model_id'],
                active_model_id=r['active_model_id'],
                model_name=r['model_name'],
                prediction=r['prediction'],
                probability=r['probability']
            )
            for r in results
        ]
        
        return PredictionResponse(
            coin_id=request.coin_id,
            timestamp=timestamp,
            predictions=prediction_results,
            total_models=len(prediction_results)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Fehler bei Vorhersage: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/predictions", response_model=PredictionsListResponse)
async def get_predictions_endpoint(
    coin_id: Optional[str] = None,
    model_id: Optional[int] = None,
    active_model_id: Optional[int] = None,
    prediction: Optional[int] = None,  # 0 oder 1
    min_probability: Optional[float] = None,
    max_probability: Optional[float] = None,
    phase_id: Optional[int] = None,
    date_from: Optional[str] = None,  # ISO-Format String
    date_to: Optional[str] = None,  # ISO-Format String
    limit: int = 100,
    offset: int = 0
):
    """Liste aller Vorhersagen (mit Filtern)"""
    try:
        # Konvertiere ISO-Strings zu datetime
        date_from_dt = None
        if date_from:
            try:
                date_from_dt = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
            except Exception as e:
                logger.warning(f"⚠️ Ungültiges date_from Format: {date_from}, Fehler: {e}")
        
        date_to_dt = None
        if date_to:
            try:
                date_to_dt = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
            except Exception as e:
                logger.warning(f"⚠️ Ungültiges date_to Format: {date_to}, Fehler: {e}")
        
        predictions = await get_predictions(
            coin_id=coin_id,
            model_id=model_id,
            active_model_id=active_model_id,
            prediction=prediction,
            min_probability=min_probability,
            max_probability=max_probability,
            phase_id=phase_id,
            date_from=date_from_dt,
            date_to=date_to_dt,
            limit=limit,
            offset=offset
        )
        
        prediction_details = [
            PredictionDetail(
                id=p['id'],
                coin_id=p['coin_id'],
                data_timestamp=p['data_timestamp'],
                model_id=p['model_id'],
                active_model_id=p['active_model_id'],
                prediction=p['prediction'],
                probability=p['probability'],
                phase_id_at_time=p['phase_id_at_time'],
                features=p['features'],
                prediction_duration_ms=p['prediction_duration_ms'],
                created_at=p['created_at']
            )
            for p in predictions
        ]
        
        # TODO: Total count (später implementieren wenn nötig)
        total = len(prediction_details)
        
        return PredictionsListResponse(
            predictions=prediction_details,
            total=total,
            limit=limit,
            offset=offset
        )
    except Exception as e:
        logger.error(f"❌ Fehler beim Laden von Vorhersagen: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/predictions/latest/{coin_id}", response_model=PredictionDetail)
async def get_latest_prediction_endpoint(coin_id: str, model_id: Optional[int] = None):
    """Neueste Vorhersage für einen Coin"""
    try:
        prediction = await get_latest_prediction(coin_id, model_id)
        if not prediction:
            raise HTTPException(status_code=404, detail=f"Keine Vorhersage für Coin {coin_id} gefunden")
        
        return PredictionDetail(
            id=prediction['id'],
            coin_id=prediction['coin_id'],
            data_timestamp=prediction['data_timestamp'],
            model_id=prediction['model_id'],
            active_model_id=prediction['active_model_id'],
            prediction=prediction['prediction'],
            probability=prediction['probability'],
            phase_id_at_time=prediction['phase_id_at_time'],
            features=prediction['features'],
            prediction_duration_ms=prediction['prediction_duration_ms'],
            created_at=prediction['created_at']
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Fehler beim Laden der neuesten Vorhersage: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================
# System Endpoints
# ============================================================

@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health Check (JSON mit Status, aktive Modelle, etc.)"""
    try:
        health = await get_health_status()
        return HealthResponse(**health)
    except Exception as e:
        logger.error(f"❌ Fehler beim Health Check: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/metrics", response_class=PlainTextResponse)
async def metrics_endpoint():
    """Prometheus Metrics (Text-Format)"""
    try:
        metrics_bytes = generate_metrics()
        return Response(
            content=metrics_bytes,
            media_type="text/plain; version=0.0.4; charset=utf-8"
        )
    except Exception as e:
        logger.error(f"❌ Fehler beim Generieren der Metriken: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats", response_model=StatsResponse)
async def stats_endpoint():
    """Statistiken"""
    try:
        from app.database.models import get_predictions
        from datetime import datetime, timedelta, timezone
        
        # Hole alle Vorhersagen (letzte Stunde)
        one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
        predictions_last_hour = await get_predictions(limit=10000)
        predictions_last_hour_count = sum(
            1 for p in predictions_last_hour
            if p['created_at'] >= one_hour_ago
        )
        
        # Aktive Modelle
        active_models = await get_active_models()
        active_models_count = len(active_models)
        
        # Total Predictions (ungefähr)
        all_predictions = await get_predictions(limit=100000)
        total_predictions = len(all_predictions)
        
        # Zeitbasierte Statistiken (24h, 7d)
        one_day_ago = datetime.now(timezone.utc) - timedelta(days=1)
        seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
        
        predictions_last_24h_count = sum(
            1 for p in all_predictions
            if p['created_at'] >= one_day_ago
        )
        
        predictions_last_7d_count = sum(
            1 for p in all_predictions
            if p['created_at'] >= seven_days_ago
        )
        
        # Coins tracked (unique coin_ids)
        unique_coins = len(set(p['coin_id'] for p in all_predictions))
        
        # Durchschnittliche Vorhersage-Dauer
        durations = [p.get('prediction_duration_ms') for p in all_predictions if p.get('prediction_duration_ms') is not None]
        avg_prediction_time_ms = sum(durations) / len(durations) if durations else None
        
        # Webhook-Statistiken
        from app.database.connection import get_pool
        pool = await get_pool()
        webhook_stats = await pool.fetchrow("""
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE response_status >= 200 AND response_status < 300) as success,
                COUNT(*) FILTER (WHERE response_status IS NULL OR response_status < 200 OR response_status >= 300) as failed
            FROM prediction_webhook_log
        """)
        
        webhook_total = webhook_stats['total'] if webhook_stats else 0
        webhook_success = webhook_stats['success'] if webhook_stats else 0
        webhook_failed = webhook_stats['failed'] if webhook_stats else 0
        
        return StatsResponse(
            total_predictions=total_predictions,
            predictions_last_hour=predictions_last_hour_count,
            predictions_last_24h=predictions_last_24h_count,
            predictions_last_7d=predictions_last_7d_count,
            active_models=active_models_count,
            coins_tracked=unique_coins,
            avg_prediction_time_ms=avg_prediction_time_ms,
            webhook_total=webhook_total,
            webhook_success=webhook_success,
            webhook_failed=webhook_failed
        )
    except Exception as e:
        logger.error(f"❌ Fehler beim Laden der Statistiken: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/logs", response_class=PlainTextResponse)
async def logs_endpoint(tail: int = 100):
    """
    Gibt die letzten N Log-Zeilen zurück.
    
    Liest die Logs aus dem Container (stdout/stderr via Supervisor).
    Da Supervisor die Logs an stdout/stderr weiterleitet, lesen wir sie über Docker.
    """
    try:
        import subprocess
        
        # Versuche Docker-Logs zu lesen (funktioniert wenn Docker verfügbar ist)
        try:
            # Prüfe ob wir im Container sind (HOSTNAME ist gesetzt)
            container_name = os.getenv("HOSTNAME", "ml-prediction-service")
            
            # Prüfe ob Docker verfügbar ist
            docker_check = subprocess.run(
                ["which", "docker"],
                capture_output=True,
                text=True,
                timeout=2
            )
            
            if docker_check.returncode == 0:
                result = subprocess.run(
                    ["docker", "logs", "--tail", str(tail), container_name],
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                
                if result.returncode == 0 and result.stdout:
                    return Response(
                        content=result.stdout,
                        media_type="text/plain"
                    )
        except (FileNotFoundError, subprocess.TimeoutExpired) as e:
            # Docker nicht verfügbar - versuche Logs aus Datei zu lesen
            logger.debug(f"Docker nicht verfügbar: {e}")
        
        # Fallback: Versuche Logs aus Log-Dateien zu lesen
        log_paths = [
            ("/app/logs/fastapi.log", "FastAPI"),
            ("/app/logs/streamlit.log", "Streamlit"),
            ("/var/log/supervisor/supervisord.log", "Supervisor"),
        ]
        
        all_logs = []
        for log_path, log_name in log_paths:
            try:
                if os.path.exists(log_path):
                    with open(log_path, 'r', encoding='utf-8', errors='ignore') as f:
                        lines = f.readlines()
                        # Füge Log-Name hinzu
                        for line in lines:
                            all_logs.append((f"[{log_name}]", line))
            except Exception as e:
                logger.debug(f"Konnte Log-Datei {log_path} nicht lesen: {e}")
        
        if all_logs:
            # Neueste Logs zuerst (letzte tail Zeilen)
            recent_logs = all_logs[-tail:]
            # Kombiniere Logs
            combined_logs = [f"{name} {line}" for name, line in recent_logs]
            return Response(
                content="".join(combined_logs),
                media_type="text/plain"
            )
        
        # Letzter Fallback: Info-Message
        return Response(
            content=f"ℹ️ Keine Logs verfügbar.\n\n"
                   f"💡 Tipp: Logs können direkt mit `docker logs ml-prediction-service --tail {tail}` angezeigt werden.\n"
                   f"💡 Oder: Logs werden über stdout/stderr ausgegeben und sind im Docker-Container sichtbar.\n",
            media_type="text/plain"
        )
        
    except Exception as e:
        logger.error(f"❌ Fehler beim Laden der Logs: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================
# Coolify-kompatible Endpoints (ohne /api Prefix)
# ============================================================

coolify_router = APIRouter(tags=["System"])

@coolify_router.get("/health", response_model=HealthResponse)
async def health_check_coolify():
    """Health Check für Coolify (ohne /api Prefix)"""
    return await health_check()

@coolify_router.get("/metrics", response_class=PlainTextResponse)
async def metrics_endpoint_coolify():
    """Metrics für Coolify (ohne /api Prefix)"""
    return await metrics_endpoint()


    """Health Check für Coolify (ohne /api Prefix)"""
    return await health_check()

@coolify_router.get("/metrics", response_class=PlainTextResponse)
async def metrics_endpoint_coolify():
    """Metrics für Coolify (ohne /api Prefix)"""
    return await metrics_endpoint()


# ============================================================
# Alerts Endpoints
# ============================================================

@router.get("/alerts/statistics")
async def get_alert_statistics_endpoint(
    model_id: Optional[int] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None
):
    """Alert-Statistiken"""
    try:
        result = await get_alert_statistics(
            model_id=model_id, date_from=date_from, date_to=date_to
        )
        return result
    except Exception as e:
        logger.error(f"❌ Fehler beim Abrufen der Alert-Statistiken: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/models/alert-statistics")
async def get_models_alert_statistics_endpoint():
    """OPTIMIERT: Alert-Statistiken für alle aktiven Modelle (Batch-Query)"""
    try:
        result = await get_model_alert_statistics()
        return result
    except Exception as e:
        logger.error(f"❌ Fehler beim Abrufen der Modell-Alert-Statistiken: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/alerts")
async def get_alerts_endpoint(
    status: Optional[str] = None,
    model_id: Optional[int] = None,
    active_model_id: Optional[int] = None,  # NEU: Filter nach active_model_id
    coin_id: Optional[str] = None,
    prediction_type: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    unique_coins: bool = True,
    limit: int = 100,
    offset: int = 0
):
    """Liste aller Alerts mit Filtern"""
    try:
        # Wenn active_model_id gegeben, konvertiere zu model_id
        if active_model_id and not model_id:
            pool = await get_db_pool()
            model_row = await pool.fetchrow("""
                SELECT model_id FROM prediction_active_models WHERE id = $1
            """, active_model_id)
            if model_row:
                model_id = model_row['model_id']
        
        result = await get_alerts(
            status=status, model_id=model_id, coin_id=coin_id,
            prediction_type=prediction_type, date_from=date_from, date_to=date_to,
            unique_coins=unique_coins, limit=limit, offset=offset
        )
        return result
    except Exception as e:
        logger.error(f"❌ Fehler beim Abrufen der Alerts: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/alerts/{alert_id}")
async def get_alert_details_endpoint(
    alert_id: int,
    chart_before_minutes: int = 10,
    chart_after_minutes: int = 10
):
    """Detaillierte Informationen zu einem Alert"""
    try:
        result = await get_alert_details(
            alert_id=alert_id,
            chart_before_minutes=chart_before_minutes,
            chart_after_minutes=chart_after_minutes
        )
        if not result:
            raise HTTPException(status_code=404, detail=f"Alert {alert_id} nicht gefunden")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Fehler beim Abrufen der Alert-Details: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/models/{active_model_id}/statistics")
async def reset_model_statistics_endpoint(active_model_id: int):
    """Setzt Statistiken für ein Modell zurück (löscht alle Vorhersagen)"""
    try:
        pool = await get_db_pool()
        
        # Prüfe ob Modell existiert
        model_row = await pool.fetchrow("""
            SELECT id FROM prediction_active_models WHERE id = $1
        """, active_model_id)
        
        if not model_row:
            raise HTTPException(status_code=404, detail=f"Modell {active_model_id} nicht gefunden")
        
        # Lösche alle Vorhersagen für dieses Modell
        deleted_count = await pool.execute("""
            DELETE FROM predictions WHERE active_model_id = $1
        """, active_model_id)
        
        # Setze total_predictions auf 0
        await pool.execute("""
            UPDATE prediction_active_models
            SET total_predictions = 0,
                last_prediction_at = NULL,
                updated_at = NOW()
            WHERE id = $1
        """, active_model_id)
        
        logger.info(f"✅ Statistiken für Modell {active_model_id} zurückgesetzt ({deleted_count} Vorhersagen gelöscht)")
        
        return {
            "success": True,
            "active_model_id": active_model_id,
            "deleted_predictions": deleted_count
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Fehler beim Zurücksetzen der Statistiken: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/models/{active_model_id}/alerts")
async def delete_model_alerts_endpoint(active_model_id: int):
    """Löscht alle Alerts für ein Modell"""
    try:
        pool = await get_db_pool()
        
        # Prüfe ob Modell existiert
        model_row = await pool.fetchrow("""
            SELECT id, model_id FROM prediction_active_models WHERE id = $1
        """, active_model_id)
        
        if not model_row:
            raise HTTPException(status_code=404, detail=f"Modell {active_model_id} nicht gefunden")
        
        model_id = model_row['model_id']
        
        # Lösche alle Alerts für dieses Modell (über prediction_id)
        deleted_count = await pool.execute("""
            DELETE FROM alert_evaluations
            WHERE prediction_id IN (
                SELECT id FROM predictions WHERE active_model_id = $1
            )
        """, active_model_id)
        
        logger.info(f"✅ Alerts für Modell {active_model_id} gelöscht ({deleted_count} Alerts gelöscht)")
        
        return {
            "success": True,
            "active_model_id": active_model_id,
            "deleted_alerts": deleted_count
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Fehler beim Löschen der Alerts: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# SYSTEM ROUTES
# ============================================================================

@router.post("/system/restart", status_code=status.HTTP_200_OK)
async def restart_service():
    """
    Service-Neustart initiieren.

    Diese Route zeigt nur eine Anleitung für den manuellen Neustart.
    Ein automatischer Neustart ist aus technischen Gründen nicht möglich.
    """
    try:
        logger.info("🔄 Service-Neustart angefordert")

        return {
            "message": "Führen Sie './restart_service.sh' aus oder starten Sie den Service manuell neu.",
            "script_available": True,
            "manual_command": "pkill -f uvicorn && python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"❌ Fehler beim Service-Neustart: {e}")
        raise HTTPException(status_code=500, detail=str(e))
