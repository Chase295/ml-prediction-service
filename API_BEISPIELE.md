# 📡 API Beispiele - ML Prediction Service

Praktische Beispiele für alle API-Endpoints.

## 🔧 Voraussetzungen

```bash
# API Base URL
API_BASE_URL="http://localhost:8000/api"

# Oder auf Server:
API_BASE_URL="http://100.76.209.59:8005/api"
```

---

## 1. Health Check

```bash
curl http://localhost:8000/api/health
```

**Response:**
```json
{
  "status": "healthy",
  "db_connected": true,
  "active_models": 2,
  "predictions_last_hour": 150,
  "uptime_seconds": 3600,
  "start_time": 1766609189.2259846,
  "last_error": null
}
```

---

## 2. Verfügbare Modelle (für Import)

```bash
curl http://localhost:8000/api/models/available
```

**Response:**
```json
{
  "models": [
    {
      "id": 3,
      "name": "Final Test Modell",
      "model_type": "random_forest",
      "target_variable": "price_close",
      "future_minutes": 5,
      "price_change_percent": 30.0,
      "target_direction": "up",
      "features": ["price_open", "price_high", "price_low", "price_close"],
      "phases": [1, 2],
      "training_accuracy": 0.85,
      "created_at": "2025-12-24T13:23:05.037207Z"
    }
  ],
  "total": 1
}
```

---

## 3. Modell Importieren

```bash
curl -X POST http://localhost:8000/api/models/import \
  -H "Content-Type: application/json" \
  -d '{
    "model_id": 3
  }'
```

**Response (201 Created):**
```json
{
  "active_model_id": 1,
  "model_id": 3,
  "model_name": "Final Test Modell",
  "local_model_path": "/app/models/model_3.pkl",
  "message": "Modell 3 erfolgreich importiert"
}
```

---

## 4. Aktive Modelle auflisten

```bash
curl http://localhost:8000/api/models/active
```

**Response:**
```json
{
  "models": [
    {
      "id": 1,
      "model_id": 3,
      "name": "Final Test Modell",
      "custom_name": null,
      "model_type": "random_forest",
      "target_variable": "price_close",
      "future_minutes": 5,
      "price_change_percent": 30.0,
      "target_direction": "up",
      "features": ["price_open", "price_high", "price_low"],
      "is_active": true,
      "total_predictions": 150,
      "last_prediction_at": "2025-12-24T20:30:00Z"
    }
  ],
  "total": 1
}
```

---

## 5. Modell Aktivieren

```bash
curl -X POST http://localhost:8000/api/models/1/activate
```

**Response (200 OK):**
```json
{
  "message": "Modell 1 erfolgreich aktiviert",
  "active_model_id": 1
}
```

---

## 6. Modell Deaktivieren

```bash
curl -X POST http://localhost:8000/api/models/1/deactivate
```

**Response (200 OK):**
```json
{
  "message": "Modell 1 erfolgreich deaktiviert",
  "active_model_id": 1
}
```

---

## 7. Modell Umbenennen

```bash
curl -X PATCH http://localhost:8000/api/models/1/rename \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mein Custom Modell",
    "description": "Beschreibung (optional)"
  }'
```

**Response (200 OK):**
```json
{
  "message": "Modell 1 erfolgreich umbenannt",
  "active_model_id": 1,
  "new_name": "Mein Custom Modell"
}
```

---

## 8. Modell Löschen

```bash
curl -X DELETE http://localhost:8000/api/models/1
```

**Response (200 OK):**
```json
{
  "message": "Modell 1 erfolgreich gelöscht",
  "active_model_id": 1
}
```

---

## 9. Manuelle Vorhersage

```bash
curl -X POST http://localhost:8000/api/predict \
  -H "Content-Type: application/json" \
  -d '{
    "coin_id": "ABC123...",
    "model_ids": [1, 2],
    "timestamp": "2025-12-24T20:00:00Z"
  }'
```

**Response (200 OK):**
```json
{
  "coin_id": "ABC123...",
  "data_timestamp": "2025-12-24T20:00:00Z",
  "predictions": [
    {
      "model_id": 1,
      "model_name": "Final Test Modell",
      "prediction": 1,
      "probability": 0.85,
      "is_alert": true,
      "prediction_duration_ms": 45
    },
    {
      "model_id": 2,
      "model_name": "XGBoost Modell",
      "prediction": 0,
      "probability": 0.32,
      "is_alert": false,
      "prediction_duration_ms": 38
    }
  ],
  "total_models": 2,
  "alerts_count": 1
}
```

**Hinweis:** 
- `model_ids` ist optional - wenn nicht angegeben, werden alle aktiven Modelle verwendet
- `timestamp` ist optional - wenn nicht angegeben, wird der aktuelle Zeitpunkt verwendet

---

## 10. Vorhersagen auflisten

```bash
curl "http://localhost:8000/api/predictions?limit=10&offset=0&coin_id=ABC123&model_id=1"
```

**Response:**
```json
{
  "predictions": [
    {
      "id": 1,
      "coin_id": "ABC123...",
      "data_timestamp": "2025-12-24T20:00:00Z",
      "model_id": 1,
      "prediction": 1,
      "probability": 0.85,
      "phase_id_at_time": 1,
      "prediction_duration_ms": 45,
      "created_at": "2025-12-24T20:00:01Z"
    }
  ],
  "total": 150,
  "limit": 10,
  "offset": 0
}
```

---

## 11. Neueste Vorhersage für Coin

```bash
curl http://localhost:8000/api/predictions/latest/ABC123
```

**Response (200 OK):**
```json
{
  "id": 1,
  "coin_id": "ABC123...",
  "data_timestamp": "2025-12-24T20:00:00Z",
  "model_id": 1,
  "prediction": 1,
  "probability": 0.85,
  "phase_id_at_time": 1,
  "created_at": "2025-12-24T20:00:01Z"
}
```

**Response (404 Not Found):**
```json
{
  "detail": "Keine Vorhersage für Coin ABC123 gefunden"
}
```

---

## 12. Statistiken

```bash
curl http://localhost:8000/api/stats
```

**Response:**
```json
{
  "total_predictions": 1500,
  "predictions_last_hour": 150,
  "active_models": 2,
  "coins_tracked": 50,
  "avg_prediction_time_ms": 42
}
```

---

## 13. Prometheus Metrics

```bash
curl http://localhost:8000/api/metrics
```

**Response (Prometheus Format):**
```
# HELP ml_predictions_total Total number of predictions
# TYPE ml_predictions_total counter
ml_predictions_total 1500.0

# HELP ml_active_models Number of active models
# TYPE ml_active_models gauge
ml_active_models 2.0

# HELP ml_prediction_duration_seconds Prediction duration in seconds
# TYPE ml_prediction_duration_seconds histogram
ml_prediction_duration_seconds_bucket{le="0.01"} 100.0
ml_prediction_duration_seconds_bucket{le="0.05"} 500.0
ml_prediction_duration_seconds_bucket{le="0.1"} 1000.0
...
```

---

## 🔄 n8n Integration

### Webhook-Format (automatisch gesendet)

Wenn ein neuer Eintrag in `coin_metrics` erkannt wird, sendet der Service automatisch:

```json
{
  "coin_id": "ABC123...",
  "data_timestamp": "2025-12-24T20:00:00Z",
  "phase_id_at_time": 1,
  "predictions": [
    {
      "model_id": 1,
      "model_name": "Final Test Modell",
      "model_type": "random_forest",
      "target_variable": "price_close",
      "future_minutes": 5,
      "price_change_percent": 30.0,
      "target_direction": "up",
      "prediction": 1,
      "probability": 0.85,
      "is_alert": true,
      "prediction_duration_ms": 45
    }
  ],
  "total_models": 1,
  "alerts_count": 1,
  "timestamp": "2025-12-24T20:00:01Z"
}
```

**Konfiguration:**
- `N8N_WEBHOOK_URL`: URL zum n8n Webhook
- `DEFAULT_ALERT_THRESHOLD`: Standard-Schwellwert für Alerts (default: 0.7)

---

## 🐍 Python Beispiele

```python
import requests

API_BASE_URL = "http://localhost:8000/api"

# 1. Health Check
response = requests.get(f"{API_BASE_URL}/health")
print(response.json())

# 2. Verfügbare Modelle
response = requests.get(f"{API_BASE_URL}/models/available")
models = response.json()
print(f"Verfügbare Modelle: {models['total']}")

# 3. Modell importieren
response = requests.post(
    f"{API_BASE_URL}/models/import",
    json={"model_id": 3}
)
print(response.json())

# 4. Vorhersage machen
response = requests.post(
    f"{API_BASE_URL}/predict",
    json={
        "coin_id": "ABC123...",
        "model_ids": [1]  # Optional
    }
)
predictions = response.json()
print(f"Vorhersagen: {len(predictions['predictions'])}")
```

---

## ⚠️ Fehlerbehandlung

### 400 Bad Request
```json
{
  "detail": "Modell 3 ist bereits importiert (active_model_id: 1)"
}
```

### 404 Not Found
```json
{
  "detail": "Modell 999 nicht gefunden"
}
```

### 500 Internal Server Error
```json
{
  "detail": "Fehler beim Modell-Import: ..."
}
```

---

## 📚 Weitere Dokumentation

- **Swagger UI:** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`
- **README:** Siehe `README.md`

