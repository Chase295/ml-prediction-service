-- ============================================================
-- Alert Evaluations Tabelle
-- Version: 1.0
-- Datum: 25. Dezember 2025
-- ============================================================

-- Erstelle alert_evaluations Tabelle
CREATE TABLE IF NOT EXISTS alert_evaluations (
    id BIGSERIAL PRIMARY KEY,
    prediction_id BIGINT NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
    coin_id VARCHAR(255) NOT NULL,
    model_id BIGINT NOT NULL,
    
    -- Alert-Konfiguration (zum Zeitpunkt des Alerts)
    -- WICHTIG: Unterstützt sowohl zeitbasierte als auch klassische Vorhersagen!
    prediction_type VARCHAR(20) NOT NULL CHECK (prediction_type IN ('time_based', 'classic')),
    
    -- Zeitbasierte Vorhersage (wenn prediction_type = 'time_based')
    target_variable VARCHAR(100),  -- z.B. "price_close"
    future_minutes INTEGER,        -- z.B. 5
    price_change_percent NUMERIC(10, 4),  -- z.B. 30.0
    target_direction VARCHAR(10) CHECK (target_direction IN ('up', 'down')),
    
    -- Klassische Vorhersage (wenn prediction_type = 'classic')
    target_operator VARCHAR(10) CHECK (target_operator IN ('>', '<', '>=', '<=', '=')),
    target_value NUMERIC(20, 2),  -- z.B. 50000.0
    
    -- Werte zum Zeitpunkt des Alerts (umfassend)
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
    
    -- Werte nach Ablauf der Zeit (umfassend)
    evaluation_timestamp TIMESTAMP WITH TIME ZONE,  -- alert_timestamp + future_minutes (oder NULL bei classic)
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
    
    -- Berechnete Werte
    actual_price_change_pct NUMERIC(10, 4),  -- Für time_based
    actual_value_at_evaluation NUMERIC(20, 2),  -- Für classic (z.B. price_close)
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'expired', 'not_applicable')),
    evaluated_at TIMESTAMP WITH TIME ZONE,
    evaluation_note TEXT,  -- Zusätzliche Info (z.B. warum fehlgeschlagen)
    
    -- Metadaten
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indizes für Performance
CREATE INDEX IF NOT EXISTS idx_alert_evaluations_coin_timestamp 
ON alert_evaluations(coin_id, alert_timestamp ASC);  -- ASC für ältesten zuerst!

CREATE INDEX IF NOT EXISTS idx_alert_evaluations_status 
ON alert_evaluations(status) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_alert_evaluations_prediction 
ON alert_evaluations(prediction_id);

CREATE INDEX IF NOT EXISTS idx_alert_evaluations_type 
ON alert_evaluations(prediction_type);

CREATE INDEX IF NOT EXISTS idx_alert_evaluations_evaluation_timestamp 
ON alert_evaluations(evaluation_timestamp) WHERE status = 'pending';

-- Kommentare für Dokumentation
COMMENT ON TABLE alert_evaluations IS 'Speichert Alerts und deren Auswertungsergebnisse';
COMMENT ON COLUMN alert_evaluations.prediction_type IS 'time_based: X% nach X Minuten, classic: Bedingung (z.B. price_close > 50000)';
COMMENT ON COLUMN alert_evaluations.status IS 'pending: läuft noch, success: erfolgreich, failed: fehlgeschlagen, expired: keine Daten, not_applicable: nicht auswertbar';

