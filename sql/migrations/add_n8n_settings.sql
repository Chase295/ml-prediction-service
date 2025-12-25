-- Migration: n8n Einstellungen pro Modell
-- Fügt n8n_webhook_url und n8n_send_mode zu prediction_active_models hinzu

ALTER TABLE prediction_active_models 
ADD COLUMN IF NOT EXISTS n8n_webhook_url TEXT,
ADD COLUMN IF NOT EXISTS n8n_send_mode VARCHAR(20) DEFAULT 'all' CHECK (n8n_send_mode IN ('all', 'alerts_only'));

-- Kommentare hinzufügen
COMMENT ON COLUMN prediction_active_models.n8n_webhook_url IS 'n8n Webhook URL für dieses Modell (optional, überschreibt globale N8N_WEBHOOK_URL)';
COMMENT ON COLUMN prediction_active_models.n8n_send_mode IS 'Send-Mode: "all" = alle Vorhersagen, "alerts_only" = nur Alerts';

