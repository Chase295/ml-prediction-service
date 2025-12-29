"""
Pydantic Schemas für ML Prediction Service API
"""
from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, validator, ConfigDict, field_validator

# ============================================================
# Request Schemas
# ============================================================

class PredictRequest(BaseModel):
    """Request für manuelle Vorhersage"""
    model_config = ConfigDict(protected_namespaces=())
    coin_id: str = Field(..., description="Coin-ID (mint)")
    model_ids: Optional[List[int]] = Field(None, description="Liste von Modell-IDs (optional, wenn None: alle aktiven Modelle)")
    timestamp: Optional[datetime] = Field(None, description="Spezifischer Zeitpunkt (optional, wenn None: aktueller Zeitpunkt)")


class ModelImportRequest(BaseModel):
    """Request für Modell-Import"""
    model_config = ConfigDict(protected_namespaces=())
    model_id: int = Field(..., description="ID des Modells in ml_models")
    model_file_url: Optional[str] = Field(None, description="URL zum Modell-Download (optional)")


class RenameModelRequest(BaseModel):
    """Request für Modell-Umbenennung"""
    name: str = Field(..., description="Neuer Modell-Name")
    description: Optional[str] = Field(None, description="Beschreibung (optional)")


class UpdateAlertThresholdRequest(BaseModel):
    """Request für Alert-Threshold Update"""
    model_config = ConfigDict(protected_namespaces=())
    alert_threshold: float = Field(..., ge=0.0, le=1.0, description="Alert-Threshold (0.0-1.0, z.B. 0.7 = 70%)")
class UpdateN8nSettingsRequest(BaseModel):
    """Request für n8n Einstellungen Update"""
    model_config = ConfigDict(protected_namespaces=())
    n8n_webhook_url: Optional[str] = Field(None, description="n8n Webhook URL (optional, leer = löschen)")
    n8n_send_mode: Optional[str] = Field(None, description="Send-Mode: 'all' oder 'alerts_only'")
    n8n_enabled: Optional[bool] = Field(None, description="n8n aktiviert/deaktiviert (optional)")
    
    @field_validator('n8n_send_mode')
    @classmethod
    def validate_send_mode(cls, v):
        if v is not None and v not in ['all', 'alerts_only']:
            raise ValueError("n8n_send_mode muss 'all' oder 'alerts_only' sein")
        return v



# ============================================================
# Response Schemas
# ============================================================

class PredictionResult(BaseModel):
    """Einzelne Vorhersage"""
    model_id: int
    active_model_id: int
    model_name: str
    prediction: int = Field(..., description="Vorhersage: 0 (negativ) oder 1 (positiv)")
    probability: float = Field(..., ge=0.0, le=1.0, description="Wahrscheinlichkeit (0.0 - 1.0)")


class PredictionResponse(BaseModel):
    """Response für Vorhersage"""
    coin_id: str
    timestamp: datetime
    predictions: List[PredictionResult]
    total_models: int


class PredictionDetail(BaseModel):
    """Details einer Vorhersage"""
    id: int
    coin_id: str
    data_timestamp: datetime
    model_id: int
    active_model_id: Optional[int]
    prediction: int
    probability: float
    phase_id_at_time: Optional[int]
    features: Optional[Dict[str, Any]]
    prediction_duration_ms: Optional[int]
    created_at: datetime


class PredictionsListResponse(BaseModel):
    """Response für Liste von Vorhersagen"""
    predictions: List[PredictionDetail]
    total: int
    limit: int
    offset: int


class ModelInfo(BaseModel):
    """Modell-Informationen"""
    model_config = ConfigDict(protected_namespaces=())
    id: int
    model_id: int
    name: str
    custom_name: Optional[str]
    model_type: str
    target_variable: str
    target_operator: Optional[str]
    target_value: Optional[float]
    future_minutes: Optional[int]
    price_change_percent: Optional[float]
    target_direction: Optional[str]
    features: List[str]
    phases: Optional[List[int]]
    params: Optional[Dict[str, Any]]
    is_active: bool
    total_predictions: int
    last_prediction_at: Optional[datetime]
    alert_threshold: float = Field(default=0.7, description="Alert-Threshold (0.0-1.0)")
    n8n_webhook_url: Optional[str] = Field(None, description="n8n Webhook URL (optional, überschreibt globale URL)")
    n8n_send_mode: str = Field(default="all", description="Send-Mode: 'all', 'alerts_only', 'positive_only', 'negative_only'")
    n8n_enabled: bool = Field(default=True, description="n8n aktiviert/deaktiviert")
    coin_filter_mode: str = Field(default="all", description="Coin-Filter Modus: 'all' oder 'whitelist'")
    coin_whitelist: Optional[List[str]] = Field(None, description="Liste der erlaubten Coin-Mint-Adressen")
    coin_filter_mode: str = Field(default="all", description="Coin-Filter Modus: 'all' oder 'whitelist'")
    coin_whitelist: Optional[List[str]] = Field(None, description="Liste der erlaubten Coin-Mint-Adressen")
    # 🔄 NEU: Coin-Ignore-Einstellungen
    ignore_bad_seconds: Optional[int] = Field(default=0, ge=0, le=86400, description="Sekunden für schlechte Vorhersagen (0-86400, 0=nie)")
    ignore_positive_seconds: Optional[int] = Field(default=0, ge=0, le=86400, description="Sekunden für positive Vorhersagen")
    ignore_alert_seconds: Optional[int] = Field(default=0, ge=0, le=86400, description="Sekunden für Alert-Vorhersagen")
    stats: Optional[Dict[str, int]] = Field(None, description="Statistiken (positive_predictions, negative_predictions, alerts_count)")
    created_at: datetime


class AvailableModel(BaseModel):
    """Verfügbares Modell (für Import)"""
    model_config = ConfigDict(protected_namespaces=())
    id: int
    name: str
    model_type: str
    target_variable: str
    target_operator: Optional[str]
    target_value: Optional[float]
    future_minutes: Optional[int]
    price_change_percent: Optional[float]
    target_direction: Optional[str]
    features: List[str]
    phases: Optional[List[int]]
    training_accuracy: Optional[float]
    training_f1: Optional[float]
    created_at: datetime


class ModelsListResponse(BaseModel):
    """Response für Liste von Modellen"""
    models: List[ModelInfo]
    total: int


class AvailableModelsResponse(BaseModel):
    """Response für verfügbare Modelle"""
    models: List[AvailableModel]
    total: int


class HealthResponse(BaseModel):
    """Response für Health Check"""
    status: str = Field(..., description="'healthy' oder 'degraded'")
    db_connected: bool
    active_models: int
    predictions_last_hour: int
    uptime_seconds: int
    start_time: Optional[float]
    last_error: Optional[str]


class StatsResponse(BaseModel):
    """Response für Statistiken"""
    total_predictions: int
    predictions_last_hour: int
    predictions_last_24h: Optional[int] = 0
    predictions_last_7d: Optional[int] = 0
    active_models: int
    coins_tracked: int
    avg_prediction_time_ms: Optional[float] = None
    webhook_total: Optional[int] = 0
    webhook_success: Optional[int] = 0
    webhook_failed: Optional[int] = 0


class ModelStatisticsResponse(BaseModel):
    """Detaillierte Statistiken für ein aktives Modell"""
    model_config = ConfigDict(protected_namespaces=())
    total_predictions: int
    positive_predictions: int
    negative_predictions: int
    avg_probability: Optional[float]
    avg_probability_positive: Optional[float]
    avg_probability_negative: Optional[float]
    min_probability: Optional[float]
    max_probability: Optional[float]
    avg_duration_ms: Optional[float]
    first_prediction: Optional[datetime]
    last_prediction: Optional[datetime]
    unique_coins: int
    alerts_count: int
    alert_threshold: float
    webhook_success_rate: Optional[float]
    webhook_total: int
    webhook_success: int
    webhook_failed: int
    probability_distribution: Dict[str, int]


class ImportModelResponse(BaseModel):
    """Response für Modell-Import"""
    active_model_id: int
    model_id: int
    model_name: str
    local_model_path: str
    message: str


class UpdateAlertConfigRequest(BaseModel):
    """Request für komplette Alert-Konfiguration Update"""
    n8n_webhook_url: Optional[str] = Field(None, description="n8n Webhook URL")
    n8n_enabled: bool = Field(default=True, description="n8n aktiviert/deaktiviert")
    n8n_send_mode: str = Field(default="all", description="Send-Mode: 'all', 'alerts_only', 'positive_only', 'negative_only'")
    alert_threshold: float = Field(default=0.7, description="Alert-Threshold (0.0-1.0)")
    coin_filter_mode: str = Field(default="all", description="Coin-Filter Modus: 'all' oder 'whitelist'")
    coin_whitelist: Optional[List[str]] = Field(None, description="Liste der erlaubten Coin-Mint-Adressen")


class UpdateIgnoreSettingsRequest(BaseModel):
    """Request für Coin-Ignore-Einstellungen Update"""
    ignore_bad_seconds: int = Field(default=0, ge=0, le=86400, description="Sekunden für schlechte Vorhersagen (0-86400, 0=nie)")
    ignore_positive_seconds: int = Field(default=0, ge=0, le=86400, description="Sekunden für positive Vorhersagen")
    ignore_alert_seconds: int = Field(default=0, ge=0, le=86400, description="Sekunden für Alert-Vorhersagen")


class IgnoreSettingsResponse(BaseModel):
    """Response mit aktuellen Ignore-Einstellungen"""
    ignore_bad_seconds: int
    ignore_positive_seconds: int
    ignore_alert_seconds: int


