-- Migration: Alert-Threshold pro Modell
-- Fügt alert_threshold Spalte zu prediction_active_models hinzu

ALTER TABLE prediction_active_models 
ADD COLUMN IF NOT EXISTS alert_threshold NUMERIC(5, 4) DEFAULT 0.7;

-- Kommentar hinzufügen
COMMENT ON COLUMN prediction_active_models.alert_threshold IS 'Alert-Threshold für dieses Modell (0.0-1.0, Standard: 0.7 = 70%)';

