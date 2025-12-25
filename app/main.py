"""
FastAPI Main App für ML Prediction Service
"""
import asyncio
import time
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from app.api.routes import router, coolify_router
from app.database.connection import get_pool, close_pool
from app.utils.metrics import init_health_status
from app.utils.config import API_PORT
from app.utils.logging_config import setup_logging, get_logger, set_request_id

# Strukturiertes Logging konfigurieren
setup_logging()
logger = get_logger(__name__)

# FastAPI App erstellen
app = FastAPI(
    title="ML Prediction Service",
    description="Machine Learning Prediction Service für Coin-Bot",
    version="1.0.0"
)

# Request-ID Middleware (muss vor CORS sein)
class RequestIDMiddleware(BaseHTTPMiddleware):
    """Middleware für Request-ID Tracking"""
    
    async def dispatch(self, request: Request, call_next):
        # Generiere oder hole Request-ID aus Header
        request_id = request.headers.get("X-Request-ID")
        if not request_id:
            request_id = set_request_id()
        else:
            set_request_id(request_id)
        
        # Response mit Request-ID Header
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        
        return response

app.add_middleware(RequestIDMiddleware)

# CORS (falls nötig)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In Produktion: spezifische Origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Router einbinden
app.include_router(router)
app.include_router(coolify_router)

@app.on_event("startup")
async def startup():
    """Startup Event: Initialisiert DB-Pool, Health Status, Event-Handler"""
    logger.info("🚀 Starte ML Prediction Service...")
    
    try:
        # DB-Pool erstellen
        pool = await get_pool()  # Initialisiert Pool
        logger.info("✅ Datenbank-Pool erstellt")
        
        # Migration: Alert-Threshold Spalte hinzufügen (falls nicht vorhanden)
        try:
            await pool.execute("""
                ALTER TABLE prediction_active_models 
                ADD COLUMN IF NOT EXISTS alert_threshold NUMERIC(5, 4) DEFAULT 0.7
            """)
            logger.info("✅ Migration: alert_threshold Spalte überprüft")
        except Exception as e:
            logger.warning(f"⚠️ Migration-Fehler (kann ignoriert werden wenn Spalte bereits existiert): {e}")
        
        # Migration: n8n Einstellungen Spalten hinzufügen (falls nicht vorhanden)
        try:
            await pool.execute("""
                ALTER TABLE prediction_active_models 
                ADD COLUMN IF NOT EXISTS n8n_webhook_url TEXT,
                ADD COLUMN IF NOT EXISTS n8n_send_mode VARCHAR(20) DEFAULT 'all',
                ADD COLUMN IF NOT EXISTS n8n_enabled BOOLEAN DEFAULT true
            """)
            # Add check constraint for n8n_send_mode if it doesn't exist
            await pool.execute("""
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_n8n_send_mode') THEN
                        ALTER TABLE prediction_active_models
                        ADD CONSTRAINT chk_n8n_send_mode CHECK (n8n_send_mode IN ('all', 'alerts_only'));
                    END IF;
                END
                $$;
            """)
            logger.info("✅ Migration: n8n Einstellungen Spalten überprüft (n8n_webhook_url, n8n_send_mode, n8n_enabled)")
        except Exception as e:
            logger.warning(f"⚠️ Migration-Fehler (kann ignoriert werden wenn Spalten bereits existieren): {e}")
        
        # Health Status initialisieren
        init_health_status()
        logger.info("✅ Health Status initialisiert")
        
        # Starte Event-Handler (LISTEN/NOTIFY oder Polling)
        from app.prediction.event_handler import EventHandler
        event_handler = EventHandler()
        asyncio.create_task(event_handler.start())
        logger.info("✅ Event-Handler gestartet")
        
        # Speichere Event-Handler in app.state für späteren Zugriff
        app.state.event_handler = event_handler
        
        logger.info("✅ Service gestartet: DB verbunden, Event-Handler läuft")
    except Exception as e:
        logger.error(f"❌ Fehler beim Startup: {e}", exc_info=True)
        raise

@app.on_event("shutdown")
async def shutdown():
    """Shutdown Event: Schließt DB-Pool und Event-Handler graceful"""
    logger.info("👋 Beende ML Prediction Service...")
    
    try:
        # Stoppe Event-Handler
        if hasattr(app.state, 'event_handler'):
            await app.state.event_handler.stop()
            logger.info("✅ Event-Handler gestoppt")
        
        # DB-Pool schließen
        await close_pool()
        logger.info("✅ Datenbank-Pool geschlossen")
        
        logger.info("✅ Service beendet")
    except Exception as e:
        logger.error(f"❌ Fehler beim Shutdown: {e}", exc_info=True)

@app.get("/")
async def root():
    """Root Endpoint"""
    return {
        "service": "ML Prediction Service",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=API_PORT,
        log_config=None  # Nutze unser strukturiertes Logging
    )

