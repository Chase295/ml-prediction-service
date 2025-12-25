# 📊 ML Prediction Service - Datenbank-Schema Dokumentation

**Version:** 1.0  
**Datum:** 2025-01-XX  
**Datenbank:** PostgreSQL

---

## 📋 Übersicht

Dieses Schema erweitert die bestehende `crypto` Datenbank um Tabellen für den ML Prediction Service. **Wichtig:** Es werden **KEINE** bestehenden Tabellen geändert, nur neue Tabellen hinzugefügt.

### Neue Tabellen:
1. `prediction_active_models` - Verwaltung aktiver Modelle im Prediction Service
2. `predictions` - Speicherung aller Vorhersagen
3. `prediction_webhook_log` - Logging von n8n Webhook-Aufrufen

### Trigger:
- `coin_metrics_insert_trigger` - LISTEN/NOTIFY für Echtzeit-Events

---

## 🔔 Trigger: `coin_metrics_insert_trigger`

### Was macht der Trigger?

Der Trigger **überwacht automatisch** alle neuen Einträge in der `coin_metrics` Tabelle und sendet eine **Echtzeit-Benachrichtigung** an den ML Prediction Service.

### Funktionsweise:

1. **Trigger-Funktion:** `notify_coin_metrics_insert()`
   - Wird **automatisch** bei jedem `INSERT` in `coin_metrics` ausgeführt
   - Erstellt eine JSON-Nachricht mit:
     - `mint` (Coin-ID)
     - `timestamp` (Zeitstempel)
     - `phase_id` (Phase zum Zeitpunkt)
   - Sendet diese Nachricht über PostgreSQL `pg_notify()`

2. **Trigger-Definition:**
   ```sql
   CREATE TRIGGER coin_metrics_insert_trigger
       AFTER INSERT ON coin_metrics
       FOR EACH ROW
       EXECUTE FUNCTION notify_coin_metrics_insert();
   ```
   - **Timing:** `AFTER INSERT` - Nach dem Einfügen
   - **Scope:** `FOR EACH ROW` - Für jede neue Zeile

### Wie funktioniert LISTEN/NOTIFY?

**PostgreSQL LISTEN/NOTIFY** ist ein **Push-Mechanismus** für Echtzeit-Kommunikation:

1. **Trigger sendet NOTIFY:**
   - Bei jedem neuen `coin_metrics` Eintrag
   - Channel: `coin_metrics_insert`
   - Payload: JSON-String mit Coin-Informationen

2. **Prediction Service hört zu:**
   - Verbindung mit `LISTEN coin_metrics_insert`
   - Empfängt Nachricht **sofort** (< 100ms Latenz)
   - Verarbeitet Coin automatisch

3. **Vorteile:**
   - ✅ **Echtzeit** (< 100ms statt 30s Polling)
   - ✅ **Effizient** (keine ständigen DB-Queries)
   - ✅ **Skalierbar** (mehrere Services können zuhören)

### Beispiel-Workflow:

```
1. Neuer Coin-Eintrag in coin_metrics
   ↓
2. Trigger feuert automatisch
   ↓
3. pg_notify('coin_metrics_insert', '{"mint":"ABC123","timestamp":"2025-01-XX",...}')
   ↓
4. Prediction Service empfängt Nachricht (via LISTEN)
   ↓
5. Service macht Vorhersage für Coin
   ↓
6. Speichert in predictions Tabelle
   ↓
7. Sendet an n8n (falls konfiguriert)
```

### Fallback: Polling

Falls LISTEN/NOTIFY nicht verfügbar ist (z.B. Netzwerk-Probleme), nutzt der Service **Polling** als Fallback:
- Prüft alle 30 Sekunden auf neue Einträge
- Weniger effizient, aber zuverlässig

---

## 📑 Tabelle 1: `prediction_active_models`

### Zweck
Verwaltet alle **aktiven Modelle** im Prediction Service. Diese Tabelle ist **lokal** im Prediction Service und **unabhängig** von `ml_models` im Training Service.

### Warum separate Tabelle?
- **Separater Server:** Prediction Service läuft auf anderem Server
- **Lokale Verwaltung:** Modelle werden heruntergeladen und lokal gespeichert
- **Unabhängigkeit:** Prediction Service kann Modelle aktivieren/deaktivieren ohne Training Service

### Felder:

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| `id` | BIGSERIAL | Primärschlüssel (lokal) |
| `model_id` | BIGINT | Referenz zu `ml_models.id` (kein FK!) |
| `model_name` | VARCHAR(255) | Name des Modells |
| `model_type` | VARCHAR(50) | `random_forest` oder `xgboost` |
| `target_variable` | VARCHAR(100) | Ziel-Variable (z.B. `price_close`) |
| `target_operator` | VARCHAR(10) | Operator (`>`, `<`, `>=`, `<=`, `=`) oder NULL |
| `target_value` | NUMERIC(20,2) | Ziel-Wert oder NULL |
| `future_minutes` | INTEGER | Minuten in die Zukunft (zeitbasierte Vorhersage) |
| `price_change_percent` | NUMERIC(10,4) | Prozentuale Änderung (zeitbasierte Vorhersage) |
| `target_direction` | VARCHAR(10) | `up` oder `down` (zeitbasierte Vorhersage) |
| `features` | JSONB | Liste der Features (Array) |
| `phases` | JSONB | Liste der Phasen (Array) oder NULL |
| `params` | JSONB | Modell-Parameter (Object) |
| `local_model_path` | TEXT | Pfad zur lokalen `.pkl` Datei |
| `model_file_url` | TEXT | URL zum Download (optional) |
| `is_active` | BOOLEAN | Ist Modell aktiv? (Default: `true`) |
| `last_prediction_at` | TIMESTAMP | Letzte Vorhersage |
| `total_predictions` | BIGINT | Anzahl Vorhersagen (Counter) |
| `downloaded_at` | TIMESTAMP | Wann wurde Modell heruntergeladen? |
| `activated_at` | TIMESTAMP | Wann wurde Modell aktiviert? |
| `created_at` | TIMESTAMP | Erstellt am |
| `updated_at` | TIMESTAMP | Aktualisiert am |
| `custom_name` | VARCHAR(255) | Optional: Lokaler Name (falls umbenannt) |

### Constraints:

- **`chk_model_type`:** Nur `random_forest` oder `xgboost` erlaubt
- **`chk_operator`:** Nur gültige Operatoren oder NULL
- **`chk_direction`:** Nur `up`, `down` oder NULL
- **`UNIQUE(model_id)`:** Ein Modell kann nur einmal aktiv sein

### Indizes:

1. **`idx_active_models_active`** (Partial Index)
   - Spalte: `is_active`
   - Filter: `WHERE is_active = true`
   - Zweck: Schnelle Abfrage aktiver Modelle

2. **`idx_active_models_model_id`**
   - Spalte: `model_id`
   - Zweck: Schnelle Suche nach Modell-ID

3. **`idx_active_models_custom_name`** (Partial Index)
   - Spalte: `custom_name`
   - Filter: `WHERE custom_name IS NOT NULL`
   - Zweck: Suche nach umbenannten Modellen

### Beispiel-Daten:

```json
{
  "id": 1,
  "model_id": 42,
  "model_name": "XGBoost 5min 30% Pump",
  "model_type": "xgboost",
  "target_variable": "price_close",
  "target_operator": null,
  "target_value": null,
  "future_minutes": 5,
  "price_change_percent": 30.0,
  "target_direction": "up",
  "features": ["price_open", "price_high", "price_low", "price_close", "volume_sol"],
  "phases": [1, 2],
  "params": {
    "n_estimators": 100,
    "max_depth": 5,
    "use_engineered_features": true
  },
  "local_model_path": "/app/models/model_42.pkl",
  "is_active": true,
  "total_predictions": 1523,
  "custom_name": "Mein Pump-Detector"
}
```

---

## 📑 Tabelle 2: `predictions`

### Zweck
Speichert **alle Vorhersagen**, die der Prediction Service erstellt hat.

### Felder:

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| `id` | BIGSERIAL | Primärschlüssel |
| `coin_id` | VARCHAR(255) | Coin-ID (mint) |
| `data_timestamp` | TIMESTAMP | Zeitstempel der Daten (nicht Vorhersage-Zeit!) |
| `model_id` | BIGINT | Referenz zu `ml_models.id` (kein FK!) |
| `active_model_id` | BIGINT | FK zu `prediction_active_models.id` (kann NULL sein) |
| `prediction` | INTEGER | Vorhersage: `0` (negativ) oder `1` (positiv) |
| `probability` | NUMERIC(5,4) | Wahrscheinlichkeit (0.0 - 1.0) |
| `phase_id_at_time` | INTEGER | Phase zum Zeitpunkt der Vorhersage |
| `features` | JSONB | Features (optional, für Debugging) |
| `prediction_duration_ms` | INTEGER | Dauer der Vorhersage in Millisekunden |
| `created_at` | TIMESTAMP | Wann wurde Vorhersage erstellt? |

### Constraints:

- **`prediction IN (0, 1)`:** Nur 0 oder 1 erlaubt
- **`probability >= 0.0 AND probability <= 1.0`:** Gültiger Wahrscheinlichkeitswert

### Indizes:

1. **`idx_predictions_coin_timestamp`**
   - Spalten: `coin_id`, `data_timestamp DESC`
   - Zweck: Schnelle Abfrage neuester Vorhersagen pro Coin

2. **`idx_predictions_model`**
   - Spalten: `model_id`, `created_at DESC`
   - Zweck: Alle Vorhersagen eines Modells

3. **`idx_predictions_active_model`**
   - Spalten: `active_model_id`, `created_at DESC`
   - Zweck: Vorhersagen eines aktiven Modells

4. **`idx_predictions_created`**
   - Spalte: `created_at DESC`
   - Zweck: Neueste Vorhersagen (allgemein)

### Beispiel-Daten:

```json
{
  "id": 12345,
  "coin_id": "ABC123...",
  "data_timestamp": "2025-01-XX 12:00:00+00",
  "model_id": 42,
  "active_model_id": 1,
  "prediction": 1,
  "probability": 0.8542,
  "phase_id_at_time": 1,
  "prediction_duration_ms": 45,
  "created_at": "2025-01-XX 12:00:01+00"
}
```

---

## 📑 Tabelle 3: `prediction_webhook_log`

### Zweck
Loggt **alle n8n Webhook-Aufrufe** für Debugging und Monitoring.

### Felder:

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| `id` | BIGSERIAL | Primärschlüssel |
| `coin_id` | VARCHAR(255) | Coin-ID |
| `data_timestamp` | TIMESTAMP | Zeitstempel der Daten |
| `webhook_url` | TEXT | n8n Webhook-URL |
| `payload` | JSONB | Gesendeter JSON-Payload |
| `response_status` | INTEGER | HTTP-Status-Code (200, 404, 500, etc.) |
| `response_body` | TEXT | Response-Body von n8n |
| `error_message` | TEXT | Fehler-Message (falls Fehler) |
| `created_at` | TIMESTAMP | Wann wurde Webhook aufgerufen? |

### Indizes:

1. **`idx_webhook_log_created`**
   - Spalte: `created_at DESC`
   - Zweck: Neueste Webhook-Aufrufe

2. **`idx_webhook_log_status`** (Partial Index)
   - Spalte: `response_status`
   - Filter: `WHERE response_status IS NOT NULL`
   - Zweck: Fehler-Analyse (nur fehlgeschlagene Aufrufe)

### Beispiel-Daten:

```json
{
  "id": 567,
  "coin_id": "ABC123...",
  "data_timestamp": "2025-01-XX 12:00:00+00",
  "webhook_url": "https://n8n.example.com/webhook/ml-predictions",
  "payload": {
    "coin_id": "ABC123...",
    "timestamp": "2025-01-XX 12:00:00+00",
    "predictions": [...],
    "metadata": {...}
  },
  "response_status": 200,
  "response_body": "OK",
  "error_message": null,
  "created_at": "2025-01-XX 12:00:01+00"
}
```

---

## 🔗 Beziehungen zwischen Tabellen

### 1. `prediction_active_models` ↔ `ml_models`
- **Beziehung:** Logische Referenz (kein Foreign Key!)
- **Grund:** Separater Server, keine direkte DB-Verbindung
- **Verwendung:** `model_id` in `prediction_active_models` referenziert `ml_models.id`

### 2. `predictions` ↔ `prediction_active_models`
- **Beziehung:** Foreign Key (`active_model_id`)
- **Verhalten:** `ON DELETE SET NULL` (wenn Modell gelöscht wird, bleibt Vorhersage erhalten)
- **Verwendung:** Verknüpfung Vorhersage mit aktivem Modell

### 3. `predictions` ↔ `ml_models`
- **Beziehung:** Logische Referenz (kein Foreign Key!)
- **Grund:** Separater Server
- **Verwendung:** `model_id` in `predictions` referenziert `ml_models.id`

---

## 📊 Performance-Optimierungen

### Indizes-Strategie:

1. **Partial Indizes:**
   - Nur für häufig abgefragte Teilmengen (z.B. `is_active = true`)
   - Spart Speicher und verbessert Performance

2. **Composite Indizes:**
   - Kombinationen von Spalten für häufige Queries
   - Sortierung (`DESC`) für neueste Einträge zuerst

3. **JSONB Indizes:**
   - JSONB-Felder können mit GIN-Indizes indexiert werden (falls nötig)
   - Aktuell nicht implementiert (kann später hinzugefügt werden)

### Wartung:

- **VACUUM:** Regelmäßig ausführen für optimale Performance
- **ANALYZE:** Statistiken aktualisieren
- **Index-Monitoring:** Prüfe ob Indizes genutzt werden

---

## 🧪 Test-Queries

### 1. Prüfe ob Tabellen existieren:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('prediction_active_models', 'predictions', 'prediction_webhook_log')
ORDER BY table_name;
```

### 2. Prüfe Trigger:
```sql
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'coin_metrics_insert_trigger';
```

### 3. Aktive Modelle abfragen:
```sql
SELECT id, model_id, model_name, model_type, is_active, total_predictions
FROM prediction_active_models
WHERE is_active = true;
```

### 4. Neueste Vorhersagen:
```sql
SELECT p.id, p.coin_id, p.prediction, p.probability, p.created_at, m.model_name
FROM predictions p
LEFT JOIN prediction_active_models m ON p.active_model_id = m.id
ORDER BY p.created_at DESC
LIMIT 10;
```

### 5. Webhook-Fehler analysieren:
```sql
SELECT COUNT(*), response_status, error_message
FROM prediction_webhook_log
WHERE response_status != 200 OR response_status IS NULL
GROUP BY response_status, error_message;
```

---

## ⚠️ Wichtige Hinweise

### 1. **Keine Foreign Keys zu `ml_models`:**
- Prediction Service und Training Service sind **separate Server**
- Keine direkte DB-Verbindung zwischen beiden
- Referenzen sind **logisch** (über `model_id`)

### 2. **Trigger auf bestehender Tabelle:**
- Trigger wird auf **bestehender** `coin_metrics` Tabelle erstellt
- **Keine Änderungen** an `coin_metrics` selbst
- Trigger kann jederzeit entfernt werden ohne Datenverlust

### 3. **JSONB Felder:**
- Nutzen PostgreSQL JSONB für flexible Datenstrukturen
- Können mit SQL-Queries durchsucht werden
- Beispiel: `SELECT * FROM prediction_active_models WHERE features @> '["price_close"]'::jsonb;`

### 4. **Zeitzone:**
- Alle Timestamps nutzen `TIMESTAMP WITH TIME ZONE`
- Immer UTC speichern
- Konvertierung bei Anzeige in UI

---

## 🔄 Migration & Updates

### Schema aktualisieren:

Falls Schema-Änderungen nötig sind, erstelle ein **Migration-Script**:

```sql
-- Beispiel: Neue Spalte hinzufügen
ALTER TABLE prediction_active_models 
ADD COLUMN IF NOT EXISTS alert_threshold NUMERIC(5,4) DEFAULT 0.7;
```

### Trigger neu erstellen:

```sql
-- Trigger entfernen
DROP TRIGGER IF EXISTS coin_metrics_insert_trigger ON coin_metrics;

-- Trigger neu erstellen (mit aktualisierter Funktion)
CREATE TRIGGER coin_metrics_insert_trigger
    AFTER INSERT ON coin_metrics
    FOR EACH ROW
    EXECUTE FUNCTION notify_coin_metrics_insert();
```

---

## 📚 Weitere Ressourcen

- **PostgreSQL LISTEN/NOTIFY:** https://www.postgresql.org/docs/current/sql-notify.html
- **PostgreSQL Triggers:** https://www.postgresql.org/docs/current/triggers.html
- **JSONB in PostgreSQL:** https://www.postgresql.org/docs/current/datatype-json.html

---

**Erstellt:** 2025-01-XX  
**Letzte Aktualisierung:** 2025-01-XX

