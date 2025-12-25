-- ============================================================
-- ML Prediction Service - Datenbank-Schema
-- Version: 1.0
-- SEPARATE Tabellen-Struktur (keine Änderungen an ml_models!)
-- ============================================================

-- 1. Erstelle prediction_active_models Tabelle
-- Speichert welche Modelle im Prediction Service aktiv sind
CREATE TABLE IF NOT EXISTS prediction_active_models (
    id BIGSERIAL PRIMARY KEY,
    model_id BIGINT NOT NULL,  -- Referenz zu ml_models.id (kein FK, da separater Server)
    model_name VARCHAR(255) NOT NULL,
    model_type VARCHAR(50) NOT NULL,
    
    -- Modell-Metadaten (Kopie aus ml_models für schnellen Zugriff)
    target_variable VARCHAR(100) NOT NULL,
    target_operator VARCHAR(10),
    target_value NUMERIC(20, 2),
    future_minutes INTEGER,
    price_change_percent NUMERIC(10, 4),
    target_direction VARCHAR(10),
    
    -- Features und Konfiguration (JSONB)
    features JSONB NOT NULL,
    phases JSONB,
    params JSONB,
    
    -- Modell-Datei (lokal gespeichert)
    local_model_path TEXT NOT NULL,  -- Pfad zur lokalen .pkl Datei
    model_file_url TEXT,  -- URL zum Download (optional, falls nötig)
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    last_prediction_at TIMESTAMP WITH TIME ZONE,
    total_predictions BIGINT DEFAULT 0,
    
    -- Metadaten
    downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    activated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_model_type CHECK (model_type IN ('random_forest', 'xgboost')),
    CONSTRAINT chk_operator CHECK (target_operator IS NULL OR target_operator IN ('>', '<', '>=', '<=', '=')),
    CONSTRAINT chk_direction CHECK (target_direction IS NULL OR target_direction IN ('up', 'down')),
    
    -- Custom Name (für lokale Umbenennung)
    custom_name VARCHAR(255),  -- Optional: Lokaler Name (falls umbenannt)
    
    -- Unique: Ein Modell kann nur einmal aktiv sein
    UNIQUE(model_id)
);

-- Indizes
CREATE INDEX IF NOT EXISTS idx_active_models_active 
ON prediction_active_models(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_active_models_model_id 
ON prediction_active_models(model_id);

CREATE INDEX IF NOT EXISTS idx_active_models_custom_name 
ON prediction_active_models(custom_name) WHERE custom_name IS NOT NULL;

-- 2. Erstelle predictions Tabelle
CREATE TABLE IF NOT EXISTS predictions (
    id BIGSERIAL PRIMARY KEY,
    coin_id VARCHAR(255) NOT NULL,
    data_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,  -- Zeitstempel der Daten
    model_id BIGINT NOT NULL,  -- Referenz zu ml_models.id (kein FK)
    active_model_id BIGINT REFERENCES prediction_active_models(id) ON DELETE SET NULL,
    
    -- Vorhersage
    prediction INTEGER NOT NULL CHECK (prediction IN (0, 1)),
    probability NUMERIC(5, 4) NOT NULL CHECK (probability >= 0.0 AND probability <= 1.0),
    
    -- Phase zum Zeitpunkt der Vorhersage
    phase_id_at_time INTEGER,
    
    -- Features (optional, für Debugging)
    features JSONB,
    
    -- Performance
    prediction_duration_ms INTEGER,
    
    -- Metadaten
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indizes für Performance
CREATE INDEX IF NOT EXISTS idx_predictions_coin_timestamp 
ON predictions(coin_id, data_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_predictions_model 
ON predictions(model_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_predictions_active_model 
ON predictions(active_model_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_predictions_created 
ON predictions(created_at DESC);

-- 3. Erstelle LISTEN/NOTIFY Trigger für coin_metrics
-- Trigger-Funktion
CREATE OR REPLACE FUNCTION notify_coin_metrics_insert()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify(
        'coin_metrics_insert',
        json_build_object(
            'mint', NEW.mint,
            'timestamp', NEW.timestamp,
            'phase_id', NEW.phase_id_at_time
        )::text
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger erstellen (nur wenn noch nicht existiert)
DROP TRIGGER IF EXISTS coin_metrics_insert_trigger ON coin_metrics;
CREATE TRIGGER coin_metrics_insert_trigger
    AFTER INSERT ON coin_metrics
    FOR EACH ROW
    EXECUTE FUNCTION notify_coin_metrics_insert();

-- 4. Erstelle prediction_webhook_log Tabelle (optional, für Debugging)
CREATE TABLE IF NOT EXISTS prediction_webhook_log (
    id BIGSERIAL PRIMARY KEY,
    coin_id VARCHAR(255) NOT NULL,
    data_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    webhook_url TEXT NOT NULL,
    payload JSONB NOT NULL,
    response_status INTEGER,
    response_body TEXT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_log_created 
ON prediction_webhook_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_log_status 
ON prediction_webhook_log(response_status) WHERE response_status IS NOT NULL;

