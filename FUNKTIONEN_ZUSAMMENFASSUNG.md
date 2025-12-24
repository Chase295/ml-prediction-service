# 📋 ML Prediction Service - Vollständige Funktions-Zusammenfassung

**Version:** 1.0  
**Datum:** 24. Dezember 2025  
**Status:** Vor Implementierung

---

## 🎯 Hauptfunktion

**Echtzeit-Vorhersagen für alle Coins mit allen aktiven Modellen, sobald neue Daten in `coin_metrics` eingetragen werden.**

---

## 🔧 Kern-Funktionen

### 1. Modell-Verwaltung

#### 1.1 Aktive Modelle identifizieren
- ✅ Liest `ml_models` Tabelle
- ✅ Filtert nach `is_active = true` und `status = 'READY'`
- ✅ Lädt Modell-Dateien (`.pkl`) aus Dateisystem
- ✅ Cached Modelle im Speicher (LRU Cache, max. 10 Modelle)
- ✅ Periodische Prüfung auf neue/geänderte Modelle (alle 5 Min)

#### 1.2 Modell-Metadaten verarbeiten
- ✅ Modell-ID, Name, Typ (Random Forest / XGBoost)
- ✅ Features-Liste (Basis + ggf. Feature-Engineering Features)
- ✅ Feature-Engineering-Parameter (`use_engineered_features`, `feature_engineering_windows`)
- ✅ Vorhersage-Typ (klassisch vs. zeitbasiert)
- ✅ Phasen-Filter (`phases` JSONB Array)
- ✅ Alert-Threshold (optional, Standard: 0.7)

#### 1.3 Modell-Aktivierung/Deaktivierung
- ✅ API-Endpunkt: `POST /api/models/{id}/activate`
- ✅ API-Endpunkt: `POST /api/models/{id}/deactivate`
- ✅ API-Endpunkt: `POST /api/models/{id}/reload`
- ✅ Automatisches Laden beim Start
- ✅ Cache-Verwaltung (Laden/Entladen)

---

### 2. Event-Handling

#### 2.1 Neue Einträge erkennen (Polling)
- ✅ Prüft alle X Sekunden (konfigurierbar, Standard: 30s) auf neue Einträge
- ✅ Merkt sich letzten verarbeiteten Timestamp
- ✅ Verarbeitet nur neue Einträge
- ✅ SQL Query: `SELECT DISTINCT mint, MAX(timestamp) FROM coin_metrics WHERE timestamp > $last_processed`

#### 2.2 Batch-Verarbeitung
- ✅ Sammelt mehrere neue Einträge (max. 50 Coins oder 5 Sekunden Wartezeit)
- ✅ Verarbeitet in Batch (reduziert DB-Load)
- ✅ Gruppiert nach Coin
- ✅ Parallel-Verarbeitung für mehrere Coins

#### 2.3 Database Trigger (Optional, später)
- ⏳ PostgreSQL Trigger auf `coin_metrics` INSERT
- ⏳ Trigger ruft HTTP-Webhook oder schreibt in Queue-Tabelle
- ⏳ Echtzeit (keine Verzögerung)

---

### 3. Feature-Aufbereitung

#### 3.1 Historie sammeln
- ✅ Für jeden Coin: Letzte N Einträge aus `coin_metrics` holen
- ✅ N = Max. benötigte Historie für Feature-Engineering (Standard: 20)
- ✅ Optional: Filter nach Phasen (wenn `phases` gesetzt)
- ✅ SQL Query: `SELECT * FROM coin_metrics WHERE mint = $coin_id ORDER BY timestamp DESC LIMIT 20`
- ✅ Warnung bei zu wenig Historie (< 5 Einträge), aber trotzdem verarbeiten

#### 3.2 Feature-Engineering
- ✅ Gleiche Logik wie im Training Service
- ✅ Nutzt `create_pump_detection_features()` (Import aus Training Service oder Code-Duplikation)
- ✅ Erstellt: ROC, Volatility, Velocity, Range, Change Features
- ✅ Nur anwenden wenn `use_engineered_features = true`
- ✅ Gleiche `window_sizes` wie beim Training verwenden
- ✅ Features in GLEICHER Reihenfolge wie beim Training

#### 3.3 Feature-Validierung
- ✅ Prüft ob alle benötigten Features vorhanden
- ✅ Prüft Feature-Reihenfolge (muss identisch sein wie beim Training)
- ✅ Prüft ob Feature-Engineering Features erstellt wurden (wenn aktiviert)
- ✅ Warnung bei fehlenden Features
- ✅ Bei zeitbasierter Vorhersage: `target_variable` NICHT als Feature verwenden (verhindert Data Leakage)

---

### 4. Vorhersage-Engine

#### 4.1 Vorhersage für ein Modell
- ✅ Modell aus Cache laden (oder aus Datei)
- ✅ Features in richtiger Reihenfolge vorbereiten
- ✅ `model.predict()` → Ja/Nein (0 oder 1)
- ✅ `model.predict_proba()` → Wahrscheinlichkeit (0.0 - 1.0)
- ✅ Funktioniert für Random Forest UND XGBoost (gleiche Scikit-learn API)
- ✅ Funktioniert für klassische UND zeitbasierte Vorhersage

#### 4.2 Multi-Modell-Vorhersagen
- ✅ Für jeden Coin: Vorhersage mit ALLEN aktiven Modellen
- ✅ Jedes Modell gibt eigene Vorhersage + Wahrscheinlichkeit
- ✅ Alle Ergebnisse speichern
- ✅ Vergleich verschiedener Modelle möglich

#### 4.3 Ensemble-Vorhersage (Optional, später)
- ⏳ Kombiniert Vorhersagen mehrerer Modelle
- ⏳ Gewichtete Durchschnitte
- ⏳ Voting-Mechanismus

---

### 5. Ergebnis-Speicherung

#### 5.1 Datenbank-Schema
- ✅ Neue Tabelle: `predictions`
  - `id`, `coin_id`, `timestamp`
  - `model_id` (Foreign Key zu `ml_models`)
  - `prediction` (0 oder 1)
  - `probability` (0.0000 - 1.0000)
  - `features` (JSONB, optional, für Debugging)
  - `created_at`
  - Indizes für Performance

#### 5.2 Batch-Insert
- ✅ Sammelt mehrere Vorhersagen (50-100)
- ✅ Insert in Batch (effizienter)
- ✅ Transaction für Konsistenz
- ✅ Max. Wartezeit: 2 Sekunden

#### 5.3 Alert-Speicherung (Optional)
- ✅ Neue Tabelle: `prediction_alerts`
  - `id`, `prediction_id` (Foreign Key)
  - `coin_id`, `model_id`
  - `probability`, `threshold`
  - `alert_sent` (Boolean)
  - `created_at`

---

### 6. Alert-System (Optional)

#### 6.1 Threshold-basierte Alerts
- ✅ Wenn `probability > threshold` → Alert erstellen
- ✅ Threshold konfigurierbar pro Modell (Standard: 0.7)
- ✅ Speichert in `prediction_alerts` Tabelle

#### 6.2 Alert-Kanäle
- ✅ Database (prediction_alerts Tabelle)
- ⏳ Webhook (HTTP POST) - später
- ⏳ n8n Integration - später
- ✅ Logging

---

## 🔌 API-Endpunkte

### Modell-Verwaltung
- ✅ `GET /api/models/active` - Liste aller aktiven Modelle
- ✅ `POST /api/models/{model_id}/activate` - Modell aktivieren
- ✅ `POST /api/models/{model_id}/deactivate` - Modell deaktivieren
- ✅ `POST /api/models/{model_id}/reload` - Modell neu laden

### Vorhersagen
- ✅ `POST /api/predict` - Manuelle Vorhersage für einen Coin
  - Request: `coin_id`, `model_ids` (optional), `timestamp` (optional)
  - Response: Vorhersagen für alle aktiven Modelle (oder nur `model_ids`)
- ✅ `GET /api/predictions` - Liste aller Vorhersagen
  - Query-Parameter: `coin_id`, `model_id`, `min_probability`, `limit`, `offset`
- ✅ `GET /api/predictions/{prediction_id}` - Details einer Vorhersage
- ✅ `GET /api/predictions/latest/{coin_id}` - Neueste Vorhersage für einen Coin

### Status & Monitoring
- ✅ `GET /api/health` - Health Check
  - Response: Status, aktive Modelle, Vorhersagen letzte Stunde, Uptime, DB-Verbindung
- ✅ `GET /api/metrics` - Prometheus Metriken
- ✅ `GET /api/stats` - Statistiken
  - Response: Gesamt-Vorhersagen, Vorhersagen letzte Stunde, aktive Modelle, getrackte Coins, avg. Vorhersage-Zeit

---

## 📊 Monitoring & Metriken

### Prometheus Metriken

#### Counter
- ✅ `ml_predictions_total` - Gesamtanzahl Vorhersagen
- ✅ `ml_predictions_by_model_total{model_id, model_name}` - Vorhersagen pro Modell
- ✅ `ml_alerts_triggered_total{model_id}` - Anzahl Alerts
- ✅ `ml_errors_total{type}` - Fehler (model_load, prediction, db)

#### Gauge
- ✅ `ml_active_models` - Anzahl aktiver Modelle
- ✅ `ml_models_loaded` - Anzahl geladener Modelle
- ✅ `ml_coins_tracked` - Anzahl getrackter Coins
- ✅ `ml_prediction_duration_seconds` - Dauer einer Vorhersage
- ✅ `ml_db_connected` - DB-Verbindungsstatus
- ✅ `ml_service_uptime_seconds` - Uptime

#### Histogram
- ✅ `ml_prediction_duration_seconds` - Verteilung der Vorhersage-Dauer
- ✅ `ml_feature_processing_duration_seconds` - Feature-Aufbereitung Dauer
- ✅ `ml_model_load_duration_seconds` - Modell-Lade-Dauer

---

## 🗄️ Datenbank-Integration

### Neue Tabellen

#### `predictions`
- Speichert alle Vorhersagen
- Foreign Key zu `ml_models`
- Indizes für Performance

#### `prediction_alerts` (Optional)
- Speichert ausgelöste Alerts
- Foreign Key zu `predictions`

### Erweiterungen

#### `ml_models`
- ✅ `is_active` (BOOLEAN) - Ist Modell aktiv?
- ✅ `alert_threshold` (NUMERIC) - Threshold für Alerts (Standard: 0.7)

---

## ⚙️ Konfiguration

### Umgebungsvariablen

#### Datenbank
- ✅ `DB_DSN` - PostgreSQL Connection String (externe DB)

#### Modell-Storage
- ✅ `MODEL_STORAGE_PATH` - Pfad zu `.pkl` Dateien (Standard: `/app/models`)

#### Event-Handling
- ✅ `POLLING_INTERVAL_SECONDS` - Polling-Intervall (Standard: 30)
- ✅ `BATCH_SIZE` - Batch-Größe (Standard: 50)
- ✅ `BATCH_TIMEOUT_SECONDS` - Batch-Timeout (Standard: 5)

#### Feature-Engineering
- ✅ `FEATURE_HISTORY_SIZE` - Anzahl Einträge für Historie (Standard: 20)

#### Performance
- ✅ `MAX_CONCURRENT_PREDICTIONS` - Max. parallele Vorhersagen (Standard: 10)
- ✅ `MODEL_CACHE_SIZE` - Cache-Größe (Standard: 10)

#### Alerts
- ✅ `DEFAULT_ALERT_THRESHOLD` - Standard-Threshold (Standard: 0.7)
- ⏳ `ALERT_WEBHOOK_URL` - Webhook-URL (optional, später)

#### Monitoring
- ✅ `API_PORT` - API-Port (Standard: 8000)
- ✅ `HEALTH_CHECK_INTERVAL` - Health-Check-Intervall (Standard: 10)

---

## 🔄 Workflows

### Workflow 1: Neuer Eintrag in coin_metrics
1. Event Handler erkennt neuen Eintrag (Polling)
2. Für jeden aktiven Coin:
   a. Hole Historie (letzte 20 Einträge)
   b. Bereite Features auf (inkl. Feature-Engineering wenn aktiviert)
   c. Für jedes aktive Modell:
      - Lade Modell (aus Cache oder Datei)
      - Mache Vorhersage
      - Speichere Ergebnis
3. Optional: Prüfe Alerts (wenn `probability > threshold`)
4. Optional: Sende Webhook/Alert

### Workflow 2: Modell aktivieren
1. API Request: `POST /api/models/1/activate`
2. Update `ml_models`: `is_active = true`
3. Lade Modell-Datei (`.pkl`)
4. Validiere Modell (Features, Parameter)
5. Füge zu Cache hinzu
6. Response: Erfolg

### Workflow 3: Batch-Verarbeitung
1. Sammle neue Einträge (max. 5 Sekunden oder 50 Coins)
2. Gruppiere nach Coin
3. Für jeden Coin parallel:
   - Hole Historie
   - Bereite Features auf
   - Mache Vorhersagen
4. Batch-Insert in `predictions` Tabelle
5. Prüfe Alerts für alle Vorhersagen

---

## 🎯 Unterstützte Modell-Konfigurationen

### Modell-Typen
- ✅ Random Forest
- ✅ XGBoost

### Vorhersage-Typen
- ✅ Klassische Vorhersage (`target_operator`, `target_value`)
- ✅ Zeitbasierte Vorhersage (`future_minutes`, `min_percent_change`)

### Feature-Engineering
- ✅ Feature-Engineering aktiviert (`use_engineered_features = true`)
- ✅ Feature-Engineering deaktiviert (`use_engineered_features = false`)
- ✅ Verschiedene `window_sizes` ([5, 10, 15], [5, 10], etc.)

### Features
- ✅ Nur Basis-Features
- ✅ Basis + Feature-Engineering Features
- ✅ Verschiedene Feature-Kombinationen

### Phasen
- ✅ Keine Phasen-Filter
- ✅ Phasen-Filter aktiviert ([1], [1, 2], etc.)

---

## ⚠️ Kritische Anforderungen

### Feature-Reihenfolge
- ✅ MUSS identisch sein wie beim Training
- ✅ Validierung vor Vorhersage

### Feature-Engineering
- ✅ Nur anwenden wenn `use_engineered_features = true`
- ✅ Gleiche `window_sizes` wie beim Training
- ✅ Features in GLEICHER Reihenfolge

### target_variable
- ✅ Bei zeitbasierter Vorhersage NICHT als Feature verwenden
- ✅ Verhindert Data Leakage

### Modell-Typ
- ✅ Funktioniert für Random Forest UND XGBoost (gleiche API)
- ✅ Keine spezielle Behandlung nötig

### Vorhersage-Typ
- ✅ Funktioniert für klassisch UND zeitbasiert
- ✅ Keine Labels beim Prediction nötig (nur Features)

---

## 🚀 Deployment

### Docker
- ✅ Dockerfile (Python 3.11-slim)
- ✅ docker-compose.yml
- ✅ Health Checks
- ✅ Volumes für Modelle (Shared mit Training Service?)

### Coolify
- ✅ Ähnlich wie ML Training Service
- ✅ Environment Variables
- ✅ Health Checks konfigurieren

---

## 📈 Erweiterungen (Später)

### Phase 2: Ensemble-Vorhersagen
- ⏳ Kombiniert mehrere Modelle
- ⏳ Gewichtete Durchschnitte
- ⏳ Voting-Mechanismus

### Phase 3: Real-time WebSocket
- ⏳ WebSocket für Live-Updates
- ⏳ Push-Vorhersagen an Clients
- ⏳ Live-Dashboard

### Phase 4: Modell-Auto-Selection
- ⏳ Automatisch bestes Modell wählen
- ⏳ Performance-Tracking
- ⏳ Auto-Switching bei besserem Modell

### Phase 5: Advanced Alerts
- ⏳ Mehrere Alert-Kanäle
- ⏳ Alert-Rules (z.B. "nur wenn 2 Modelle zustimmen")
- ⏳ Alert-History

---

## 🔗 Integration

### ML Training Service
- ✅ Lädt Modelle aus `ml_models` Tabelle
- ✅ Modell-Dateien: Shared Storage oder separate Pfade
- ✅ Feature-Engineering: Gleiche Logik (Code-Wiederverwendung)

### Pump Metrics Service
- ✅ Daten-Quelle: Liest aus `coin_metrics` Tabelle
- ✅ Event-Trigger: Reagiert auf neue Einträge
- ✅ Monitoring: Ähnliche Prometheus Metriken

### n8n
- ✅ API: REST API für n8n Workflows
- ⏳ Webhooks: Für Alerts (später)
- ✅ Integration: Vollständig kompatibel

---

## ✅ Vollständigkeits-Check

### Funktionale Anforderungen
- ✅ Erkennt neue Einträge in `coin_metrics`
- ✅ Lädt aktive Modelle automatisch
- ✅ Macht Vorhersagen für alle aktiven Coins
- ✅ Speichert Ergebnisse korrekt
- ✅ API funktioniert mit n8n
- ✅ Unterstützt ALLE Modell-Konfigurationen

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

**Status:** ✅ Vollständige Funktions-Zusammenfassung  
**Nächster Schritt:** Schritt-für-Schritt-Anleitung erstellen

