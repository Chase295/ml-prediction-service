-- Migration: Coin-Scan-Cache Tabelle erstellen
-- Datum: 2025-12-29
-- Zweck: Cache für zuletzt gescannte Coins und deren Ignore-Status

-- Neue Tabelle für Coin-Scan-Cache
CREATE TABLE IF NOT EXISTS coin_scan_cache (
    id BIGSERIAL PRIMARY KEY,

    -- Coin und Modell Referenz
    coin_id VARCHAR(255) NOT NULL,
    active_model_id BIGINT NOT NULL REFERENCES prediction_active_models(id) ON DELETE CASCADE,

    -- Letzte Scan-Ergebnisse
    last_scan_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_prediction INTEGER NOT NULL CHECK (last_prediction IN (0, 1)),
    last_probability NUMERIC(5, 4) NOT NULL CHECK (last_probability >= 0.0 AND last_probability <= 1.0),
    was_alert BOOLEAN NOT NULL DEFAULT FALSE,

    -- Ignore-Management
    ignore_until TIMESTAMP WITH TIME ZONE,
    ignore_reason VARCHAR(20) CHECK (ignore_reason IN ('bad', 'positive', 'alert')),

    -- Meta-Daten
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Eindeutigkeit sicherstellen: Ein Coin kann nur einmal pro Modell gecached werden
    UNIQUE(coin_id, active_model_id)
);

-- Kommentare für bessere Dokumentation
COMMENT ON TABLE coin_scan_cache IS 'Cache für zuletzt gescannte Coins und deren Ignore-Status (für automatische Coin-Metric-Verarbeitung)';
COMMENT ON COLUMN coin_scan_cache.coin_id IS 'Coin-Mint-Adresse';
COMMENT ON COLUMN coin_scan_cache.active_model_id IS 'Referenz zum aktiven Modell';
COMMENT ON COLUMN coin_scan_cache.last_scan_at IS 'Zeitpunkt der letzten Verarbeitung';
COMMENT ON COLUMN coin_scan_cache.last_prediction IS 'Letzte Vorhersage (0=schlecht, 1=gut)';
COMMENT ON COLUMN coin_scan_cache.last_probability IS 'Wahrscheinlichkeit der letzten Vorhersage';
COMMENT ON COLUMN coin_scan_cache.was_alert IS 'Ob die letzte Vorhersage ein Alert ausgelöst hat';
COMMENT ON COLUMN coin_scan_cache.ignore_until IS 'Bis wann der Coin ignoriert werden soll (NULL = nicht ignorieren)';
COMMENT ON COLUMN coin_scan_cache.ignore_reason IS 'Grund für das Ignorieren (bad/positive/alert)';

-- Indizes für optimale Performance
CREATE INDEX IF NOT EXISTS idx_coin_scan_cache_coin_model ON coin_scan_cache(coin_id, active_model_id);
CREATE INDEX IF NOT EXISTS idx_coin_scan_cache_ignore_until ON coin_scan_cache(ignore_until) WHERE ignore_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_coin_scan_cache_last_scan ON coin_scan_cache(last_scan_at DESC);
CREATE INDEX IF NOT EXISTS idx_coin_scan_cache_alerts ON coin_scan_cache(was_alert) WHERE was_alert = true;

-- Partitionsstrategie für große Datenmengen (optional, für später)
-- Die Tabelle könnte partitioniert werden nach active_model_id für bessere Performance

