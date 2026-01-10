-- Migration: Erweiterte Alert-Konfiguration zu prediction_active_models hinzufügen
-- Datum: 2025-12-29

-- Erweiterte N8N Send-Modes
ALTER TABLE prediction_active_models
ADD COLUMN IF NOT EXISTS coin_filter_mode VARCHAR(20) DEFAULT 'all' CHECK (coin_filter_mode IN ('all', 'whitelist')),
ADD COLUMN IF NOT EXISTS coin_whitelist JSONB;

-- Erweitere n8n_send_mode um neue Optionen
ALTER TABLE prediction_active_models
DROP CONSTRAINT IF EXISTS chk_n8n_send_mode;

ALTER TABLE prediction_active_models
ADD CONSTRAINT chk_n8n_send_mode CHECK (n8n_send_mode IN ('all', 'alerts_only', 'positive_only', 'negative_only'));

-- Kommentare hinzufügen
COMMENT ON COLUMN prediction_active_models.coin_filter_mode IS 'Coin-Filter Modus: all (alle Coins) oder whitelist (nur ausgewählte Coins)';
COMMENT ON COLUMN prediction_active_models.coin_whitelist IS 'Liste der erlaubten Coin-Mint-Adressen bei whitelist-Modus';

-- Indizes für Performance
CREATE INDEX IF NOT EXISTS idx_active_models_coin_filter ON prediction_active_models(coin_filter_mode);

