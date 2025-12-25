"""
Prometheus Metrics und Health Status für ML Prediction Service
"""
import time
from typing import Dict, Any
from prometheus_client import Counter, Gauge, Histogram, generate_latest
from app.database.connection import get_pool, test_connection
from app.database.models import get_active_models, get_predictions
from app.utils.logging_config import get_logger

logger = get_logger(__name__)

# ============================================================
# Prometheus Metrics
# ============================================================

# Prediction Metrics
ml_predictions_total = Counter(
    'ml_predictions_total',
    'Total number of predictions',
    ['model_id', 'model_name']
)

ml_predictions_by_model_total = Counter(
    'ml_predictions_by_model_total',
    'Total number of predictions by model',
    ['model_id', 'model_name']
)

ml_alerts_triggered_total = Counter(
    'ml_alerts_triggered_total',
    'Total number of alerts triggered',
    ['model_id']
)

ml_errors_total = Counter(
    'ml_errors_total',
    'Total number of errors',
    ['type']  # model_load, prediction, db, webhook
)

# Model Metrics
ml_active_models = Gauge(
    'ml_active_models',
    'Number of currently active models'
)

ml_models_loaded = Gauge(
    'ml_models_loaded',
    'Number of loaded models in cache'
)

ml_coins_tracked = Gauge(
    'ml_coins_tracked',
    'Number of coins being tracked'
)

# Performance Metrics
ml_prediction_duration_seconds = Histogram(
    'ml_prediction_duration_seconds',
    'Duration of a prediction in seconds',
    ['model_id'],
    buckets=[0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0, 5.0]
)

ml_feature_processing_duration_seconds = Histogram(
    'ml_feature_processing_duration_seconds',
    'Duration of feature processing in seconds',
    buckets=[0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0]
)

ml_model_load_duration_seconds = Histogram(
    'ml_model_load_duration_seconds',
    'Duration of model loading in seconds',
    ['model_id'],
    buckets=[0.01, 0.05, 0.1, 0.5, 1.0, 5.0]
)

# Service Metrics
ml_service_uptime_seconds = Gauge(
    'ml_service_uptime_seconds',
    'Service uptime in seconds'
)

ml_db_connected = Gauge(
    'ml_db_connected',
    'Database connection status (1=connected, 0=disconnected)'
)

# ============================================================
# Health Status
# ============================================================

health_status: Dict[str, Any] = {
    "db_connected": False,
    "active_models": 0,
    "predictions_last_hour": 0,
    "last_error": None,
    "start_time": None
}

def init_health_status():
    """Initialisiert Health Status beim Service-Start"""
    health_status["start_time"] = time.time()
    health_status["db_connected"] = False
    health_status["active_models"] = 0
    health_status["predictions_last_hour"] = 0
    health_status["last_error"] = None

async def get_health_status() -> Dict[str, Any]:
    """
    Prüft Health Status und gibt Status-Dict zurück
    
    Returns:
        {"status": "healthy"/"degraded", "db_connected": bool, ...}
    """
    try:
        # Prüfe DB-Verbindung
        db_connected = await test_connection()
        health_status["db_connected"] = db_connected
        ml_db_connected.set(1 if db_connected else 0)
        
        # Zähle aktive Modelle
        try:
            active_models_list = await get_active_models()
            active_models_count = len(active_models_list)
            health_status["active_models"] = active_models_count
            ml_active_models.set(active_models_count)
        except Exception as e:
            logger.warning(f"⚠️ Fehler beim Zählen aktiver Modelle: {e}")
            active_models_count = health_status.get("active_models", 0)
        
        # Zähle Vorhersagen letzte Stunde
        try:
            from datetime import datetime, timedelta, timezone
            one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
            predictions = await get_predictions(limit=10000)  # Max 10000 für Performance
            predictions_last_hour = sum(
                1 for p in predictions 
                if p['created_at'] >= one_hour_ago
            )
            health_status["predictions_last_hour"] = predictions_last_hour
        except Exception as e:
            logger.warning(f"⚠️ Fehler beim Zählen von Vorhersagen: {e}")
            predictions_last_hour = health_status.get("predictions_last_hour", 0)
        
        # Berechne Uptime
        if health_status["start_time"]:
            uptime = time.time() - health_status["start_time"]
            ml_service_uptime_seconds.set(uptime)
        else:
            uptime = 0
        
        # Bestimme Gesamt-Status
        if db_connected and active_models_count > 0:
            status = "healthy"
        elif db_connected:
            status = "degraded"  # DB OK, aber keine aktiven Modelle
        else:
            status = "degraded"  # DB nicht verbunden
        
        return {
            "status": status,
            "db_connected": db_connected,
            "active_models": active_models_count,
            "predictions_last_hour": predictions_last_hour,
            "uptime_seconds": int(uptime),
            "start_time": health_status["start_time"],
            "last_error": health_status["last_error"]
        }
    except Exception as e:
        logger.error(f"❌ Fehler beim Health Check: {e}", exc_info=True)
        health_status["last_error"] = str(e)
        health_status["db_connected"] = False
        ml_db_connected.set(0)
        return {
            "status": "degraded",
            "db_connected": False,
            "active_models": health_status.get("active_models", 0),
            "predictions_last_hour": health_status.get("predictions_last_hour", 0),
            "uptime_seconds": int(time.time() - health_status["start_time"]) if health_status["start_time"] else 0,
            "start_time": health_status["start_time"],
            "last_error": str(e)
        }

def generate_metrics() -> bytes:
    """
    Generiert Prometheus Metrics als Bytes
    
    Returns:
        Metrics im Prometheus-Format (bytes)
    """
    return generate_latest()

# ============================================================
# Helper Functions für Metrics
# ============================================================

def increment_predictions(model_id: int, model_name: str):
    """Inkrementiert Prediction-Counter"""
    ml_predictions_total.labels(model_id=str(model_id), model_name=model_name).inc()
    ml_predictions_by_model_total.labels(model_id=str(model_id), model_name=model_name).inc()

def increment_alerts(model_id: int):
    """Inkrementiert Alert-Counter"""
    ml_alerts_triggered_total.labels(model_id=str(model_id)).inc()

def increment_errors(error_type: str):
    """Inkrementiert Error-Counter"""
    ml_errors_total.labels(type=error_type).inc()

def update_models_loaded(count: int):
    """Aktualisiert Anzahl geladener Modelle"""
    ml_models_loaded.set(count)

def update_coins_tracked(count: int):
    """Aktualisiert Anzahl getrackter Coins"""
    ml_coins_tracked.set(count)

