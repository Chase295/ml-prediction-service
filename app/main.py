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
        
        # Migration: alert_evaluations Tabelle erstellen (falls nicht vorhanden)
        try:
            # Prüfe ob Tabelle existiert
            table_exists = await pool.fetchval("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'alert_evaluations'
                )
            """)
            
            if not table_exists:
                # Erstelle Tabelle
                await pool.execute("""
                    CREATE TABLE alert_evaluations (
                        id BIGSERIAL PRIMARY KEY,
                        prediction_id BIGINT NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
                        coin_id VARCHAR(255) NOT NULL,
                        model_id BIGINT NOT NULL,
                        prediction_type VARCHAR(20) NOT NULL CHECK (prediction_type IN ('time_based', 'classic')),
                        probability NUMERIC(5, 4) NOT NULL CHECK (probability >= 0.0 AND probability <= 1.0),
                        target_variable VARCHAR(100),
                        future_minutes INTEGER,
                        price_change_percent NUMERIC(10, 4),
                        target_direction VARCHAR(10) CHECK (target_direction IN ('up', 'down')),
                        target_operator VARCHAR(10) CHECK (target_operator IN ('>', '<', '>=', '<=', '=')),
                        target_value NUMERIC(20, 2),
                        alert_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
                        price_close_at_alert NUMERIC(20, 8) NOT NULL,
                        price_open_at_alert NUMERIC(20, 8),
                        price_high_at_alert NUMERIC(20, 8),
                        price_low_at_alert NUMERIC(20, 8),
                        market_cap_close_at_alert NUMERIC(20, 2),
                        market_cap_open_at_alert NUMERIC(20, 2),
                        volume_sol_at_alert NUMERIC(20, 2),
                        volume_usd_at_alert NUMERIC(20, 2),
                        buy_volume_sol_at_alert NUMERIC(20, 2),
                        sell_volume_sol_at_alert NUMERIC(20, 2),
                        num_buys_at_alert INTEGER,
                        num_sells_at_alert INTEGER,
                        unique_wallets_at_alert INTEGER,
                        phase_id_at_alert INTEGER,
                        evaluation_timestamp TIMESTAMP WITH TIME ZONE,
                        price_close_at_evaluation NUMERIC(20, 8),
                        price_open_at_evaluation NUMERIC(20, 8),
                        price_high_at_evaluation NUMERIC(20, 8),
                        price_low_at_evaluation NUMERIC(20, 8),
                        market_cap_close_at_evaluation NUMERIC(20, 2),
                        market_cap_open_at_evaluation NUMERIC(20, 2),
                        volume_sol_at_evaluation NUMERIC(20, 2),
                        volume_usd_at_evaluation NUMERIC(20, 2),
                        buy_volume_sol_at_evaluation NUMERIC(20, 2),
                        sell_volume_sol_at_evaluation NUMERIC(20, 2),
                        num_buys_at_evaluation INTEGER,
                        num_sells_at_evaluation INTEGER,
                        unique_wallets_at_evaluation INTEGER,
                        phase_id_at_evaluation INTEGER,
                        actual_price_change_pct NUMERIC(10, 4),
                        actual_value_at_evaluation NUMERIC(20, 2),
                        status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'expired', 'not_applicable')),
                        evaluated_at TIMESTAMP WITH TIME ZONE,
                        evaluation_note TEXT,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    )
                """)
                
                # Erstelle Indizes
                await pool.execute("""
                    CREATE INDEX idx_alert_evaluations_coin_timestamp 
                    ON alert_evaluations(coin_id, alert_timestamp ASC);
                    
                    CREATE INDEX idx_alert_evaluations_status 
                    ON alert_evaluations(status) WHERE status = 'pending';
                    
                    CREATE INDEX idx_alert_evaluations_prediction 
                    ON alert_evaluations(prediction_id);
                    
                    CREATE INDEX idx_alert_evaluations_type 
                    ON alert_evaluations(prediction_type);
                    
                    CREATE INDEX idx_alert_evaluations_evaluation_timestamp 
                    ON alert_evaluations(evaluation_timestamp) WHERE status = 'pending';
                """)
                
                logger.info("✅ Migration: alert_evaluations Tabelle erstellt")
            else:
                logger.info("✅ Migration: alert_evaluations Tabelle bereits vorhanden")
                
                # Migration: probability Spalte hinzufügen (falls nicht vorhanden)
                try:
                    await pool.execute("""
                        ALTER TABLE alert_evaluations 
                        ADD COLUMN IF NOT EXISTS probability NUMERIC(5, 4) CHECK (probability >= 0.0 AND probability <= 1.0)
                    """)
                    logger.info("✅ Migration: probability Spalte in alert_evaluations überprüft")
                except Exception as e:
                    logger.warning(f"⚠️ Migration-Fehler bei probability Spalte: {e}")
        except Exception as e:
            logger.warning(f"⚠️ Migration-Fehler bei alert_evaluations: {e}")
        
        # Health Status initialisieren
        init_health_status()
        logger.info("✅ Health Status initialisiert")
        
        # Prüfe fehlende Modell-Dateien
        try:
            from app.database.models import get_active_models
            from app.prediction.model_manager import download_model_file
            import os
            
            active_models = await get_active_models()
            missing_models = []
            
            for model in active_models:
                local_path = model.get('local_model_path')
                if local_path and not os.path.exists(local_path):
                    missing_models.append({
                        'active_model_id': model['id'],
                        'model_id': model['model_id'],
                        'name': model.get('name', 'Unknown'),
                        'path': local_path
                    })
            
            if missing_models:
                logger.warning(f"⚠️ {len(missing_models)} Modell-Dateien fehlen!")
                for m in missing_models:
                    logger.warning(f"  - Modell {m['model_id']} ({m['name']}): {m['path']}")
                logger.warning("💡 Tipp: Importiere die Modelle über die UI oder API (siehe MODELL_IMPORT_ANLEITUNG.md)")
            else:
                logger.info(f"✅ Alle {len(active_models)} aktiven Modell-Dateien vorhanden")
        except Exception as e:
            logger.warning(f"⚠️ Fehler beim Prüfen der Modell-Dateien: {e}")
        
        # Starte Event-Handler (LISTEN/NOTIFY oder Polling)
        from app.prediction.event_handler import EventHandler
        event_handler = EventHandler()
        asyncio.create_task(event_handler.start())
        logger.info("✅ Event-Handler gestartet")
        
        # Speichere Event-Handler in app.state für späteren Zugriff
        app.state.event_handler = event_handler
        
        # Starte Alert-Auswertungs-Job (Hintergrund-Task)
        from app.database.alert_models import evaluate_pending_alerts
        
        async def alert_evaluation_loop():
            """Hintergrund-Job: Wertet alle ausstehenden Alerts aus"""
            while True:
                try:
                    await asyncio.sleep(60)  # Alle 60 Sekunden
                    stats = await evaluate_pending_alerts(batch_size=100)
                    if stats['evaluated'] > 0:
                        logger.info(f"📊 Alert-Auswertung: {stats['evaluated']} Alerts ausgewertet ({stats['success']} erfolgreich, {stats['failed']} fehlgeschlagen, {stats['expired']} abgelaufen)")
                except Exception as e:
                    logger.error(f"❌ Fehler im Alert-Auswertungs-Job: {e}", exc_info=True)
                    await asyncio.sleep(60)  # Warte auch bei Fehler
        
        asyncio.create_task(alert_evaluation_loop())
        logger.info("✅ Alert-Auswertungs-Job gestartet")
        
        logger.info("✅ Service gestartet: DB verbunden, Event-Handler läuft, Alert-Auswertung aktiv")
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

