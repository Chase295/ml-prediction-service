# 🚀 ML Prediction Service - Schritt-für-Schritt Aufbau-Anleitung

**Von 0% bis 100% - Docker-basierte Implementierung**

---

## 📋 Übersicht

Diese Anleitung führt dich durch den kompletten Aufbau des ML Prediction Services **mit Docker**. Jeder Schritt baut auf dem vorherigen auf. Folge der Reihenfolge!

**🐳 Docker-First Approach:**
- Alle Komponenten laufen in Docker-Containern
- Lokale Entwicklung mit Docker
- Deployment mit Docker/Coolify
- Volumes für persistente Daten (Modelle)

**Geschätzter Gesamtaufwand:** 35-50 Stunden (1-2 Wochen Vollzeit oder 3-4 Wochen Teilzeit)

**🤖 Modell-Typen:**
- **Nur Random Forest und XGBoost werden unterstützt!**
- Beide nutzen die gleiche Scikit-learn API
- Funktioniert für klassische UND zeitbasierte Vorhersagen

---

## 🐳 Docker Quick Start (Übersicht)

**Alle Schritte werden in Docker ausgeführt:**
- Entwicklung: Code lokal schreiben, in Docker testen
- Testing: Docker Container lokal bauen und testen
- Deployment: Docker Image in Coolify deployen

**⚠️ WICHTIG: Datenbank ist EXTERN!**
- Die PostgreSQL-Datenbank läuft **nicht im Docker-Container**
- Der Container verbindet sich über Netzwerk zur externen DB
- `DB_DSN` muss die externe DB-Adresse enthalten (IP oder Hostname)

**⚠️ WICHTIG: Modell-Dateien müssen verfügbar sein!**
- Modell-Dateien (`.pkl`) müssen vom Training Service erstellt worden sein
- Shared Storage oder Volume-Mapping nötig
- `MODEL_STORAGE_PATH` muss auf Modell-Verzeichnis zeigen

**Docker-Kommandos die du brauchst:**
```bash
# Image bauen
docker build -t ml-prediction-service .

# Container starten
# ⚠️ DB_DSN muss EXTERNE DB-Adresse enthalten!
# ⚠️ MODEL_STORAGE_PATH muss auf Modell-Verzeichnis zeigen!
docker run -p 8000:8000 \
  -e DB_DSN="postgresql://user:pass@EXTERNE_DB_HOST:5432/crypto" \
  -e MODEL_STORAGE_PATH="/app/models" \
  -v /path/to/models:/app/models \
  ml-prediction-service

# Beispiel:
# -e DB_DSN="postgresql://postgres:password@100.76.209.59:5432/crypto"
# -v /shared/models:/app/models

# Oder mit Docker Compose
docker-compose up -d
```

**Wichtig:** 
- Environment Variables werden beim `docker run` gesetzt
- Health Check läuft automatisch im Container
- **Datenbank ist EXTERN** (nicht im Container) - DB_DSN muss externe Adresse enthalten
- **Modell-Dateien** müssen verfügbar sein (Volume oder Shared Storage)

---

## 🎯 Phase 1: Grundlagen & Datenbank (Schritte 1-3)

### **Schritt 1: Projektstruktur erstellen (Docker-ready)**

**Was zu tun ist:**
1. Erstelle die Verzeichnisstruktur im `ml-prediction-service/` Ordner
2. Erstelle alle benötigten Ordner und Platzhalter-Dateien
3. Bereite Docker-spezifische Dateien vor

**Vorgehen:**
```bash
cd ml-prediction-service
mkdir -p app/api app/database app/prediction app/utils docs tests sql
touch app/__init__.py
touch app/api/__init__.py
touch app/database/__init__.py
touch app/prediction/__init__.py
touch app/utils/__init__.py
touch .dockerignore
touch docker-compose.yml  # Optional für lokales Testing
```

**Docker-spezifische Vorbereitung:**
- Erstelle `.dockerignore`:
  ```
  __pycache__
  *.pyc
  *.pyo
  *.pyd
  .git
  .gitignore
  .env
  *.log
  tests/
  docs/
  ```

**Ergebnis:** Du hast die komplette Ordnerstruktur angelegt, Docker-ready.

---

### **Schritt 2: Datenbank-Schema erstellen (Separate Tabellen)**

**⚠️ WICHTIG - Getrennte Tabellen-Struktur:**
- **KEIN `is_active` in `ml_models`!** (separater Server)
- Separate Tabelle: `prediction_active_models` (lokal im Prediction Service)
- Modell-Download und lokale Speicherung
- LISTEN/NOTIFY Trigger für Echtzeit-Kommunikation

**Was zu tun ist:**
1. Verbinde dich mit deiner **externen PostgreSQL-Datenbank**
2. Führe das `schema.sql` Script aus
3. Prüfe, ob alle Tabellen erstellt wurden

**⚠️ Wichtig: Die Datenbank läuft EXTERN (nicht im Docker-Container)!**

**Vorgehen:**
Erstelle `sql/schema.sql`:
```sql
-- ============================================================
-- ML Prediction Service - Datenbank-Schema
-- Version: 1.0
-- SEPARATE Tabellen-Struktur (keine Änderungen an ml_models!)
-- ============================================================

-- 1. Erstelle prediction_active_models Tabelle
-- Speichert welche Modelle im Prediction Service aktiv sind
CREATE TABLE IF NOT EXISTS prediction_active_models (
    id BIGSERIAL PRIMARY KEY,
    model_id BIGINT NOT NULL,  -- Referenz zu ml_models.id (kein FK, da separater Server)
    model_name VARCHAR(255) NOT NULL,
    model_type VARCHAR(50) NOT NULL,
    
    -- Modell-Metadaten (Kopie aus ml_models für schnellen Zugriff)
    target_variable VARCHAR(100) NOT NULL,
    target_operator VARCHAR(10),
    target_value NUMERIC(20, 2),
    future_minutes INTEGER,
    price_change_percent NUMERIC(10, 4),
    target_direction VARCHAR(10),
    
    -- Features und Konfiguration (JSONB)
    features JSONB NOT NULL,
    phases JSONB,
    params JSONB,
    
    -- Modell-Datei (lokal gespeichert)
    local_model_path TEXT NOT NULL,  -- Pfad zur lokalen .pkl Datei
    model_file_url TEXT,  -- URL zum Download (optional, falls nötig)
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    last_prediction_at TIMESTAMP WITH TIME ZONE,
    total_predictions BIGINT DEFAULT 0,
    
    -- Metadaten
    downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    activated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_model_type CHECK (model_type IN ('random_forest', 'xgboost')),
    CONSTRAINT chk_operator CHECK (target_operator IS NULL OR target_operator IN ('>', '<', '>=', '<=', '=')),
    CONSTRAINT chk_direction CHECK (target_direction IS NULL OR target_direction IN ('up', 'down')),
    
    -- Unique: Ein Modell kann nur einmal aktiv sein
    UNIQUE(model_id)
);

-- Indizes
CREATE INDEX IF NOT EXISTS idx_active_models_active 
ON prediction_active_models(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_active_models_model_id 
ON prediction_active_models(model_id);

-- 2. Erstelle predictions Tabelle
CREATE TABLE IF NOT EXISTS predictions (
    id BIGSERIAL PRIMARY KEY,
    coin_id VARCHAR(255) NOT NULL,
    data_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,  -- Zeitstempel der Daten
    model_id BIGINT NOT NULL,  -- Referenz zu ml_models.id (kein FK)
    active_model_id BIGINT REFERENCES prediction_active_models(id) ON DELETE SET NULL,
    
    -- Vorhersage
    prediction INTEGER NOT NULL CHECK (prediction IN (0, 1)),
    probability NUMERIC(5, 4) NOT NULL CHECK (probability >= 0.0 AND probability <= 1.0),
    
    -- Phase zum Zeitpunkt der Vorhersage
    phase_id_at_time INTEGER,
    
    -- Features (optional, für Debugging)
    features JSONB,
    
    -- Performance
    prediction_duration_ms INTEGER,
    
    -- Metadaten
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indizes für Performance
CREATE INDEX IF NOT EXISTS idx_predictions_coin_timestamp 
ON predictions(coin_id, data_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_predictions_model 
ON predictions(model_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_predictions_active_model 
ON predictions(active_model_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_predictions_created 
ON predictions(created_at DESC);

-- 3. Erstelle LISTEN/NOTIFY Trigger für coin_metrics
-- Trigger-Funktion
CREATE OR REPLACE FUNCTION notify_coin_metrics_insert()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify(
        'coin_metrics_insert',
        json_build_object(
            'mint', NEW.mint,
            'timestamp', NEW.timestamp,
            'phase_id', NEW.phase_id_at_time
        )::text
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger erstellen (nur wenn noch nicht existiert)
DROP TRIGGER IF EXISTS coin_metrics_insert_trigger ON coin_metrics;
CREATE TRIGGER coin_metrics_insert_trigger
    AFTER INSERT ON coin_metrics
    FOR EACH ROW
    EXECUTE FUNCTION notify_coin_metrics_insert();

-- 4. Erstelle prediction_webhook_log Tabelle (optional, für Debugging)
CREATE TABLE IF NOT EXISTS prediction_webhook_log (
    id BIGSERIAL PRIMARY KEY,
    coin_id VARCHAR(255) NOT NULL,
    data_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    webhook_url TEXT NOT NULL,
    payload JSONB NOT NULL,
    response_status INTEGER,
    response_body TEXT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_log_created 
ON prediction_webhook_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_log_status 
ON prediction_webhook_log(response_status) WHERE response_status IS NOT NULL;
```

Dann ausführen:
```bash
# Option 1: Via psql direkt (empfohlen für externe DB)
psql -h <EXTERNE_DB_HOST> -p <PORT> -U <DB_USER> -d crypto -f sql/schema.sql

# Beispiel:
psql -h 100.76.209.59 -p 5432 -U postgres -d crypto -f sql/schema.sql

# Option 2: Via Docker run (temporärer psql Container)
docker run --rm -i \
  -v $(pwd)/sql/schema.sql:/schema.sql \
  postgres:15 \
  psql -h <EXTERNE_DB_HOST> -p <PORT> -U <DB_USER> -d crypto -f /schema.sql
```

**Prüfung:**
```bash
# Direkt via psql
psql -h <EXTERNE_DB_HOST> -p <PORT> -U <DB_USER> -d crypto -c "
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('prediction_active_models', 'predictions', 'prediction_webhook_log');
"

# Prüfe ob Trigger erstellt wurde
psql -h <EXTERNE_DB_HOST> -p <PORT> -U <DB_USER> -d crypto -c "
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'coin_metrics_insert_trigger';
"
```

**Ergebnis:** Externe Datenbank ist bereit mit separaten Tabellen und LISTEN/NOTIFY Trigger.

---

### **Schritt 3: Requirements.txt erstellen**

**Was zu tun ist:**
1. Erstelle `requirements.txt` mit allen benötigten Python-Paketen
2. Nutze die Versionen aus dem Training Service (Konsistenz!)

**Vorgehen:**
Erstelle `ml-prediction-service/requirements.txt` mit folgendem Inhalt:
```
# Core
fastapi==0.104.1
uvicorn[standard]==0.24.0
asyncpg==0.29.0
pydantic==2.5.0

# ML (gleiche Versionen wie Training Service!)
scikit-learn==1.3.2
xgboost==2.0.2
pandas==2.1.3
numpy==1.26.2
joblib==1.3.2

# Utilities
prometheus-client==0.19.0
python-dateutil==2.8.2
aiohttp==3.9.1  # Für n8n Webhooks
streamlit==1.28.0  # Für Web UI
plotly==5.18.0  # Für Charts in Streamlit
```

**Ergebnis:** Alle Dependencies sind definiert.

---

## 🏗️ Phase 2: Core-Komponenten (Schritte 4-7)

### **Schritt 4: Konfiguration & Environment (Docker + Externe DB)**

**Was zu tun ist:**
1. Erstelle `app/utils/config.py` für zentrale Konfiguration
2. Lese Environment Variables (DB_DSN, Ports, etc.) - **wichtig für Docker**
3. Definiere Default-Werte
4. Erstelle `.env.example` für Docker

**Vorgehen:**
- Erstelle `app/utils/config.py`:
  ```python
  import os
  
  # Datenbank (EXTERNE DB!)
  DB_DSN = os.getenv("DB_DSN", "postgresql://user:pass@localhost:5432/crypto")
  
  # Ports
  API_PORT = int(os.getenv("API_PORT", "8000"))
  
# Modell-Storage (lokal im Container)
MODEL_STORAGE_PATH = os.getenv("MODEL_STORAGE_PATH", "/app/models")

# Training Service API (für Modell-Download)
TRAINING_SERVICE_API_URL = os.getenv("TRAINING_SERVICE_API_URL", "http://localhost:8000/api")
  
  # Event-Handling
  POLLING_INTERVAL_SECONDS = int(os.getenv("POLLING_INTERVAL_SECONDS", "30"))
  BATCH_SIZE = int(os.getenv("BATCH_SIZE", "50"))
  BATCH_TIMEOUT_SECONDS = int(os.getenv("BATCH_TIMEOUT_SECONDS", "5"))
  
  # Feature-Engineering
  FEATURE_HISTORY_SIZE = int(os.getenv("FEATURE_HISTORY_SIZE", "20"))
  
  # Performance
  MAX_CONCURRENT_PREDICTIONS = int(os.getenv("MAX_CONCURRENT_PREDICTIONS", "10"))
  MODEL_CACHE_SIZE = int(os.getenv("MODEL_CACHE_SIZE", "10"))
  
  # Alerts
  DEFAULT_ALERT_THRESHOLD = float(os.getenv("DEFAULT_ALERT_THRESHOLD", "0.7"))
  ALERT_WEBHOOK_URL = os.getenv("ALERT_WEBHOOK_URL", None)  # Optional
  ```
- Erstelle `.env.example`:
  ```
  # EXTERNE Datenbank (nicht im Container!)
  DB_DSN=postgresql://user:pass@EXTERNE_DB_HOST:5432/crypto
  # Beispiel: DB_DSN=postgresql://postgres:password@100.76.209.59:5432/crypto
  
  API_PORT=8000
  MODEL_STORAGE_PATH=/app/models
  
  # Event-Handling
  POLLING_INTERVAL_SECONDS=30
  BATCH_SIZE=50
  BATCH_TIMEOUT_SECONDS=5
  
  # Feature-Engineering
  FEATURE_HISTORY_SIZE=20
  
  # Performance
  MAX_CONCURRENT_PREDICTIONS=10
  MODEL_CACHE_SIZE=10
  
  # Alerts
  DEFAULT_ALERT_THRESHOLD=0.7
  ```

**⚠️ Wichtig - Externe Datenbank:**
- `DB_DSN` muss die **externe DB-Adresse** enthalten (IP oder Hostname)
- Der Docker-Container muss **Netzwerk-Zugriff** zur externen DB haben
- Keine Docker-Network-Konfiguration nötig (DB ist extern)
- Firewall/Netzwerk: Stelle sicher, dass Container → Externe DB erreichbar ist

**⚠️ Wichtig - Modell-Storage:**
- `MODEL_STORAGE_PATH` muss auf Verzeichnis mit Modell-Dateien zeigen
- Modell-Dateien müssen vom Training Service erstellt worden sein
- Shared Storage oder Volume-Mapping nötig

**Docker-spezifisch:**
- Environment Variables werden beim `docker run` oder in `docker-compose.yml` gesetzt
- `MODEL_STORAGE_PATH` muss auf ein Volume gemappt werden (`-v host/models:/app/models`)

**Ergebnis:** Zentrale Konfiguration ist vorhanden, Docker-ready mit externer DB.

---

### **Schritt 5: Datenbank-Verbindung (Externe DB)**

**Was zu tun ist:**
1. Erstelle `app/database/connection.py`
2. Implementiere Connection Pool mit asyncpg (wie in Training Service)
3. Verbinde zur **externen Datenbank** (nicht lokal!)
4. Erstelle Helper-Funktionen für Queries

**Vorgehen:**
- Nutze `asyncpg.create_pool()` (min_size=1, max_size=10)
- **DB_DSN aus Environment Variable lesen** (enthält externe DB-Adresse)
- Implementiere `get_pool()` Funktion
- Implementiere `close_pool()` für graceful shutdown
- Nutze Retry-Logik bei Verbindungsfehlern

**Beispiel-Code:**
```python
import asyncpg
import os
from app.utils.config import DB_DSN

pool = None

async def get_pool():
    global pool
    if pool is None:
        # DB_DSN enthält externe DB-Adresse, z.B.:
        # postgresql://user:pass@100.76.209.59:5432/crypto
        pool = await asyncpg.create_pool(
            DB_DSN,
            min_size=1,
            max_size=10
        )
    return pool

async def close_pool():
    global pool
    if pool:
        await pool.close()
        pool = None
```

**⚠️ Netzwerk-Anforderungen:**
- Docker-Container muss **ausgehenden Netzwerk-Zugriff** haben
- Externe DB muss **von Container aus erreichbar** sein (Firewall, Netzwerk)
- Port 5432 (PostgreSQL) muss erreichbar sein

**Ergebnis:** Datenbank-Verbindung zur externen DB funktioniert.

**🧪 Test-Schritt:**
```python
# Erstelle test_db_connection.py zum Testen:
import asyncio
from app.database.connection import get_pool

async def test():
    pool = await get_pool()
    result = await pool.fetchval("SELECT 1")
    print(f"✅ DB-Verbindung funktioniert: {result}")
    await pool.close()

asyncio.run(test())
```
Führe aus: `docker exec -it <container> python test_db_connection.py`

---

### **Schritt 6: Datenbank-Modelle (SQL Queries) - SEPARATE Tabellen**

**⚠️ WICHTIG: Getrennte Tabellen-Struktur!**
- **KEIN `is_active` in `ml_models`!** (separater Server)
- Nutze `prediction_active_models` Tabelle (lokal im Prediction Service)
- Modell-Download und lokale Speicherung

**Was zu tun ist:**
1. Erstelle `app/database/models.py`
2. Definiere SQL-Queries für alle CRUD-Operationen
3. Funktionen für: `prediction_active_models`, `predictions`, `ml_models` (nur lesen!)

**Vorgehen:**
- Erstelle Funktionen wie:
  - **`get_available_models()`** → Holt alle verfügbaren Modelle aus `ml_models` (READY, nicht gelöscht)
    - Filter: `status = 'READY' AND is_deleted = false`
    - Gibt Liste von Modellen zurück (für Import)
  - **`get_model_from_training_service(model_id)`** → Holt Modell-Metadaten aus `ml_models`
    - **WICHTIG:** Nur lesen, keine Änderungen!
  - **`download_model_file(model_id)`** → Lädt Modell-Datei vom Training Service
    - API-Call: `GET /api/models/{id}/download`
    - Speichert lokal in `MODEL_STORAGE_PATH`
  - **`import_model(model_id)`** → Importiert Modell in `prediction_active_models`
    - 1. Hole Metadaten aus `ml_models`
    - 2. Lade Modell-Datei (Download)
    - 3. Speichere in `prediction_active_models`
    - 4. Setze `is_active = true`
  - **`get_active_models()`** → Holt alle aktiven Modelle aus `prediction_active_models`
    - Filter: `is_active = true`
    - Gibt Liste von Modell-Konfigurationen zurück
  - **`activate_model(active_model_id)`** → Setzt `is_active = true` in `prediction_active_models`
  - **`deactivate_model(active_model_id)`** → Setzt `is_active = false` in `prediction_active_models`
  - **`delete_active_model(active_model_id)`** → Löscht Modell aus `prediction_active_models` + lokale Datei
  - **`save_prediction()`** → Erstellt Eintrag in `predictions`
  - **`get_predictions()`** → Holt Vorhersagen (mit Filtern)
  - **`get_latest_prediction(coin_id)`** → Neueste Vorhersage für Coin
- Nutze Prepared Statements mit `$1, $2, ...` (asyncpg)
- **⚠️ WICHTIG: JSONB statt CSV-Strings!**
  - **PostgreSQL JSONB:** asyncpg konvertiert automatisch Python-Listen/Dicts zu JSONB
  - **Beim Schreiben:** Direkt Python-Objekte übergeben (keine Serialisierung nötig!)
    ```python
    # asyncpg konvertiert automatisch:
    await pool.execute(
        "INSERT INTO predictions (coin_id, model_id, prediction, probability, features) VALUES ($1, $2, $3, $4, $5)",
        coin_id,
        model_id,
        prediction,
        probability,
        features_dict  # Dict → JSONB Object
    )
    ```
  - **Beim Lesen:** asyncpg konvertiert automatisch zurück zu Python-Objekten
    ```python
    row = await pool.fetchrow("SELECT features FROM predictions WHERE id = $1", prediction_id)
    features = row["features"]  # JSONB Object → Python Dict
    ```

**Wichtig - Modell-Konfiguration laden:**
```python
async def get_active_models() -> List[Dict]:
    """Lade alle aktiven Modelle mit vollständiger Konfiguration"""
    pool = await get_pool()
    rows = await pool.fetch("""
        SELECT 
            id, name, model_type, model_file_path,
            target_variable, target_operator, target_value,
            future_minutes, price_change_percent, target_direction,
            features, phases, params,
            is_active, alert_threshold
        FROM ml_models
        WHERE is_active = true AND status = 'READY' AND is_deleted = false
    """)
    
    models = []
    for row in rows:
        # asyncpg konvertiert JSONB automatisch
        models.append({
            'id': row['id'],
            'name': row['name'],
            'model_type': row['model_type'],
            'model_file_path': row['model_file_path'],
            'target_variable': row['target_variable'],
            'target_operator': row['target_operator'],
            'target_value': float(row['target_value']) if row['target_value'] else None,
            'future_minutes': row['future_minutes'],
            'price_change_percent': float(row['price_change_percent']) if row['price_change_percent'] else None,
            'target_direction': row['target_direction'],
            'features': row['features'],  # JSONB Array → Python List
            'phases': row['phases'],  # JSONB Array → Python List
            'params': row['params'],  # JSONB Object → Python Dict
            'is_active': row['is_active'],
            'alert_threshold': float(row['alert_threshold']) if row['alert_threshold'] else 0.7
        })
    
    return models
```

**Ergebnis:** Alle Datenbank-Operationen sind verfügbar.

**🧪 Test-Schritt:**
- Teste jede Funktion einzeln:
  - Lade aktive Modelle: `get_active_models()` → Prüfe Rückgabe
  - Aktiviere Modell: `activate_model()` → Prüfe in DB
  - Speichere Vorhersage: `save_prediction()` → Prüfe in DB

---

### **Schritt 7: Prometheus Metrics & Health Status**

**Was zu tun ist:**
1. Erstelle `app/utils/metrics.py`
2. Definiere alle Prometheus Metrics
3. Erstelle Health Status Tracking
4. Nutze Counter, Gauge, Histogram wie in Training Service

**Vorgehen:**
- Metrics für:
  - `ml_predictions_total` (Counter, labels: model_id, model_name)
  - `ml_predictions_by_model_total{model_id, model_name}` (Counter)
  - `ml_alerts_triggered_total{model_id}` (Counter)
  - `ml_errors_total{type}` (Counter) - Fehler (model_load, prediction, db)
  - `ml_active_models` (Gauge) - Anzahl aktiver Modelle
  - `ml_models_loaded` (Gauge) - Anzahl geladener Modelle
  - `ml_coins_tracked` (Gauge) - Anzahl getrackter Coins
  - `ml_prediction_duration_seconds` (Histogram) - Dauer einer Vorhersage
  - `ml_feature_processing_duration_seconds` (Histogram) - Feature-Aufbereitung Dauer
  - `ml_model_load_duration_seconds` (Histogram) - Modell-Lade-Dauer
  - `ml_db_connected` (Gauge) - DB-Verbindungsstatus (1=connected, 0=disconnected)
  - `ml_service_uptime_seconds` (Gauge) - Uptime des Services
- Health Status Dictionary:
  - `db_connected`: Boolean
  - `active_models`: Integer
  - `predictions_last_hour`: Integer
  - `last_error`: String oder None
  - `start_time`: Timestamp
- Funktion `get_health_status()`:
  - Prüft DB-Verbindung
  - Zählt aktive Modelle
  - Zählt Vorhersagen letzte Stunde
  - Gibt Status-Dict zurück: `{"status": "healthy"/"degraded", "db_connected": bool, ...}`
- Funktion `generate_metrics()`:
  - Nutze `prometheus_client.generate_latest()`
  - Gibt Metrics als String zurück

**Ergebnis:** Metrics-System und Health Tracking sind vorbereitet.

**💡 Wichtig - Health & Metrics Format:**
- Health Endpoint muss JSON zurückgeben (wie in Training Service)
- Metrics Endpoint muss `text/plain; version=0.0.4; charset=utf-8` als Content-Type haben
- Beide Endpoints müssen auf Port 8000 laufen
- Health Status sollte DB-Verbindung, aktive Modelle, Vorhersagen und letzte Fehler tracken

---

## 🤖 Phase 3: Prediction Engine (Schritte 8-11)

### **Schritt 8: Feature-Engineering (Code-Wiederverwendung)**

**Was zu tun ist:**
1. Erstelle `app/prediction/feature_processor.py`
2. Implementiere Feature-Aufbereitung (gleiche Logik wie Training Service)
3. **Option 1:** Import aus Training Service (wenn möglich)
4. **Option 2:** Code-Duplikation (einfacher, aber Wartung)

**⚠️ WICHTIG: Gleiche Logik wie Training Service!**
- Feature-Engineering muss IDENTISCH sein
- Gleiche `window_sizes` verwenden
- Features in GLEICHER Reihenfolge

**Vorgehen - Option 1: Import (Empfohlen):**
```python
# app/prediction/feature_processor.py
import sys
import os

# Versuche Feature-Engineering aus Training Service zu importieren
try:
    # Wenn Training Service im gleichen Repo oder als Package installiert
    from ml_training_service.app.training.feature_engineering import (
        create_pump_detection_features,
        get_engineered_feature_names
    )
    USE_TRAINING_SERVICE_IMPORT = True
except ImportError:
    # Fallback: Eigene Implementierung (Code-Duplikation)
    USE_TRAINING_SERVICE_IMPORT = False
    # Implementiere create_pump_detection_features() hier
    # (Kopiere Code aus Training Service)
```

**Vorgehen - Option 2: Code-Duplikation:**
- Kopiere `create_pump_detection_features()` aus Training Service
- Stelle sicher, dass Logik IDENTISCH ist
- Dokumentiere Code-Wiederverwendung

**Funktion `prepare_features()`:**
```python
async def prepare_features(
    coin_id: str,
    model_config: Dict,
    pool: asyncpg.Pool
) -> pd.DataFrame:
    """
    Bereitet Features für einen Coin auf.
    GLEICHE Logik wie beim Training!
    """
    # 1. Hole Historie
    history = await get_coin_history(
        coin_id=coin_id,
        limit=FEATURE_HISTORY_SIZE,
        phases=model_config.get('phases'),
        pool=pool
    )
    
    # 2. Feature-Engineering (wenn aktiviert)
    params = model_config.get('params') or {}
    use_engineered_features = params.get('use_engineered_features', False)
    
    if use_engineered_features:
        window_sizes = params.get('feature_engineering_windows', [5, 10, 15])
        history = create_pump_detection_features(
            history,
            window_sizes=window_sizes
        )
    
    # 3. Features auswählen (in korrekter Reihenfolge!)
    features = model_config['features'].copy()
    
    # Bei zeitbasierter Vorhersage: target_variable entfernen
    if model_config.get('target_operator') is None:
        features = [f for f in features if f != model_config['target_variable']]
    
    # 4. Validierung
    missing = [f for f in features if f not in history.columns]
    if missing:
        raise ValueError(f"Features fehlen: {missing}")
    
    # 5. Reihenfolge prüfen
    if list(history[features].columns) != features:
        raise ValueError("Feature-Reihenfolge stimmt nicht!")
    
    return history[features]
```

**Funktion `get_coin_history()`:**
```python
async def get_coin_history(
    coin_id: str,
    limit: int,
    phases: Optional[List[int]],
    pool: asyncpg.Pool
) -> pd.DataFrame:
    """Holt Historie für einen Coin"""
    if phases:
        query = """
            SELECT * FROM coin_metrics
            WHERE mint = $1 AND phase_id_at_time = ANY($2::int[])
            ORDER BY timestamp DESC
            LIMIT $3
        """
        rows = await pool.fetch(query, coin_id, phases, limit)
    else:
        query = """
            SELECT * FROM coin_metrics
            WHERE mint = $1
            ORDER BY timestamp DESC
            LIMIT $2
        """
        rows = await pool.fetch(query, coin_id, limit)
    
    if not rows:
        raise ValueError(f"Keine Historie für Coin {coin_id}")
    
    df = pd.DataFrame(rows)
    # Umkehren für chronologische Reihenfolge (älteste zuerst)
    return df.sort_values('timestamp').reset_index(drop=True)
```

**Ergebnis:** Feature-Aufbereitung funktioniert identisch wie Training Service.

**🧪 Test-Schritt:**
```python
# Teste Feature-Aufbereitung:
from app.prediction.feature_processor import prepare_features
from app.database.connection import get_pool
from app.database.models import get_active_models

# Test mit aktivem Modell
pool = await get_pool()
models = await get_active_models()
if models:
    model = models[0]
    features = await prepare_features("ABC123...", model, pool)
    print(f"✅ Features aufbereitet: {len(features)} Zeilen, {len(features.columns)} Features")
```

---

### **Schritt 9: Modell-Manager (Laden & Caching)**

**Was zu tun ist:**
1. Erstelle `app/prediction/model_manager.py`
2. Implementiere Modell-Laden aus Dateisystem
3. Implementiere LRU Cache für Modelle
4. Implementiere Modell-Validierung

**Vorgehen:**
- Funktion `load_model()`:
  ```python
  import joblib
  from functools import lru_cache
  from app.utils.config import MODEL_STORAGE_PATH
  
  # LRU Cache für Modelle (max. 10 Modelle)
  @lru_cache(maxsize=MODEL_CACHE_SIZE)
  def load_model(model_file_path: str):
      """Lädt Modell aus Datei (mit Caching)"""
      if not os.path.exists(model_file_path):
          raise FileNotFoundError(f"Modell-Datei nicht gefunden: {model_file_path}")
      
      model = joblib.load(model_file_path)
      
      # Validierung: Modell-Typ prüfen
      model_type = type(model).__name__
      if 'RandomForest' not in model_type and 'XGB' not in model_type:
          raise ValueError(f"Unbekannter Modell-Typ: {model_type}")
      
      return model
  ```

- Funktion `get_model()` (mit Cache):
  ```python
  def get_model(model_config: Dict):
      """Holt Modell (aus Cache oder Datei)"""
      model_file_path = model_config['model_file_path']
      return load_model(model_file_path)
  ```

- Funktion `clear_cache()`:
  ```python
  def clear_cache():
      """Leert Modell-Cache"""
      load_model.cache_clear()
  ```

- Funktion `reload_model()`:
  ```python
  def reload_model(model_file_path: str):
      """Lädt Modell neu (entfernt aus Cache)"""
      # Entferne aus Cache (falls vorhanden)
      # LRU Cache hat keine direkte remove-Funktion, deshalb Cache leeren
      # Oder: Cache-Manager implementieren
      clear_cache()
      return load_model(model_file_path)
  ```

**⚠️ WICHTIG: Modell-Dateien müssen verfügbar sein!**
- `MODEL_STORAGE_PATH` muss auf Verzeichnis mit `.pkl` Dateien zeigen
- Modell-Dateien müssen vom Training Service erstellt worden sein
- Shared Storage oder Volume-Mapping nötig

**Ergebnis:** Modelle können geladen und gecacht werden.

**🧪 Test-Schritt:**
```python
# Teste Modell-Laden:
from app.prediction.model_manager import get_model
from app.database.models import get_active_models

models = await get_active_models()
if models:
    model_config = models[0]
    model = get_model(model_config)
    print(f"✅ Modell geladen: {type(model).__name__}")
```

---

### **Schritt 10: Prediction Engine (Vorhersage-Logik)**

**Was zu tun ist:**
1. Erstelle `app/prediction/engine.py`
2. Implementiere Vorhersage-Logik für ein Modell
3. Implementiere Multi-Modell-Vorhersagen
4. Implementiere Batch-Verarbeitung

**Vorgehen:**
- Funktion `predict_coin()`:
  ```python
  async def predict_coin(
      coin_id: str,
      timestamp: datetime,
      model_config: Dict,
      pool: asyncpg.Pool
  ) -> Dict:
      """
      Macht Vorhersage für einen Coin mit einem Modell.
      """
      # 1. Bereite Features auf
      from app.prediction.feature_processor import prepare_features
      features_df = await prepare_features(
          coin_id=coin_id,
          model_config=model_config,
          pool=pool
      )
      
      # 2. Lade Modell (aus Cache oder Datei)
      from app.prediction.model_manager import get_model
      model = get_model(model_config)
      
      # 3. Mache Vorhersage
      X = features_df.values
      prediction = model.predict(X)
      probability = model.predict_proba(X)[:, 1]
      
      # 4. Letzter Eintrag (neueste Vorhersage)
      result = {
          "prediction": int(prediction[-1]),
          "probability": float(probability[-1])
      }
      
      return result
  ```

- Funktion `predict_coin_all_models()`:
  ```python
  async def predict_coin_all_models(
      coin_id: str,
      timestamp: datetime,
      active_models: List[Dict],
      pool: asyncpg.Pool
  ) -> List[Dict]:
      """
      Macht Vorhersagen mit ALLEN aktiven Modellen.
      """
      results = []
      
      for model_config in active_models:
          try:
              result = await predict_coin(
                  coin_id=coin_id,
                  timestamp=timestamp,
                  model_config=model_config,
                  pool=pool
              )
              
              results.append({
                  "model_id": model_config['id'],
                  "model_name": model_config['name'],
                  **result
              })
              
          except Exception as e:
              logger.error(f"Fehler bei Modell {model_config['id']}: {e}")
              # Weiter mit nächstem Modell
              continue
      
      return results
  ```

**⚠️ WICHTIG: Feature-Reihenfolge!**
- Features müssen in GLEICHER Reihenfolge sein wie beim Training
- Validierung in `prepare_features()` prüft das

**⚠️ WICHTIG: target_variable bei zeitbasierter Vorhersage!**
- `target_variable` wird NICHT als Feature verwendet (verhindert Data Leakage)
- Wird in `prepare_features()` entfernt

**Ergebnis:** Vorhersagen können für alle Modell-Konfigurationen gemacht werden.

**🧪 Test-Schritt:**
```python
# Teste Vorhersage:
from app.prediction.engine import predict_coin_all_models
from app.database.models import get_active_models
from datetime import datetime, timezone

pool = await get_pool()
models = await get_active_models()
if models:
    results = await predict_coin_all_models(
        coin_id="ABC123...",
        timestamp=datetime.now(timezone.utc),
        active_models=models,
        pool=pool
    )
    print(f"✅ Vorhersagen gemacht: {len(results)} Modelle")
```

---

### **Schritt 11: Event-Handler (Polling)**

**Was zu tun ist:**
1. Erstelle `app/prediction/event_handler.py`
2. Implementiere Polling-Logik (prüft regelmäßig auf neue Einträge)
3. Implementiere Batch-Verarbeitung
4. Integriere mit Prediction Engine

**Vorgehen:**
- Funktion `get_new_coin_entries()`:
  ```python
  async def get_new_coin_entries(
      last_processed_timestamp: datetime,
      pool: asyncpg.Pool
  ) -> List[Dict]:
      """
      Holt neue Einträge aus coin_metrics.
      """
      query = """
          SELECT DISTINCT mint, MAX(timestamp) as latest_timestamp
          FROM coin_metrics
          WHERE timestamp > $1
          GROUP BY mint
          ORDER BY latest_timestamp ASC
          LIMIT $2
      """
      rows = await pool.fetch(query, last_processed_timestamp, BATCH_SIZE)
      return [dict(row) for row in rows]
  ```

- Funktion `process_batch()`:
  ```python
  async def process_batch(
      coin_entries: List[Dict],
      active_models: List[Dict],
      pool: asyncpg.Pool
  ):
      """
      Verarbeitet Batch von Coins.
      """
      from app.prediction.engine import predict_coin_all_models
      from app.database.models import save_prediction, save_alert
      
      predictions_to_save = []
      
      for entry in coin_entries:
          coin_id = entry['mint']
          timestamp = entry['latest_timestamp']
          
          # Mache Vorhersagen mit allen Modellen
          results = await predict_coin_all_models(
              coin_id=coin_id,
              timestamp=timestamp,
              active_models=active_models,
              pool=pool
          )
          
          # Speichere Vorhersagen
          for result in results:
              predictions_to_save.append({
                  'coin_id': coin_id,
                  'timestamp': timestamp,
                  'model_id': result['model_id'],
                  'prediction': result['prediction'],
                  'probability': result['probability']
              })
              
              # Prüfe Alerts
              model_config = next(m for m in active_models if m['id'] == result['model_id'])
              threshold = model_config.get('alert_threshold', DEFAULT_ALERT_THRESHOLD)
              
              if result['probability'] > threshold:
                  await save_alert(
                      coin_id=coin_id,
                      model_id=result['model_id'],
                      probability=result['probability'],
                      threshold=threshold,
                      pool=pool
                  )
      
      # Batch-Insert
      if predictions_to_save:
          await save_predictions_batch(predictions_to_save, pool)
  ```

- Funktion `start_polling()`:
  ```python
  async def start_polling():
      """
      Startet Polling-Loop.
      """
      from app.database.connection import get_pool
      from app.database.models import get_active_models
      from app.utils.config import POLLING_INTERVAL_SECONDS
      
      pool = await get_pool()
      last_processed_timestamp = datetime.now(timezone.utc) - timedelta(hours=1)
      
      while True:
          try:
              # Hole aktive Modelle (periodisch aktualisieren)
              active_models = await get_active_models()
              
              if not active_models:
                  logger.warning("Keine aktiven Modelle gefunden")
                  await asyncio.sleep(POLLING_INTERVAL_SECONDS)
                  continue
              
              # Hole neue Einträge
              new_entries = await get_new_coin_entries(last_processed_timestamp, pool)
              
              if new_entries:
                  # Verarbeite Batch
                  await process_batch(new_entries, active_models, pool)
                  
                  # Update last_processed_timestamp
                  last_processed_timestamp = max(e['latest_timestamp'] for e in new_entries)
              
              await asyncio.sleep(POLLING_INTERVAL_SECONDS)
              
          except Exception as e:
              logger.error(f"Fehler im Polling-Loop: {e}")
              await asyncio.sleep(POLLING_INTERVAL_SECONDS)
  ```

**Ergebnis:** Event-Handler überwacht `coin_metrics` und macht automatisch Vorhersagen.

**🧪 Test-Schritt:**
- Teste Polling-Loop:
  - Starte Service
  - Füge neuen Eintrag in `coin_metrics` ein
  - Prüfe ob Vorhersage erstellt wurde

---

## 📡 Phase 4: REST API (Schritte 12-14)

### **Schritt 12: Pydantic Schemas**

**Was zu tun ist:**
1. Erstelle `app/api/schemas.py`
2. Definiere alle Request/Response-Modelle mit Pydantic

**Vorgehen:**
- Erstelle Schemas für:
  - `PredictRequest`:
    - `coin_id`: String
    - `model_ids`: Optional[List[int]] (nur bestimmte Modelle)
    - `timestamp`: Optional[DateTime] (spezifischer Zeitpunkt)
  - `PredictionResponse`:
    - `coin_id`, `timestamp`
    - `predictions`: List[Dict] (Vorhersagen pro Modell)
  - `ModelActivateRequest`:
    - `model_id`: Integer
  - `PredictionsListResponse`:
    - `predictions`: List[Dict]
    - `total`: Integer
    - `limit`, `offset`: Integer
  - `HealthResponse`:
    - `status`: String
    - `active_models`: Integer
    - `predictions_last_hour`: Integer
    - `uptime_seconds`: Integer
    - `db_connected`: Boolean
  - `StatsResponse`:
    - `total_predictions`: Integer
    - `predictions_last_hour`: Integer
    - `active_models`: Integer
    - `coins_tracked`: Integer
    - `avg_prediction_time_ms`: Float

**Ergebnis:** Alle API-Interfaces sind definiert.

---

### **Schritt 13: API Routes**

**Was zu tun ist:**
1. Erstelle `app/api/routes.py`
2. Implementiere alle REST Endpoints
3. Nutze FastAPI Router

**Vorgehen:**
- Endpoints für Models:
  - **`GET /api/models/active`** → Liste aller aktiven Modelle
  - **`POST /api/models/{model_id}/activate`** → Modell aktivieren
  - **`POST /api/models/{model_id}/deactivate`** → Modell deaktivieren
  - **`POST /api/models/{model_id}/reload`** → Modell neu laden
- Endpoints für Vorhersagen:
  - **`POST /api/predict`** → Manuelle Vorhersage für einen Coin
  - **`GET /api/predictions`** → Liste aller Vorhersagen (mit Filtern)
  - **`GET /api/predictions/{prediction_id}`** → Details einer Vorhersage
  - **`GET /api/predictions/latest/{coin_id}`** → Neueste Vorhersage für einen Coin
- System:
  - **`GET /api/health`** → Health Check (JSON mit Status, aktive Modelle, etc.)
  - **`GET /api/metrics`** → Prometheus Metrics (Text-Format)
  - **`GET /api/stats`** → Statistiken
  - **`GET /health`** → Health Check (Alternative für Coolify)
  - **`GET /metrics`** → Metrics (Alternative für Coolify)
- Nutze Dependency Injection für DB-Pool

**Ergebnis:** REST API ist definiert.

---

### **Schritt 14: FastAPI Main App mit Health & Metrics**

**Was zu tun ist:**
1. Erstelle `app/main.py`
2. Setze FastAPI App auf
3. Integriere Routes, Metrics, Health Check
4. Starte Event-Handler als Background Task

**Vorgehen:**
- Erstelle FastAPI App
- Include Router aus `routes.py`
- Setup CORS (falls nötig)
- Setup Startup/Shutdown Events:
  ```python
  @app.on_event("startup")
  async def startup():
      # DB-Pool erstellen
      await get_pool()  # Initialisiert Pool
      
      # Health Status initialisieren
      from app.utils.metrics import health_status
      health_status["start_time"] = time.time()
      health_status["db_connected"] = True
      
      # Starte Event-Handler (Polling)
      from app.prediction.event_handler import start_polling
      asyncio.create_task(start_polling())
      
      print("✅ Service gestartet: DB verbunden, Event-Handler läuft")
  
  @app.on_event("shutdown")
  async def shutdown():
      # DB-Pool schließen
      await close_pool()
      print("👋 Service beendet")
  ```
- **Health Endpoint (`GET /api/health`):**
  - Nutze `get_health_status()` aus `metrics.py`
  - Prüfe DB-Verbindung
  - Gibt JSON zurück: `{"status": "healthy"/"degraded", "db_connected": bool, "active_models": int, ...}`
  - Status Code: 200 wenn healthy, 503 wenn degraded
- **Metrics Endpoint (`GET /api/metrics`):**
  - Nutze `generate_metrics()` aus `metrics.py`
  - Content-Type: `text/plain; version=0.0.4; charset=utf-8`
  - Gibt Prometheus-Format zurück
- **Zusätzlich:** `GET /health` und `GET /metrics` (ohne `/api` Prefix) für Coolify-Kompatibilität
- Nutze `uvicorn.run()` für Development

**Wichtig:** Health und Metrics müssen genau wie im Training Service funktionieren!

**Ergebnis:** FastAPI läuft mit Health Check, Metrics Endpoints und Event-Handler.

**🧪 Test-Schritt:**
```bash
# Starte Container und teste:
docker run -d --name ml-prediction-test -p 8000:8000 \
  -e DB_DSN="postgresql://..." \
  -e MODEL_STORAGE_PATH="/app/models" \
  -v /path/to/models:/app/models \
  ml-prediction-service

# Warte 10 Sekunden, dann teste:
curl http://localhost:8000/api/health
# Sollte JSON zurückgeben: {"status": "healthy", "db_connected": true, ...}

curl http://localhost:8000/api/metrics
# Sollte Prometheus-Metriken zurückgeben

# Teste Swagger-Docs:
# Öffne: http://localhost:8000/docs
```

---

## 🐳 Phase 5: Docker & Deployment (Schritte 15-17)

### **Schritt 15: Dockerfile erstellen (Vollständig)**

**Was zu tun ist:**
1. Erstelle `ml-prediction-service/Dockerfile`
2. Nutze Python 3.11-slim (wie Training Service)
3. Installiere Dependencies
4. Starte FastAPI Service
5. Konfiguriere Volumes und Environment

**Vorgehen:**
Erstelle vollständiges `Dockerfile`:
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# System-Dependencies installieren
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*

# Python Dependencies installieren
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# App-Code kopieren
COPY app/ ./app/

# Ports freigeben
EXPOSE 8000

# Health Check
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=5 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# Graceful Shutdown
STOPSIGNAL SIGTERM

# Start FastAPI
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Wichtig:** 
- Health Check muss auf `/api/health` zeigen
- Metrics sind auf `/api/metrics` verfügbar
- Port 8000 wird für API + Health + Metrics genutzt
- `models/` Verzeichnis wird als Volume gemappt (Shared mit Training Service?)

**Ergebnis:** Vollständiges Dockerfile ist fertig.

---

### **Schritt 16: Lokales Testing mit Docker**

**Was zu tun ist:**
1. Baue Docker Image lokal
2. Teste alle Funktionen im Container
3. Prüfe Logs und Volumes

**Vorgehen - Option 1: Docker Run (Einfach):**
```bash
cd ml-prediction-service

# Image bauen
docker build -t ml-prediction-service .

# Container starten mit Volumes und Environment
# ⚠️ WICHTIG: DB_DSN muss EXTERNE DB-Adresse enthalten!
# ⚠️ WICHTIG: MODEL_STORAGE_PATH muss auf Modell-Verzeichnis zeigen!
docker run -d \
  --name ml-prediction-test \
  -p 8000:8000 \
  -e DB_DSN="postgresql://user:pass@EXTERNE_DB_HOST:5432/crypto" \
  -e MODEL_STORAGE_PATH="/app/models" \
  -v /path/to/models:/app/models \
  ml-prediction-service

# Beispiel mit echter externer DB:
# -e DB_DSN="postgresql://postgres:password@100.76.209.59:5432/crypto"
# -v /shared/models:/app/models

# Logs ansehen
docker logs -f ml-prediction-test

# Container stoppen
docker stop ml-prediction-test
docker rm ml-prediction-test
```

**Vorgehen - Option 2: Docker Compose (Empfohlen):**
Erstelle `docker-compose.yml`:
```yaml
version: '3.8'

services:
  ml-prediction:
    build: .
    container_name: ml-prediction-service
    ports:
      - "8000:8000"
    environment:
      # ⚠️ EXTERNE Datenbank (nicht im Docker-Compose!)
      - DB_DSN=postgresql://user:pass@EXTERNE_DB_HOST:5432/crypto
      # Beispiel: postgresql://postgres:password@100.76.209.59:5432/crypto
      - API_PORT=8000
      - MODEL_STORAGE_PATH=/app/models
      - POLLING_INTERVAL_SECONDS=30
      - BATCH_SIZE=50
    volumes:
      - ./models:/app/models  # Oder: /shared/models:/app/models
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/health"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s
    restart: unless-stopped
    # Keine network-Konfiguration nötig - DB ist extern!
```

Dann:
```bash
# Starten
docker-compose up -d

# Logs
docker-compose logs -f

# Stoppen
docker-compose down
```

**Testing - Schritt für Schritt:**
1. **Health & Metrics prüfen:**
   ```bash
   curl http://localhost:8000/api/health
   curl http://localhost:8000/api/metrics
   ```

2. **API-Endpoints testen:**
   ```bash
   # Aktive Modelle
   curl http://localhost:8000/api/models/active
   
   # Manuelle Vorhersage
   curl -X POST http://localhost:8000/api/predict \
     -H "Content-Type: application/json" \
     -d '{"coin_id": "ABC123..."}'
   ```

3. **Event-Handler testen:**
   - Füge neuen Eintrag in `coin_metrics` ein
   - Warte 30 Sekunden (Polling-Intervall)
   - Prüfe ob Vorhersage erstellt wurde

**Ergebnis:** Alles funktioniert lokal in Docker.

---

### **Schritt 17: Coolify Deployment (Docker)**

**Was zu tun ist:**
1. Erstelle neuen Service in Coolify
2. Konfiguriere Dockerfile und Environment Variables
3. Setze Volumes für persistente Daten
4. Deploy und prüfe

**Vorgehen in Coolify:**
1. **Neues Service erstellen:**
   - Service-Typ: "Dockerfile"
   - Repository: Dein Git-Repo (oder lokales Verzeichnis)
   - Dockerfile-Pfad: `ml-prediction-service/Dockerfile`
   - Build-Kontext: `ml-prediction-service/`

2. **Environment Variables setzen:**
   ```
   # ⚠️ EXTERNE Datenbank (nicht im Docker-Container!)
   DB_DSN=postgresql://user:pass@EXTERNE_DB_HOST:5432/crypto
   # Beispiel: postgresql://postgres:password@100.76.209.59:5432/crypto
   
   API_PORT=8000
   MODEL_STORAGE_PATH=/app/models
   POLLING_INTERVAL_SECONDS=30
   BATCH_SIZE=50
   ```
   
   **Wichtig:** 
   - `DB_DSN` muss die **externe DB-Adresse** enthalten (IP oder Hostname)
   - Coolify-Container muss **Netzwerk-Zugriff** zur externen DB haben
   - Prüfe Firewall/Netzwerk-Einstellungen

3. **Volumes konfigurieren:**
   - **Persistent Volume** für Modelle:
     - Host-Pfad: `/app/models`
     - Volume-Name: `ml-prediction-models` (oder Shared mit Training Service)
     - **Wichtig:** Modell-Dateien müssen verfügbar sein!

4. **Ports konfigurieren:**
   - Port 8000 → FastAPI (Health + Metrics + API)

5. **Health Check:**
   - Coolify nutzt automatisch den HEALTHCHECK aus dem Dockerfile
   - Oder manuell: `/api/health` Endpoint

6. **Deploy:**
   - Klicke auf "Deploy"
   - Warte auf Build (kann einige Minuten dauern)
   - Prüfe Logs in Coolify

**Nach Deployment prüfen:**
```bash
# Via Coolify UI:
- Service-Status sollte "Running" sein
- Logs sollten keine Fehler zeigen
- Health Check sollte grün sein

# Via Browser/curl:
curl http://<coolify-url>:8000/api/health
curl http://<coolify-url>:8000/api/metrics
```

**Ergebnis:** Service läuft in Produktion mit Docker in Coolify.

---

## ✅ Phase 6: Testing & Optimierung (Schritte 18-19)

### **Schritt 18: End-to-End Testing**

**Was zu tun ist:**
1. Teste kompletten Workflow
2. Prüfe Edge Cases
3. Fixe Bugs

**Vorgehen - Detaillierte Test-Checkliste:**

**1. Basis-Funktionalität:**
- [ ] Health Check funktioniert (`/api/health`)
- [ ] Metrics funktioniert (`/api/metrics`)
- [ ] DB-Verbindung funktioniert (Health zeigt `db_connected: true`)
- [ ] API-Dokumentation erreichbar (`/docs`)

**2. Modell-Verwaltung:**
- [ ] Aktive Modelle werden geladen
- [ ] Modell aktivieren funktioniert
- [ ] Modell deaktivieren funktioniert
- [ ] Modell neu laden funktioniert

**3. Vorhersage-Workflow:**
- [ ] Manuelle Vorhersage via API funktioniert
- [ ] Vorhersagen werden in DB gespeichert
- [ ] Multi-Modell-Vorhersagen funktionieren
- [ ] Feature-Engineering wird korrekt angewendet

**4. Event-Handler:**
- [ ] Polling erkennt neue Einträge
- [ ] Batch-Verarbeitung funktioniert
- [ ] Vorhersagen werden automatisch erstellt
- [ ] Alerts werden ausgelöst (wenn threshold überschritten)

**5. Edge Cases:**
- [ ] Zu wenig Historie (< 5 Einträge)
- [ ] Fehlende Features
- [ ] Falsche Feature-Reihenfolge
- [ ] Modell-Datei nicht gefunden
- [ ] Keine aktiven Modelle
- [ ] DB-Verbindungsfehler

**6. Performance:**
- [ ] < 1 Sekunde pro Vorhersage (inkl. Feature-Aufbereitung)
- [ ] Unterstützt 10+ aktive Modelle gleichzeitig
- [ ] Verarbeitet 100+ Coins pro Minute

**Nach Tests:**
- Fixe alle gefundenen Bugs
- Dokumentiere bekannte Probleme
- Optimiere Performance bei Bedarf

**Ergebnis:** System ist stabil.

---

### **Schritt 19: Dokumentation & Finalisierung**

**Was zu tun ist:**
1. Aktualisiere README.md
2. Dokumentiere API-Endpoints
3. Erstelle Beispiel-Requests

**Vorgehen:**
- Aktualisiere `ml-prediction-service/README.md`:
  - Installation
  - Konfiguration
  - API-Dokumentation
  - Beispiel-Requests
- Erstelle Swagger-Dokumentation (FastAPI macht das automatisch)
- Dokumentiere häufige Probleme & Lösungen

**Ergebnis:** Projekt ist vollständig dokumentiert.

---

## 📊 Checkliste: Fortschritt verfolgen

### Phase 1: Grundlagen ✅
- [ ] Schritt 1: Projektstruktur erstellt
- [ ] Schritt 2: Datenbank-Schema erweitert
- [ ] Schritt 3: Requirements.txt erstellt

### Phase 2: Core-Komponenten ✅
- [ ] Schritt 4: Konfiguration erstellt
- [ ] Schritt 5: Datenbank-Verbindung funktioniert
- [ ] Schritt 6: Datenbank-Modelle implementiert
- [ ] Schritt 7: Prometheus Metrics erstellt

### Phase 3: Prediction Engine ✅
- [ ] Schritt 8: Feature-Engineering funktioniert
- [ ] Schritt 9: Modell-Manager funktioniert
- [ ] Schritt 10: Prediction Engine funktioniert
- [ ] Schritt 11: Event-Handler funktioniert

### Phase 4: REST API ✅
- [ ] Schritt 12: Pydantic Schemas definiert
- [ ] Schritt 13: API Routes implementiert
- [ ] Schritt 14: FastAPI läuft

### Phase 5: Docker & Deployment ✅
- [ ] Schritt 15: Dockerfile erstellt
- [ ] Schritt 16: Lokales Testing erfolgreich
- [ ] Schritt 17: Coolify Deployment läuft

### Phase 6: Testing & Optimierung ✅
- [ ] Schritt 18: End-to-End Testing erfolgreich
- [ ] Schritt 19: Dokumentation fertig

---

## ⚠️ Wichtige Hinweise

### **Docker-spezifisch:**
1. **Volumes:** Modell-Dateien müssen in einem Volume gespeichert werden (`/app/models`), sonst gehen sie bei Container-Neustart verloren!
2. **Environment Variables:** Alle Konfiguration über Environment Variables (DB_DSN, Ports, etc.)
3. **Externe Datenbank:** 
   - ⚠️ **DB läuft EXTERN** (nicht im Container!)
   - `DB_DSN` muss externe DB-Adresse enthalten (IP/Hostname)
   - Container muss **Netzwerk-Zugriff** zur externen DB haben
   - Firewall/Netzwerk: Port 5432 muss erreichbar sein
4. **Modell-Dateien:**
   - ⚠️ **Modell-Dateien müssen verfügbar sein!**
   - Shared Storage oder Volume-Mapping nötig
   - Modell-Dateien müssen vom Training Service erstellt worden sein
5. **Health Check:** Docker HEALTHCHECK ist wichtig für automatische Restarts
6. **Logs:** Nutze `docker logs` oder Coolify-Logs für Debugging

### **Allgemein:**
1. **⚠️ KRITISCH: Feature-Reihenfolge!**
   - Features müssen in GLEICHER Reihenfolge sein wie beim Training
   - Validierung in `prepare_features()` prüft das
2. **⚠️ KRITISCH: Feature-Engineering!**
   - Muss IDENTISCH sein wie im Training Service
   - Gleiche `window_sizes` verwenden
   - Code-Wiederverwendung (Import oder Duplikation)
3. **⚠️ KRITISCH: target_variable!**
   - Bei zeitbasierter Vorhersage NICHT als Feature verwenden
   - Verhindert Data Leakage
4. **Modell-Caching:** LRU Cache für Performance
5. **Batch-Verarbeitung:** Reduziert DB-Load
6. **Fehlerbehandlung:** Implementiere umfassende Error-Handling und Logging

---

## ✅ Vollständigkeits-Check: Alle Anforderungen abgedeckt

### **Funktionen:**
- ✅ **Echtzeit-Vorhersagen:** Event-Handler überwacht `coin_metrics`
- ✅ **Multi-Modell-Support:** Alle aktiven Modelle werden verwendet
- ✅ **Feature-Engineering:** Gleiche Logik wie Training Service
- ✅ **Modell-Caching:** LRU Cache für Performance
- ✅ **Batch-Verarbeitung:** Effiziente Verarbeitung
- ✅ **Alert-System:** Threshold-basierte Alerts
- ✅ **API für n8n:** Vollständig kompatibel

### **Modell-Konfigurationen:**
- ✅ Random Forest
- ✅ XGBoost
- ✅ Klassische Vorhersage
- ✅ Zeitbasierte Vorhersage
- ✅ Feature-Engineering aktiviert/deaktiviert
- ✅ Verschiedene Features
- ✅ Phasen-Filter

**🎉 Alle Anforderungen sind in der Anleitung enthalten!**

---

**Viel Erfolg beim Aufbau! 🚀**

Bei Fragen oder Problemen: Prüfe die Logs, die Datenbank und die Dokumentation.

