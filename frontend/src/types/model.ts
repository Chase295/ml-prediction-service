/**
 * TypeScript-Typen für ML-Modelle und API-Responses
 * Migriert von Streamlit-Utils
 */

// Basis-Modell-Interface
export interface Model {
  id: number;
  model_id: number;
  name: string;
  custom_name?: string;
  model_type: string;
  target_variable: string;
  target_operator?: string;
  target_value?: number;
  future_minutes: number;
  price_change_percent: number;
  target_direction: string;
  features: string[];

  // Status
  is_active: boolean;

  // Alert-Konfiguration
  n8n_webhook_url?: string;
  n8n_enabled: boolean;
  n8n_send_mode: 'all' | 'alerts_only' | 'positive_only' | 'negative_only';
  alert_threshold: number;
  coin_filter_mode: 'all' | 'whitelist';
  coin_whitelist?: string[];

  // Ignore-Settings
  ignore_bad_seconds: number;
  ignore_positive_seconds: number;
  ignore_alert_seconds: number;

  // Performance-Metriken (Training)
  accuracy?: number;
  f1_score?: number;
  precision?: number;
  recall?: number;
  roc_auc?: number;
  mcc?: number;
  simulated_profit_pct?: number;

  // Live-Performance-Metriken
  total_predictions?: number;
  positive_predictions?: number;
  average_probability?: number;
  last_prediction_at?: string;

  // Timestamps
  created_at?: string;
  updated_at?: string;
}

// Alert-Konfiguration für Updates
export interface AlertConfig {
  n8n_webhook_url?: string;
  n8n_enabled: boolean;
  n8n_send_mode: 'all' | 'alerts_only' | 'positive_only' | 'negative_only';
  alert_threshold: number;
  coin_filter_mode: 'all' | 'whitelist';
  coin_whitelist?: string[];
}

// Ignore-Settings für Updates
export interface IgnoreSettings {
  ignore_bad_seconds: number;
  ignore_positive_seconds: number;
  ignore_alert_seconds: number;
}

// Kombinierte Response für Ignore-Settings
export interface IgnoreSettingsResponse {
  ignore_bad_seconds: number;
  ignore_positive_seconds: number;
  ignore_alert_seconds: number;
}

// Modell-Liste Response
export interface ModelsListResponse {
  models: Model[];
  total: number;
}

// Einzelnes Modell Response
export interface ModelResponse extends Model {}

// Prediction-Interface
export interface Prediction {
  id: number;
  active_model_id: number;
  coin_id: string;
  prediction: number; // 0 = negativ, 1 = positiv
  probability: number; // 0.0 - 1.0
  features_used: string[];
  predicted_at: string;
  created_at: string;
}

// Prediction-Liste Response
export interface PredictionsResponse {
  predictions: Prediction[];
  total: number;
  page: number;
  per_page: number;
}

// API-Error Response
export interface ApiError {
  detail: string;
  status_code?: number;
}

// Health-Check Response
export interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  version?: string;
  uptime?: number;
}
