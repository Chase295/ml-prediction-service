-- Migration: Performance-Metriken zu prediction_active_models hinzufügen
-- Datum: 2025-12-29

-- Performance-Metriken hinzufügen
ALTER TABLE prediction_active_models
ADD COLUMN IF NOT EXISTS training_accuracy NUMERIC(5, 4),
ADD COLUMN IF NOT EXISTS training_f1 NUMERIC(5, 4),
ADD COLUMN IF NOT EXISTS training_precision NUMERIC(5, 4),
ADD COLUMN IF NOT EXISTS training_recall NUMERIC(5, 4),
ADD COLUMN IF NOT EXISTS roc_auc NUMERIC(5, 4),
ADD COLUMN IF NOT EXISTS mcc NUMERIC(5, 4),
ADD COLUMN IF NOT EXISTS confusion_matrix JSONB,
ADD COLUMN IF NOT EXISTS simulated_profit_pct NUMERIC(8, 4);

-- Kommentare hinzufügen
COMMENT ON COLUMN prediction_active_models.training_accuracy IS 'Training Accuracy (0.0000-1.0000)';
COMMENT ON COLUMN prediction_active_models.training_f1 IS 'Training F1-Score (0.0000-1.0000)';
COMMENT ON COLUMN prediction_active_models.training_precision IS 'Training Precision (0.0000-1.0000)';
COMMENT ON COLUMN prediction_active_models.training_recall IS 'Training Recall (0.0000-1.0000)';
COMMENT ON COLUMN prediction_active_models.roc_auc IS 'ROC AUC Score (0.0000-1.0000)';
COMMENT ON COLUMN prediction_active_models.mcc IS 'Matthews Correlation Coefficient (-1.0000-1.0000)';
COMMENT ON COLUMN prediction_active_models.confusion_matrix IS 'Confusion Matrix als JSON: {"tp": int, "tn": int, "fp": int, "fn": int}';
COMMENT ON COLUMN prediction_active_models.simulated_profit_pct IS 'Simulierte Profitabilität in Prozent (-999.9999 bis 999.9999)';

-- Indizes für Performance-Metriken
CREATE INDEX IF NOT EXISTS idx_active_models_accuracy ON prediction_active_models(training_accuracy);
CREATE INDEX IF NOT EXISTS idx_active_models_f1 ON prediction_active_models(training_f1);
CREATE INDEX IF NOT EXISTS idx_active_models_profit ON prediction_active_models(simulated_profit_pct);

