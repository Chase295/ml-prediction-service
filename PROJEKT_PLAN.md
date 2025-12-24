# 🎯 ML Prediction Service - Projektplan

**Version:** 1.0  
**Datum:** 24. Dezember 2025  
**Status:** 📋 Planungsphase

---

## 📋 Executive Summary

Der **ML Prediction Service** ist ein Echtzeit-Vorhersage-Service, der automatisch Vorhersagen macht, sobald neue Daten in die `coin_metrics` Tabelle eingetragen werden. Er nutzt die trainierten Modelle aus dem ML Training Service und macht kontinuierlich Vorhersagen für alle aktiven Coins.

### Hauptziel

**Echtzeit-Vorhersagen für alle Coins, sobald neue Metriken verfügbar sind.**

---

## 🎯 Projekt-Übersicht

### Was macht der Service?

1. **Überwacht `coin_metrics`** auf neue Einträge
2. **Lädt aktive Modelle** aus `ml_models` Tabelle
3. **Sammelt Historie** für jeden Coin (für Feature-Engineering)
4. **Bereitet Features auf** (gleiche Logik wie Training)
5. **Macht Vorhersagen** mit allen aktiven Modellen
6. **Speichert Ergebnisse** in `predictions` Tabelle
7. **Sendet Alerts** bei hoher Wahrscheinlichkeit (optional)

### Technologie-Stack

- **Backend:** FastAPI (Python 3.11) - wie ML Training Service
- **Datenbank:** PostgreSQL (extern, gleiche DB wie Training Service)
- **Event-Handling:** Polling oder Database Triggers
- **ML-Frameworks:** Scikit-learn, XGBoost (gleiche wie Training)
- **Monitoring:** Prometheus Metriken (wie beide Services)
- **API:** REST API für n8n Integration
- **Deployment:** Docker, Coolify (wie Training Service)

---

## 🏗️ Architektur

### Projekt-Struktur

```
ml-prediction-service/
├── app/
│   ├── api/                      # REST API (FastAPI)
│   │   ├── routes.py             # API Endpoints
│   │   ├── schemas.py            # Pydantic Schemas
│   │   └── validators.py         # Validierungs-Logik
│   ├── database/                 # Datenbank-Operationen
│   │   ├── connection.py         # DB-Verbindung (asyncpg)
│   │   ├── models.py             # DB-Interaktionen
│   │   └── queries.py            # Spezielle Queries
│   ├── prediction/               # Vorhersage-Logik
│   │   ├── engine.py             # Haupt-Vorhersage-Engine
│   │   ├── model_manager.py      # Modell-Verwaltung (Laden, Caching)
│   │   ├── feature_processor.py  # Feature-Aufbereitung
│   │   └── event_handler.py      # Event-Handling (neue coin_metrics)
│   ├── utils/                    # Utilities
│   │   ├── config.py             # Konfiguration
│   │   ├── exceptions.py        # Custom Exceptions
│   │   ├── logging_config.py    # Logging-Setup
│   │   └── metrics.py            # Prometheus Metriken
│   └── main.py                   # FastAPI App
├── docs/                         # Dokumentation
├── tests/                        # Test-Scripts
├── docker-compose.yml            # Docker-Konfiguration
├── Dockerfile                    # Docker-Image
└── requirements.txt              # Python-Abhängigkeiten
```

### Datenfluss

```
coin_metrics (Neuer Eintrag)
    ↓
Event Handler (erkennt neuen Eintrag)
    ↓
Model Manager (lädt aktive Modelle)
    ↓
Feature Processor (holt Historie, bereitet Features auf)
    ↓
Prediction Engine (macht Vorhersagen)
    ↓
Database (speichert in predictions Tabelle)
    ↓
Optional: Alert/Webhook (bei hoher Wahrscheinlichkeit)
```

---

## ⚙️ Kern-Funktionen

### 1. Modell-Verwaltung

#### 1.1 Aktive Modelle identifizieren

**Funktion:**
- Liest `ml_models` Tabelle
- Filtert nach `is_active = true`
- Lädt Modell-Dateien (`.pkl`) aus Dateisystem
- Cached Modelle im Speicher

**Datenbank-Feld:**
```sql
ALTER TABLE ml_models ADD COLUMN is_active BOOLEAN DEFAULT false;
```

**Logik:**
- Beim Start: Alle aktiven Modelle laden
- Periodisch (z.B. alle 5 Min): Prüfen auf neue/geänderte Modelle
- Bei Änderung: Modell neu laden oder aus Cache entfernen

#### 1.2 Modell-Caching

**Zweck:**
- Performance: Modelle nicht jedes Mal neu laden
- Speicher: Modelle im RAM halten

**Strategie:**
- LRU Cache (Least Recently Used)
- Max. 10 Modelle gleichzeitig im Speicher
- Automatisches Entladen bei Speichermangel

#### 1.3 Modell-Metadaten

**Gespeichert pro Modell:**
- Modell-ID, Name, Typ
- Features-Liste
- Feature-Engineering-Parameter
- Zeitbasierte Vorhersage-Parameter
- Threshold für Alerts (optional)

---

### 2. Event-Handling

#### 2.1 Neue Einträge erkennen

**Option A: Polling (Empfohlen für Start)**

**Funktion:**
- Prüft alle X Sekunden (z.B. 30s) auf neue Einträge
- Merkt sich letzten verarbeiteten Timestamp
- Verarbeitet nur neue Einträge

**Vorteile:**
- Einfach umzusetzen
- Keine DB-Änderungen nötig
- Robust

**Nachteile:**
- Leicht verzögert (nicht exakt Echtzeit)
- Overhead durch regelmäßige Queries

**SQL Query:**
```sql
SELECT DISTINCT mint, MAX(timestamp) as latest_timestamp
FROM coin_metrics
WHERE timestamp > $last_processed_timestamp
GROUP BY mint
ORDER BY latest_timestamp ASC
```

**Option B: Database Trigger (Später)**

**Funktion:**
- PostgreSQL Trigger auf `coin_metrics` INSERT
- Trigger ruft HTTP-Webhook oder schreibt in Queue-Tabelle
- Service reagiert auf Event

**Vorteile:**
- Echtzeit (keine Verzögerung)
- Effizient

**Nachteile:**
- Komplexer Setup
- DB-Änderungen nötig

**Empfehlung:** Start mit Polling, später auf Trigger umstellen

#### 2.2 Batch-Verarbeitung

**Funktion:**
- Sammelt mehrere neue Einträge (z.B. 10-50)
- Verarbeitet in Batch
- Reduziert DB-Load

**Strategie:**
- Max. Wartezeit: 5 Sekunden
- Max. Batch-Größe: 50 Coins
- Verarbeitet sofort wenn Batch voll oder Wartezeit abgelaufen

---

### 3. Feature-Aufbereitung

#### 3.1 Historie sammeln

**Funktion:**
- Für jeden Coin: Letzte N Einträge aus `coin_metrics` holen
- N = Max. benötigte Historie für Feature-Engineering
- Beispiel: 15 Einträge für `price_volatility_15`

**SQL Query:**
```sql
SELECT * FROM coin_metrics
WHERE mint = $coin_id
ORDER BY timestamp DESC
LIMIT 20
```

**Wichtig:**
- Nach `timestamp` sortiert (neueste zuerst)
- Genug Einträge für Feature-Engineering
- Falls zu wenig: Warnung, aber trotzdem verarbeiten

#### 3.2 Feature-Engineering

**Funktion:**
- Gleiche Logik wie im Training Service
- Nutzt `create_pump_detection_features()` aus Training Service
- Erstellt: ROC, Volatility, Velocity, Range, Change Features

**Code-Wiederverwendung:**
- Option 1: Shared Library (Python Package)
- Option 2: Code-Duplikation (einfacher, aber Wartung)
- Option 3: Import aus Training Service (wenn beide im gleichen Repo)

**Empfehlung:** Option 3 (Import) für Start, später Option 1 (Shared Library)

#### 3.3 Feature-Validierung

**Funktion:**
- Prüft ob alle benötigten Features vorhanden
- Prüft ob Feature-Engineering Features erstellt wurden
- Warnung bei fehlenden Features

---

### 4. Vorhersage-Engine

#### 4.1 Vorhersage für ein Modell

**Ablauf:**
1. Modell aus Cache laden
2. Features in richtiger Reihenfolge vorbereiten
3. `model.predict()` → Ja/Nein (0 oder 1)
4. `model.predict_proba()` → Wahrscheinlichkeit (0.0 - 1.0)

**Wichtig:**
- Features müssen in gleicher Reihenfolge sein wie beim Training
- Feature-Engineering muss identisch sein
- Modell-Typ muss unterstützt werden (Random Forest, XGBoost)

#### 4.2 Multi-Modell-Vorhersagen

**Funktion:**
- Für jeden Coin: Vorhersage mit ALLEN aktiven Modellen
- Jedes Modell gibt eigene Vorhersage + Wahrscheinlichkeit
- Alle Ergebnisse speichern

**Vorteile:**
- Vergleich verschiedener Modelle
- Ensemble-Vorhersage möglich (später)
- Flexibilität

#### 4.3 Ensemble-Vorhersage (Optional, später)

**Funktion:**
- Kombiniert Vorhersagen mehrerer Modelle
- Gewichtete Durchschnitte
- Voting-Mechanismus

**Beispiel:**
- Modell A: 0.7 Wahrscheinlichkeit
- Modell B: 0.8 Wahrscheinlichkeit
- Ensemble: 0.75 (Durchschnitt) oder 0.8 (Max) oder 0.7 (Min)

---

### 5. Ergebnis-Speicherung

#### 5.1 Datenbank-Schema

**Neue Tabelle: `predictions`**

```sql
CREATE TABLE predictions (
    id BIGSERIAL PRIMARY KEY,
    coin_id VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    model_id BIGINT NOT NULL REFERENCES ml_models(id) ON DELETE CASCADE,
    
    -- Vorhersage
    prediction INTEGER NOT NULL,  -- 0 oder 1
    probability NUMERIC(5, 4) NOT NULL,  -- 0.0000 - 1.0000
    
    -- Features (optional, für Debugging)
    features JSONB,
    
    -- Metadaten
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indizes
    INDEX idx_predictions_coin_timestamp ON predictions(coin_id, timestamp DESC),
    INDEX idx_predictions_model ON predictions(model_id),
    INDEX idx_predictions_created ON predictions(created_at DESC)
);
```

**Zusätzliche Tabelle: `prediction_alerts` (Optional)**

```sql
CREATE TABLE prediction_alerts (
    id BIGSERIAL PRIMARY KEY,
    prediction_id BIGINT REFERENCES predictions(id) ON DELETE CASCADE,
    coin_id VARCHAR(255) NOT NULL,
    model_id BIGINT NOT NULL,
    probability NUMERIC(5, 4) NOT NULL,
    threshold NUMERIC(5, 4) NOT NULL,
    alert_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 5.2 Batch-Insert

**Funktion:**
- Sammelt mehrere Vorhersagen
- Insert in Batch (effizienter)
- Transaction für Konsistenz

**Performance:**
- Batch-Größe: 50-100 Vorhersagen
- Max. Wartezeit: 2 Sekunden

---

### 6. Alert-System (Optional)

#### 6.1 Threshold-basierte Alerts

**Funktion:**
- Wenn `probability > threshold` → Alert erstellen
- Threshold konfigurierbar pro Modell
- Standard: 0.7 (70%)

**Konfiguration:**
```sql
ALTER TABLE ml_models ADD COLUMN alert_threshold NUMERIC(5, 4) DEFAULT 0.7;
```

#### 6.2 Alert-Kanäle

**Optionen:**
- Webhook (HTTP POST)
- n8n Integration
- Database (prediction_alerts Tabelle)
- Logging

**Empfehlung:** Start mit Database, später Webhook/n8n

---

## 🔌 API-Endpunkte

### 1. Modell-Verwaltung

#### `GET /api/models/active`
**Beschreibung:** Liste aller aktiven Modelle

**Response:**
```json
{
  "models": [
    {
      "id": 1,
      "name": "Finale",
      "model_type": "xgboost",
      "is_active": true,
      "alert_threshold": 0.7,
      "loaded": true,
      "last_prediction": "2025-12-24T12:00:00Z"
    }
  ]
}
```

#### `POST /api/models/{model_id}/activate`
**Beschreibung:** Modell aktivieren

**Response:**
```json
{
  "success": true,
  "message": "Modell aktiviert",
  "model_id": 1
}
```

#### `POST /api/models/{model_id}/deactivate`
**Beschreibung:** Modell deaktivieren

#### `POST /api/models/{model_id}/reload`
**Beschreibung:** Modell neu laden (z.B. nach Update)

### 2. Vorhersagen

#### `POST /api/predict`
**Beschreibung:** Manuelle Vorhersage für einen Coin

**Request:**
```json
{
  "coin_id": "ABC123...",
  "model_ids": [1, 2],  // Optional: Nur bestimmte Modelle
  "timestamp": "2025-12-24T12:00:00Z"  // Optional: Spezifischer Zeitpunkt
}
```

**Response:**
```json
{
  "coin_id": "ABC123...",
  "timestamp": "2025-12-24T12:00:00Z",
  "predictions": [
    {
      "model_id": 1,
      "model_name": "Finale",
      "prediction": 1,
      "probability": 0.85,
      "alert_triggered": true
    }
  ]
}
```

#### `GET /api/predictions`
**Beschreibung:** Liste aller Vorhersagen

**Query-Parameter:**
- `coin_id` (optional)
- `model_id` (optional)
- `min_probability` (optional)
- `limit` (optional, default: 100)
- `offset` (optional)

#### `GET /api/predictions/{prediction_id}`
**Beschreibung:** Details einer Vorhersage

#### `GET /api/predictions/latest/{coin_id}`
**Beschreibung:** Neueste Vorhersage für einen Coin

### 3. Status & Monitoring

#### `GET /api/health`
**Beschreibung:** Health Check

**Response:**
```json
{
  "status": "healthy",
  "active_models": 3,
  "predictions_last_hour": 150,
  "uptime_seconds": 3600,
  "db_connected": true
}
```

#### `GET /api/metrics`
**Beschreibung:** Prometheus Metriken

#### `GET /api/stats`
**Beschreibung:** Statistiken

**Response:**
```json
{
  "total_predictions": 10000,
  "predictions_last_hour": 150,
  "active_models": 3,
  "coins_tracked": 50,
  "avg_prediction_time_ms": 25
}
```

---

## 📊 Monitoring & Metriken

### Prometheus Metriken

#### Counter
- `ml_predictions_total` - Gesamtanzahl Vorhersagen
- `ml_predictions_by_model_total{model_id, model_name}` - Vorhersagen pro Modell
- `ml_alerts_triggered_total{model_id}` - Anzahl Alerts
- `ml_errors_total{type}` - Fehler (model_load, prediction, db)

#### Gauge
- `ml_active_models` - Anzahl aktiver Modelle
- `ml_models_loaded` - Anzahl geladener Modelle
- `ml_coins_tracked` - Anzahl getrackter Coins
- `ml_prediction_duration_seconds` - Dauer einer Vorhersage
- `ml_db_connected` - DB-Verbindungsstatus
- `ml_service_uptime_seconds` - Uptime

#### Histogram
- `ml_prediction_duration_seconds` - Verteilung der Vorhersage-Dauer
- `ml_feature_processing_duration_seconds` - Feature-Aufbereitung Dauer
- `ml_model_load_duration_seconds` - Modell-Lade-Dauer

---

## 🔄 Workflow-Beispiele

### Workflow 1: Neuer Eintrag in coin_metrics

```
1. Event Handler erkennt neuen Eintrag
   ↓
2. Für jeden aktiven Coin:
   a. Hole Historie (letzte 20 Einträge)
   b. Bereite Features auf (inkl. Feature-Engineering)
   c. Für jedes aktive Modell:
      - Lade Modell (aus Cache oder Datei)
      - Mache Vorhersage
      - Speichere Ergebnis
   ↓
3. Optional: Prüfe Alerts (wenn probability > threshold)
   ↓
4. Optional: Sende Webhook/Alert
```

### Workflow 2: Modell aktivieren

```
1. API Request: POST /api/models/1/activate
   ↓
2. Update ml_models: is_active = true
   ↓
3. Lade Modell-Datei (.pkl)
   ↓
4. Validiere Modell (Features, Parameter)
   ↓
5. Füge zu Cache hinzu
   ↓
6. Response: Erfolg
```

### Workflow 3: Batch-Verarbeitung

```
1. Sammle neue Einträge (max. 5 Sekunden oder 50 Coins)
   ↓
2. Gruppiere nach Coin
   ↓
3. Für jeden Coin parallel:
   - Hole Historie
   - Bereite Features auf
   - Mache Vorhersagen
   ↓
4. Batch-Insert in predictions Tabelle
   ↓
5. Prüfe Alerts für alle Vorhersagen
```

---

## 🗄️ Datenbank-Integration

### Beziehungen

```
ml_models (1) ──┐
                ├──> predictions (N)
                └──> prediction_alerts (N)
```

### Wichtige Queries

#### Aktive Modelle laden
```sql
SELECT id, name, model_type, model_file_path, features, params, 
       is_active, alert_threshold
FROM ml_models
WHERE is_active = true AND status = 'READY'
```

#### Historie für Coin holen
```sql
SELECT * FROM coin_metrics
WHERE mint = $coin_id
ORDER BY timestamp DESC
LIMIT 20
```

#### Neueste Vorhersage für Coin
```sql
SELECT p.*, m.name as model_name
FROM predictions p
JOIN ml_models m ON p.model_id = m.id
WHERE p.coin_id = $coin_id
ORDER BY p.timestamp DESC
LIMIT 1
```

---

## ⚙️ Konfiguration

### Umgebungsvariablen

```bash
# Datenbank
DB_HOST=100.76.209.59
DB_PORT=5432
DB_NAME=crypto
DB_USER=postgres
DB_PASSWORD=...

# Modell-Storage
MODEL_STORAGE_PATH=/app/models  # Pfad zu .pkl Dateien

# Event-Handling
POLLING_INTERVAL_SECONDS=30
BATCH_SIZE=50
BATCH_TIMEOUT_SECONDS=5

# Feature-Engineering
FEATURE_HISTORY_SIZE=20  # Anzahl Einträge für Historie

# Performance
MAX_CONCURRENT_PREDICTIONS=10
MODEL_CACHE_SIZE=10

# Alerts
DEFAULT_ALERT_THRESHOLD=0.7
ALERT_WEBHOOK_URL=  # Optional

# Monitoring
METRICS_PORT=8000
HEALTH_CHECK_INTERVAL=10
```

---

## 🧪 Testing-Strategie

### Unit Tests
- Feature-Aufbereitung
- Modell-Laden
- Vorhersage-Logik

### Integration Tests
- DB-Verbindung
- Modell-Laden aus DB
- Vorhersage-Speicherung

### End-to-End Tests
- Kompletter Workflow: Neuer Eintrag → Vorhersage → Speicherung
- Multi-Modell-Vorhersagen
- Alert-System

### Performance Tests
- Batch-Verarbeitung
- Concurrent Predictions
- Modell-Caching

---

## 🚀 Deployment

### Docker

**Dockerfile:**
- Python 3.11-slim
- FastAPI, asyncpg, scikit-learn, xgboost
- Prometheus Client
- Health Checks

**docker-compose.yml:**
- Service: ml-prediction-service
- Port: 8000 (API), 8001 (Metrics)
- Volumes: models/ (Shared mit Training Service?)
- Environment Variables

### Coolify

**Deployment:**
- Ähnlich wie ML Training Service
- Docker Compose oder Dockerfile
- Environment Variables setzen
- Health Checks konfigurieren

---

## 📈 Erweiterungen (Später)

### Phase 2: Ensemble-Vorhersagen
- Kombiniert mehrere Modelle
- Gewichtete Durchschnitte
- Voting-Mechanismus

### Phase 3: Real-time WebSocket
- WebSocket für Live-Updates
- Push-Vorhersagen an Clients
- Live-Dashboard

### Phase 4: Modell-Auto-Selection
- Automatisch bestes Modell wählen
- Performance-Tracking
- Auto-Switching bei besserem Modell

### Phase 5: Advanced Alerts
- Mehrere Alert-Kanäle
- Alert-Rules (z.B. "nur wenn 2 Modelle zustimmen")
- Alert-History

---

## 🔗 Integration mit bestehenden Services

### ML Training Service
- **Modell-Quelle:** Lädt Modelle aus `ml_models` Tabelle
- **Modell-Dateien:** Shared Storage oder separate Pfade
- **Feature-Engineering:** Gleiche Logik (Code-Wiederverwendung)

### Pump Metrics Service
- **Daten-Quelle:** Liest aus `coin_metrics` Tabelle
- **Event-Trigger:** Reagiert auf neue Einträge
- **Monitoring:** Ähnliche Prometheus Metriken

### n8n
- **API:** REST API für n8n Workflows
- **Webhooks:** Für Alerts
- **Integration:** Vollständig kompatibel

---

## ⚠️ Wichtige Überlegungen

### 1. Code-Wiederverwendung

**Feature-Engineering:**
- Gleiche Logik wie Training Service
- Optionen: Shared Library, Import, Duplikation
- **Empfehlung:** Import für Start, später Shared Library

### 2. Modell-Storage

**Optionen:**
- Shared Storage (NFS, S3)
- Training Service kopiert zu Prediction Service
- Beide Services haben Zugriff auf gleichen Pfad

**Empfehlung:** Shared Storage (z.B. Volume in Docker)

### 3. Performance

**Bottlenecks:**
- Modell-Laden (gelöst durch Caching)
- Feature-Engineering (kann langsam sein)
- DB-Queries (gelöst durch Batch-Processing)

**Optimierungen:**
- Modell-Caching
- Batch-Processing
- Parallel-Verarbeitung
- Connection Pooling

### 4. Skalierung

**Horizontal:**
- Mehrere Instanzen möglich
- Jede Instanz verarbeitet verschiedene Coins
- Oder: Load Balancing

**Vertical:**
- Mehr RAM für mehr Modelle
- Mehr CPU für schnellere Verarbeitung

### 5. Fehlerbehandlung

**Strategien:**
- Retry bei DB-Fehlern
- Fallback bei Modell-Lade-Fehlern
- Logging aller Fehler
- Prometheus Metriken für Fehler

---

## 📝 Nächste Schritte

### Phase 1: MVP (Minimal Viable Product)

1. ✅ Projekt-Struktur erstellen
2. ✅ Datenbank-Schema erweitern (`is_active`, `predictions` Tabelle)
3. ✅ Basis-API (Health, Models, Predict)
4. ✅ Event-Handler (Polling)
5. ✅ Feature-Aufbereitung (Import aus Training Service)
6. ✅ Modell-Laden und Caching
7. ✅ Vorhersage-Engine
8. ✅ Ergebnis-Speicherung

### Phase 2: Erweiterungen

1. ✅ Alert-System
2. ✅ Batch-Verarbeitung optimieren
3. ✅ Multi-Modell-Vorhersagen
4. ✅ Performance-Optimierungen

### Phase 3: Production-Ready

1. ✅ Umfassende Tests
2. ✅ Monitoring & Alerting
3. ✅ Dokumentation
4. ✅ Deployment-Automation

---

## 🎯 Erfolgs-Kriterien

### Funktionale Anforderungen
- ✅ Erkennt neue Einträge in `coin_metrics`
- ✅ Lädt aktive Modelle automatisch
- ✅ Macht Vorhersagen für alle aktiven Coins
- ✅ Speichert Ergebnisse korrekt
- ✅ API funktioniert mit n8n

### Performance-Anforderungen
- ✅ < 1 Sekunde pro Vorhersage (inkl. Feature-Aufbereitung)
- ✅ Unterstützt 10+ aktive Modelle gleichzeitig
- ✅ Verarbeitet 100+ Coins pro Minute

### Qualitäts-Anforderungen
- ✅ 99.9% Uptime
- ✅ Fehlerbehandlung robust
- ✅ Logging umfassend
- ✅ Monitoring vollständig

---

## 📚 Dokumentation

### Erforderliche Dokumentationen

1. **README.md** - Projekt-Übersicht
2. **API_DOKUMENTATION.md** - API-Referenz
3. **DEPLOYMENT.md** - Deployment-Anleitung
4. **ARCHITECTURE.md** - Architektur-Details
5. **TESTING.md** - Testing-Strategie

---

**Status:** 📋 Planungsphase abgeschlossen  
**Nächster Schritt:** Implementierung starten

---

*Dieser Plan dient als Grundlage für die Implementierung. Alle Details sollten vor dem Start noch einmal durchgesprochen werden.*

