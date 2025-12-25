# 🔧 Coolify Environment Variables

Vollständige Liste aller Environment Variables, die in Coolify gesetzt werden müssen.

## ⚠️ WICHTIG: Erforderliche Variablen

### 1. Datenbank-Verbindung (ERFORDERLICH)

```bash
DB_DSN=postgresql://postgres:PASSWORD@HOST:5432/crypto
```

**Beispiel:**
```bash
DB_DSN=postgresql://postgres:Ycy0qfClGpXPbm3Vulz1jBL0OFfCojITnbST4JBYreS5RkBCTsYc2FkbgyUstE6g@100.76.209.59:5432/crypto
```

**Erklärung:** Vollständige PostgreSQL-Verbindungs-URL zur externen Datenbank.

---

### 2. Training Service API (ERFORDERLICH)

```bash
TRAINING_SERVICE_API_URL=http://100.76.209.59:8005/api
```

**Erklärung:** URL zum ML Training Service (für Modell-Download).

---

### 3. n8n Webhook (OPTIONAL, aber empfohlen)

```bash
N8N_WEBHOOK_URL=https://n8n-ai.chase295.de/webhook/get-coins
```

**Erklärung:** n8n Webhook URL für Vorhersagen-Alerts.

---

## 📋 Optionale Variablen (mit Defaults)

### API & Ports

```bash
API_PORT=8000
```

**Default:** `8000`  
**Erklärung:** Interner FastAPI Port (wird von Coolify extern gemappt).

---

### Modell-Verwaltung

```bash
MODEL_STORAGE_PATH=/app/models
```

**Default:** `/app/models`  
**Erklärung:** Pfad für Modell-Dateien im Container.

```bash
MODEL_CACHE_SIZE=10
```

**Default:** `10`  
**Erklärung:** Anzahl der Modelle im Cache.

---

### Event Handler (LISTEN/NOTIFY & Polling)

```bash
POLLING_INTERVAL_SECONDS=30
```

**Default:** `30`  
**Erklärung:** Polling-Interval (falls LISTEN/NOTIFY nicht funktioniert).

```bash
BATCH_SIZE=50
```

**Default:** `50`  
**Erklärung:** Anzahl der Coins pro Batch-Verarbeitung.

```bash
BATCH_TIMEOUT_SECONDS=5
```

**Default:** `5`  
**Erklärung:** Timeout für Batch-Verarbeitung.

---

### Feature-Engineering

```bash
FEATURE_HISTORY_SIZE=20
```

**Default:** `20`  
**Erklärung:** Anzahl der historischen Datenpunkte für Features.

```bash
MAX_CONCURRENT_PREDICTIONS=10
```

**Default:** `10`  
**Erklärung:** Maximale parallele Vorhersagen.

---

### n8n Integration

```bash
N8N_WEBHOOK_TIMEOUT=5
```

**Default:** `5`  
**Erklärung:** Timeout für n8n Webhook-Aufrufe (Sekunden).

---

### Alert-System

```bash
DEFAULT_ALERT_THRESHOLD=0.7
```

**Default:** `0.7`  
**Erklärung:** Standard Alert-Threshold (0.0-1.0) für neue Modelle.

---

### Logging

```bash
LOG_LEVEL=INFO
```

**Mögliche Werte:** `DEBUG`, `INFO`, `WARNING`, `ERROR`  
**Default:** `INFO`  
**Erklärung:** Log-Level für strukturiertes Logging.

```bash
LOG_FORMAT=text
```

**Mögliche Werte:** `text`, `json`  
**Default:** `text`  
**Erklärung:** Log-Format (text für Lesbarkeit, json für Parsing).

---

## 🎯 Minimal-Konfiguration für Coolify

**Mindestens diese 2 Variablen müssen gesetzt werden:**

```bash
DB_DSN=postgresql://postgres:PASSWORD@HOST:5432/crypto
TRAINING_SERVICE_API_URL=http://100.76.209.59:8005/api
```

---

## 📝 Vollständige Beispiel-Konfiguration

```bash
# ERFORDERLICH
DB_DSN=postgresql://postgres:Ycy0qfClGpXPbm3Vulz1jBL0OFfCojITnbST4JBYreS5RkBCTsYc2FkbgyUstE6g@100.76.209.59:5432/crypto
TRAINING_SERVICE_API_URL=http://100.76.209.59:8005/api

# OPTIONAL (aber empfohlen)
N8N_WEBHOOK_URL=https://n8n-ai.chase295.de/webhook/get-coins
N8N_WEBHOOK_TIMEOUT=5
DEFAULT_ALERT_THRESHOLD=0.7

# OPTIONAL (Defaults sind meist OK)
API_PORT=8000
MODEL_STORAGE_PATH=/app/models
POLLING_INTERVAL_SECONDS=30
BATCH_SIZE=50
BATCH_TIMEOUT_SECONDS=5
FEATURE_HISTORY_SIZE=20
MAX_CONCURRENT_PREDICTIONS=10
MODEL_CACHE_SIZE=10
LOG_LEVEL=INFO
LOG_FORMAT=text
```

---

## 🔍 Wo werden diese Variablen verwendet?

### `app/utils/config.py`
- Alle Variablen werden hier geladen und validiert
- Defaults sind definiert
- Fehlende erforderliche Variablen führen zu Fehlern beim Start

### `docker-compose.coolify.yml`
- Verwendet `${VARIABLE_NAME}` Syntax
- Coolify setzt diese beim Deployment

---

## ⚠️ Wichtige Hinweise

1. **DB_DSN:** Muss erreichbar sein vom Coolify-Server aus
2. **TRAINING_SERVICE_API_URL:** Muss erreichbar sein für Modell-Download
3. **N8N_WEBHOOK_URL:** Kann leer bleiben, wenn n8n nicht verwendet wird
4. **Ports:** Werden von Coolify automatisch gemappt (nicht manuell setzen)
5. **MODEL_STORAGE_PATH:** Wird als Volume gemountet (automatisch von Coolify)

---

## 🚀 Coolify Setup-Schritte

1. **Repository verbinden:** `Chase295/ml-prediction-service`
2. **Docker Compose Deployment wählen**
3. **Environment Variables setzen:**
   - Mindestens: `DB_DSN` und `TRAINING_SERVICE_API_URL`
   - Optional: Alle anderen Variablen nach Bedarf
4. **Deploy!**

---

## 📚 Weitere Informationen

- Siehe `README.md` für allgemeine Informationen
- Siehe `ML_PREDICTION_SERVICE_AUFBAU_ANLEITUNG.md` für detaillierte Anleitung
- Siehe `app/utils/config.py` für alle verfügbaren Variablen

