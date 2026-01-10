-- Migration: Coin-Ignore-Einstellungen zu prediction_active_models hinzufügen
-- Datum: 2025-12-29
-- Zweck: Ermöglicht das Ignorieren von Coins nach bestimmten Vorhersage-Ergebnissen

-- Neue Felder für Ignore-Timings hinzufügen
ALTER TABLE prediction_active_models
ADD COLUMN IF NOT EXISTS ignore_bad_seconds INTEGER DEFAULT 0 CHECK (ignore_bad_seconds >= 0 AND ignore_bad_seconds <= 86400),
ADD COLUMN IF NOT EXISTS ignore_positive_seconds INTEGER DEFAULT 0 CHECK (ignore_positive_seconds >= 0 AND ignore_positive_seconds <= 86400),
ADD COLUMN IF NOT EXISTS ignore_alert_seconds INTEGER DEFAULT 0 CHECK (ignore_alert_seconds >= 0 AND ignore_alert_seconds <= 86400);

-- Kommentare hinzufügen
COMMENT ON COLUMN prediction_active_models.ignore_bad_seconds IS 'Sekunden, die Coins mit schlechten Vorhersagen (prediction=0) ignoriert werden (0 = nie ignorieren, max 86400 = 24h)';
COMMENT ON COLUMN prediction_active_models.ignore_positive_seconds IS 'Sekunden, die Coins mit positiven Vorhersagen (prediction=1) ignoriert werden';
COMMENT ON COLUMN prediction_active_models.ignore_alert_seconds IS 'Sekunden, die Coins mit Alert-Vorhersagen (probability >= threshold) ignoriert werden';

-- Indizes für Performance (falls viele Modelle)
CREATE INDEX IF NOT EXISTS idx_active_models_ignore_timings ON prediction_active_models(ignore_bad_seconds, ignore_positive_seconds, ignore_alert_seconds);

