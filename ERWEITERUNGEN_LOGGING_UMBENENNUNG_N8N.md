# 🔧 Erweiterungen: Logging, Umbenennung, n8n Integration

**Datum:** 24. Dezember 2025  
**Status:** Planungs-Ergänzungen

---

## 📝 1. Logging-Strategie

### **Strukturiertes Logging (wie Training Service)**

**Implementierung:**
- ✅ JSON-Logging (optional)
- ✅ Konfigurierbares Log-Level
- ✅ Request-ID für Tracing
- ✅ Strukturierte Log-Messages

**Environment Variables:**
```bash
LOG_LEVEL=INFO              # DEBUG, INFO, WARNING, ERROR, CRITICAL
LOG_FORMAT=text             # "text" oder "json"
LOG_JSON_INDENT=0          # 0 = kompakt, 2+ = formatiert
```

**Log-Format (Text):**
```
[2024-12-24T10:00:00+00:00] [INFO] [app.prediction.engine] [req:12345678] ✅ Vorhersage gemacht für Coin ABC123: prediction=1, probability=0.85
```

**Log-Format (JSON):**
```json
{
  "timestamp": "2024-12-24T10:00:00+00:00",
  "level": "INFO",
  "logger": "app.prediction.engine",
  "request_id": "12345678-1234-1234-1234-123456789abc",
  "message": "✅ Vorhersage gemacht für Coin ABC123",
  "coin_id": "ABC123",
  "model_id": 1,
  "prediction": 1,
  "probability": 0.85
}
```

**Wichtige Log-Punkte:**
- ✅ Modell-Import/Download
- ✅ Vorhersagen (mit Coin-ID, Modell-ID, Ergebnis)
- ✅ n8n Webhook-Calls (Erfolg/Fehler)
- ✅ Event-Handler (LISTEN/NOTIFY oder Polling)
- ✅ Fehler (mit vollständigem Context)

---

## ✏️ 2. Modell-Umbenennung

### **Funktion hinzufügen**

**Datenbank-Schema erweitern:**
```sql
-- prediction_active_models Tabelle hat bereits:
-- model_name VARCHAR(255) NOT NULL  (aus ml_models kopiert)
-- → Kann lokal umbenannt werden!

-- Optional: custom_name Feld hinzufügen (falls gewünscht)
ALTER TABLE prediction_active_models 
ADD COLUMN IF NOT EXISTS custom_name VARCHAR(255);

-- Index für Suche
CREATE INDEX IF NOT EXISTS idx_active_models_custom_name 
ON prediction_active_models(custom_name) WHERE custom_name IS NOT NULL;
```

**API-Endpunkt:**
```python
# app/api/routes.py

@router.patch("/models/{active_model_id}/rename")
async def rename_model(
    active_model_id: int,
    request: RenameModelRequest
):
    """
    Benennt aktives Modell um.
    
    Request Body:
    {
        "name": "Neuer Name",
        "description": "Optional: Beschreibung"  # Falls gewünscht
    }
    """
    pool = await get_pool()
    
    # Update custom_name
    await pool.execute("""
        UPDATE prediction_active_models
        SET custom_name = $1,
            updated_at = NOW()
        WHERE id = $2
    """, request.name, active_model_id)
    
    logger.info(
        f"✅ Modell {active_model_id} umbenannt zu '{request.name}'",
        extra={"active_model_id": active_model_id, "new_name": request.name}
    )
    
    return {"success": True, "message": f"Modell umbenannt zu '{request.name}'"}
```

**Pydantic Schema:**
```python
# app/api/schemas.py

class RenameModelRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Neuer Modell-Name")
    description: Optional[str] = Field(None, max_length=1000, description="Optional: Beschreibung")
```

**Streamlit UI:**
```python
# In page_manage_models() oder page_overview()

if st.button("✏️ Umbenennen", key=f"rename_{model['id']}"):
    new_name = st.text_input("Neuer Name", value=model['name'], key=f"new_name_{model['id']}")
    if st.button("💾 Speichern", key=f"save_{model['id']}"):
        response = requests.patch(
            f"{API_BASE_URL}/models/{model['id']}/rename",
            json={"name": new_name}
        )
        if response.status_code == 200:
            st.success("✅ Modell umbenannt!")
            st.rerun()
```

---

## 📡 3. n8n Integration - Erweiterte Payload

### **JSON-Format mit Modell-Informationen und Alerts**

**Erweiterte Payload-Struktur:**
```python
# app/prediction/n8n_client.py

async def send_to_n8n(
    coin_id: str,
    timestamp: datetime,
    predictions: List[Dict],
    active_models: List[Dict]  # Für Modell-Informationen
) -> bool:
    """
    Sendet ALLE Vorhersagen an n8n Webhook.
    
    Payload enthält:
    - Coin-Informationen
    - Alle Vorhersagen mit vollständigen Modell-Informationen
    - Alert-Flag für jede Vorhersage
    """
    from app.utils.config import N8N_WEBHOOK_URL, DEFAULT_ALERT_THRESHOLD
    
    if not N8N_WEBHOOK_URL:
        logger.debug("N8N_WEBHOOK_URL nicht gesetzt - überspringe Webhook")
        return False
    
    # Erweitere Predictions mit Modell-Informationen
    enriched_predictions = []
    for pred in predictions:
        model_id = pred['model_id']
        
        # Finde Modell-Informationen
        model_info = next(
            (m for m in active_models if m['model_id'] == model_id),
            None
        )
        
        if not model_info:
            logger.warning(f"Modell-Informationen nicht gefunden für model_id={model_id}")
            continue
        
        # Alert-Threshold prüfen
        threshold = model_info.get('alert_threshold', DEFAULT_ALERT_THRESHOLD)
        is_alert = pred['probability'] > threshold
        
        # Erweiterte Prediction
        enriched_pred = {
            # Vorhersage-Daten
            "prediction": pred['prediction'],
            "probability": float(pred['probability']),
            "is_alert": is_alert,
            "alert_threshold": float(threshold),
            
            # Modell-Informationen
            "model": {
                "id": model_id,
                "active_model_id": model_info['id'],
                "name": model_info['name'],
                "custom_name": model_info.get('custom_name'),  # Falls umbenannt
                "model_type": model_info['model_type'],
                "target_variable": model_info['target_variable'],
                "target_operator": model_info.get('target_operator'),
                "target_value": float(model_info['target_value']) if model_info.get('target_value') else None,
                "future_minutes": model_info.get('future_minutes'),
                "price_change_percent": float(model_info['price_change_percent']) if model_info.get('price_change_percent') else None,
                "target_direction": model_info.get('target_direction'),
                "features": model_info['features'],
                "phases": model_info.get('phases'),
                "total_predictions": model_info.get('total_predictions', 0),
                "last_prediction_at": model_info.get('last_prediction_at').isoformat() if model_info.get('last_prediction_at') else None
            }
        }
        
        enriched_predictions.append(enriched_pred)
    
    # Vollständige Payload
    payload = {
        "coin_id": coin_id,
        "timestamp": timestamp.isoformat(),
        "predictions": enriched_predictions,
        "metadata": {
            "total_predictions": len(enriched_predictions),
            "alerts_count": sum(1 for p in enriched_predictions if p['is_alert']),
            "service": "ml-prediction-service",
            "version": "1.0.0"
        }
    }
    
    # Sende an n8n
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                N8N_WEBHOOK_URL,
                json=payload,  # ⚠️ WICHTIG: json= für JSON-Format!
                timeout=aiohttp.ClientTimeout(total=5),
                headers={"Content-Type": "application/json"}
            ) as response:
                if response.status == 200:
                    logger.info(
                        f"✅ Vorhersagen an n8n gesendet für Coin {coin_id}",
                        extra={
                            "coin_id": coin_id,
                            "predictions_count": len(enriched_predictions),
                            "alerts_count": sum(1 for p in enriched_predictions if p['is_alert'])
                        }
                    )
                    
                    # Log in DB (optional)
                    await log_webhook_call(coin_id, timestamp, payload, response.status, None, pool)
                    return True
                else:
                    error_text = await response.text()
                    logger.warning(
                        f"⚠️ n8n Webhook Fehler: {response.status}",
                        extra={
                            "coin_id": coin_id,
                            "status": response.status,
                            "error": error_text
                        }
                    )
                    
                    # Log in DB
                    await log_webhook_call(coin_id, timestamp, payload, response.status, error_text, pool)
                    return False
                    
    except Exception as e:
        logger.error(
            f"❌ Fehler beim Senden an n8n: {e}",
            extra={"coin_id": coin_id, "error": str(e)},
            exc_info=True
        )
        
        # Log in DB
        await log_webhook_call(coin_id, timestamp, payload, None, str(e), pool)
        return False
```

**Beispiel-Payload (JSON):**
```json
{
  "coin_id": "ABC123DEF456...",
  "timestamp": "2024-12-24T10:00:00+00:00",
  "predictions": [
    {
      "prediction": 1,
      "probability": 0.8523,
      "is_alert": true,
      "alert_threshold": 0.70,
      "model": {
        "id": 1,
        "active_model_id": 5,
        "name": "PumpDetector_v1",
        "custom_name": "Mein Pump Detector",  // Falls umbenannt
        "model_type": "xgboost",
        "target_variable": "price_close",
        "target_operator": null,
        "target_value": null,
        "future_minutes": 10,
        "price_change_percent": 30.0,
        "target_direction": "up",
        "features": ["price_open", "price_high", "price_low", "price_close", "volume_sol"],
        "phases": [1, 2],
        "total_predictions": 1234,
        "last_prediction_at": "2024-12-24T09:59:00+00:00"
      }
    },
    {
      "prediction": 0,
      "probability": 0.2341,
      "is_alert": false,
      "alert_threshold": 0.70,
      "model": {
        "id": 2,
        "active_model_id": 6,
        "name": "WhaleTracker",
        "custom_name": null,
        "model_type": "random_forest",
        "target_variable": "market_cap_close",
        "target_operator": ">",
        "target_value": 10000.0,
        "future_minutes": null,
        "price_change_percent": null,
        "target_direction": null,
        "features": ["price_close", "volume_sol", "market_cap_close"],
        "phases": [2, 3],
        "total_predictions": 567,
        "last_prediction_at": "2024-12-24T09:58:00+00:00"
      }
    }
  ],
  "metadata": {
    "total_predictions": 2,
    "alerts_count": 1,
    "service": "ml-prediction-service",
    "version": "1.0.0"
  }
}
```

**Webhook-Logging:**
```python
async def log_webhook_call(
    coin_id: str,
    timestamp: datetime,
    payload: Dict,
    response_status: Optional[int],
    error_message: Optional[str],
    pool: asyncpg.Pool
):
    """Loggt Webhook-Call in DB"""
    await pool.execute("""
        INSERT INTO prediction_webhook_log (
            coin_id, data_timestamp, webhook_url, payload,
            response_status, error_message
        ) VALUES ($1, $2, $3, $4, $5, $6)
    """,
        coin_id,
        timestamp,
        N8N_WEBHOOK_URL,
        json.dumps(payload),  # JSONB
        response_status,
        error_message
    )
```

---

## 🔄 4. Integration in Event-Handler

**Aktualisierte `process_batch()` Funktion:**
```python
async def process_batch(
    coin_entries: List[Dict],
    active_models: List[Dict],
    pool: asyncpg.Pool
):
    """
    Verarbeitet Batch von Coins.
    Sendet ALLE Vorhersagen an n8n (mit Modell-Informationen).
    """
    from app.prediction.engine import predict_coin_all_models
    from app.database.models import save_prediction
    from app.prediction.n8n_client import send_to_n8n
    
    # Gruppiere nach Coin
    coins_dict = {}
    for entry in coin_entries:
        coin_id = entry['mint']
        if coin_id not in coins_dict:
            coins_dict[coin_id] = []
        coins_dict[coin_id].append(entry)
    
    # Für jeden Coin
    for coin_id, entries in coins_dict.items():
        # Neueste Timestamp
        latest_timestamp = max(e['latest_timestamp'] for e in entries)
        
        # Mache Vorhersagen mit allen Modellen
        results = await predict_coin_all_models(
            coin_id=coin_id,
            timestamp=latest_timestamp,
            active_models=active_models,
            pool=pool
        )
        
        # Speichere Vorhersagen in DB
        predictions_to_save = []
        for result in results:
            await save_prediction(
                coin_id=coin_id,
                data_timestamp=latest_timestamp,
                model_id=result['model_id'],
                active_model_id=next(m['id'] for m in active_models if m['model_id'] == result['model_id']),
                prediction=result['prediction'],
                probability=result['probability'],
                phase_id=entries[0].get('phase_id'),
                pool=pool
            )
        
        # Sende ALLE Vorhersagen an n8n (mit Modell-Informationen)
        await send_to_n8n(
            coin_id=coin_id,
            timestamp=latest_timestamp,
            predictions=results,
            active_models=active_models
        )
```

---

## ✅ Zusammenfassung

### **Logging:**
- ✅ Strukturiertes Logging (Text oder JSON)
- ✅ Request-ID für Tracing
- ✅ Konfigurierbar über Environment Variables
- ✅ Wichtige Events werden geloggt

### **Modell-Umbenennung:**
- ✅ API-Endpunkt: `PATCH /api/models/{id}/rename`
- ✅ Optional: `custom_name` Feld in DB
- ✅ Streamlit UI Integration

### **n8n Integration:**
- ✅ **JSON-Format** (FastAPI `json=` Parameter)
- ✅ **Vollständige Modell-Informationen** in Payload
- ✅ **Alert-Flag** für jede Vorhersage
- ✅ **Metadata** (Anzahl Vorhersagen, Alerts, etc.)
- ✅ **Webhook-Logging** in DB

### **FastAPI:**
- ✅ Alle Endpunkte nutzen FastAPI
- ✅ Pydantic Schemas für Request/Response
- ✅ JSON-Serialisierung automatisch
- ✅ Request-ID Middleware

---

**Status:** ✅ Planungs-Ergänzungen abgeschlossen  
**Nächster Schritt:** In Implementierung integrieren

