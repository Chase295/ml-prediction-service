# 🔍 Plan-Analyse: Was ist wirklich nötig?

**Datum:** 24. Dezember 2025  
**Zweck:** Kritische Analyse des Plans und Vereinfachung auf tatsächliche Anforderungen

---

## 🎯 Deine tatsächlichen Anforderungen

### Was du WILLST:
1. ✅ **Modell-Verwaltung via n8n:**
   - Modelle importieren/löschen
   - Modelle starten/stoppen
   - Status abfragen

2. ✅ **Automatische Vorhersagen:**
   - Wenn neue Daten in `coin_metrics` kommen
   - Alle aktiven Modelle ausführen
   - Ergebnisse an n8n senden

3. ✅ **n8n Integration:**
   - **NUR Informationen senden** (keine Trading-Aktionen!)
   - n8n entscheidet dann, was passiert

### Was du NICHT brauchst:
- ❌ Ensemble-Predictions (zu komplex für Start)
- ❌ Komplexes Alert-System (n8n macht das)
- ❌ Trading-Logik (n8n entscheidet)
- ❌ Webhook-Retry-Mechanik (n8n kann das)
- ❌ Partitionierung (zu früh)
- ❌ Database Triggers (Polling reicht für Start)

---

## 📊 Plan-Analyse: Was ist zu komplex?

### ❌ **Zu komplex für MVP:**

#### 1. Ensemble-Predictions (Abschnitt 7)
**Problem:** Kombiniert mehrere Modelle - sehr komplex  
**Realität:** Du willst nur einzelne Vorhersagen pro Modell an n8n senden  
**Lösung:** Später hinzufügen, wenn nötig

#### 2. Database Triggers (LISTEN/NOTIFY) (Abschnitt 3.4)
**Problem:** Komplexer Setup, DB-Änderungen nötig  
**Realität:** Polling alle 30s reicht völlig aus für Start  
**Lösung:** Polling für MVP, Trigger später

#### 3. Partitionierung (Abschnitt 3.2.1)
**Problem:** Nur nötig bei Millionen von Zeilen  
**Realität:** Du hast wahrscheinlich < 100k Vorhersagen/Tag  
**Lösung:** Später, wenn wirklich nötig

#### 4. Komplexes Alert-System (Abschnitt 8)
**Problem:** Retry-Mechanik, Webhook-Management, etc.  
**Realität:** n8n kann das besser - einfach alle Vorhersagen senden  
**Lösung:** Einfacher: Alle Vorhersagen an n8n, n8n filtert

#### 5. Feature-Engineering Pipeline (Abschnitt 5)
**Problem:** Sehr detailliert, aber wichtig  
**Realität:** ✅ **BEHALTEN** - muss identisch sein wie Training!

---

## ✅ Vereinfachter Plan (MVP)

### **Kern-Funktionen:**

#### 1. Modell-Verwaltung (API für n8n)
```
GET  /api/models              → Liste aller Modelle
POST /api/models/{id}/activate   → Modell starten
POST /api/models/{id}/deactivate → Modell stoppen
DELETE /api/models/{id}          → Modell löschen (optional)
```

#### 2. Automatische Vorhersagen
```
- Polling alle 30s auf neue coin_metrics
- Für jeden neuen Coin:
  - Hole Historie (20 Zeilen)
  - Für jedes aktive Modell:
    - Phase-Check (Skip wenn nicht passend)
    - Feature-Aufbereitung
    - Vorhersage machen
    - Speichern in DB
    - An n8n senden (ALLE Vorhersagen, nicht nur Alerts!)
```

#### 3. n8n Integration
```
POST /api/predictions/webhook → n8n sendet Vorhersagen
ODER
Service sendet direkt an n8n Webhook:
POST https://n8n.example.com/webhook/ml-predictions
Body: {
  "coin_id": "...",
  "timestamp": "...",
  "predictions": [
    {
      "model_id": 1,
      "model_name": "...",
      "prediction": 1,
      "probability": 0.85
    }
  ]
}
```

---

## 🗄️ Vereinfachtes Datenbank-Schema

### **Tabellen (nur das Nötige):**

#### 1. `predictions` (vereinfacht)
```sql
CREATE TABLE predictions (
    id BIGSERIAL PRIMARY KEY,
    coin_id VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    model_id BIGINT NOT NULL REFERENCES ml_models(id),
    prediction INTEGER NOT NULL CHECK (prediction IN (0, 1)),
    probability NUMERIC(5, 4) NOT NULL CHECK (probability >= 0 AND probability <= 1),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indizes
CREATE INDEX idx_predictions_coin_timestamp ON predictions(coin_id, timestamp DESC);
CREATE INDEX idx_predictions_model ON predictions(model_id);
```

**Entfernt:**
- ❌ `ensemble_predictions` Tabelle (zu komplex)
- ❌ `prediction_alerts` Tabelle (n8n macht das)
- ❌ `features` JSONB (optional, nur für Debugging)
- ❌ `prediction_duration_ms` (optional, später)

#### 2. `ml_models` Erweiterungen (minimal)
```sql
ALTER TABLE ml_models 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT FALSE;

-- Index
CREATE INDEX idx_ml_models_active ON ml_models(is_active) 
WHERE is_active = TRUE AND status = 'READY';
```

**Entfernt:**
- ❌ `alert_threshold` (n8n entscheidet)
- ❌ `ensemble_weight` (kein Ensemble)
- ❌ `last_prediction_at` (optional)
- ❌ `total_predictions` (optional)

---

## 🔄 Vereinfachter Workflow

### **Workflow 1: Neuer Eintrag in coin_metrics**

```
[1] Polling erkennt neuen Eintrag (alle 30s)
    ↓
[2] Für jeden Coin:
    ↓
[3] Hole Historie (20 Zeilen)
    ↓
[4] Für jedes aktive Modell:
    - Phase-Check → Skip wenn nicht passend
    - Feature-Aufbereitung
    - Vorhersage machen
    - Speichern in DB
    ↓
[5] Sammle ALLE Vorhersagen
    ↓
[6] Sende an n8n Webhook (einmal pro Coin, alle Modelle)
    POST https://n8n.example.com/webhook/ml-predictions
    Body: {
      "coin_id": "...",
      "timestamp": "...",
      "predictions": [
        {"model_id": 1, "prediction": 1, "probability": 0.85},
        {"model_id": 2, "prediction": 0, "probability": 0.23}
      ]
    }
    ↓
[7] n8n entscheidet was passiert (Trading, Alerts, etc.)
```

**Vorteile:**
- ✅ Einfach
- ✅ n8n hat alle Informationen
- ✅ n8n kann filtern/thresholds setzen
- ✅ Keine komplexe Alert-Logik nötig

---

## 📡 Vereinfachte API

### **Modell-Verwaltung:**
```
GET    /api/models                    → Liste aller Modelle
GET    /api/models/active             → Nur aktive Modelle
POST   /api/models/{id}/activate      → Modell starten
POST   /api/models/{id}/deactivate    → Modell stoppen
GET    /api/models/{id}               → Modell-Details
```

### **Vorhersagen:**
```
GET    /api/predictions               → Liste (mit Filtern)
GET    /api/predictions/latest/{coin} → Neueste für Coin
POST   /api/predict                   → Manuelle Vorhersage (optional)
```

### **Status:**
```
GET    /api/health                    → Health Check
GET    /api/metrics                   → Prometheus Metriken
GET    /api/stats                     → Statistiken
```

**Entfernt:**
- ❌ Ensemble-Endpoints
- ❌ Alert-Management
- ❌ Webhook-Konfiguration (hardcoded oder ENV)

---

## ⚙️ Vereinfachte Konfiguration

### **Environment Variables (minimal):**
```bash
# Datenbank
DB_DSN=postgresql://...

# Modell-Storage
MODEL_STORAGE_PATH=/app/models

# Event-Handling
POLLING_INTERVAL_SECONDS=30

# n8n Integration
N8N_WEBHOOK_URL=https://n8n.example.com/webhook/ml-predictions
N8N_WEBHOOK_TIMEOUT=5  # Sekunden

# Performance
MAX_CONCURRENT_PREDICTIONS=10
MODEL_CACHE_SIZE=10
```

**Entfernt:**
- ❌ Ensemble-Konfiguration
- ❌ Alert-Thresholds (n8n macht das)
- ❌ Webhook-Retry-Konfiguration

---

## 🎯 Was BEHALTEN (wichtig!)

### ✅ **Feature-Engineering (Abschnitt 5)**
**Warum:** Muss identisch sein wie Training Service!  
**Was:** Alle Features, NaN/Inf Handling, Data Leakage Prevention

### ✅ **Modell-Caching (Abschnitt 4.3)**
**Warum:** Performance-Kritisch!  
**Was:** LRU Cache, Preload, Refresh

### ✅ **Phase-Filtering (Abschnitt 4.5)**
**Warum:** Wichtig für Modell-Genauigkeit!  
**Was:** Skip Modelle wenn Phase nicht passt

### ✅ **Batch-Processing (Abschnitt 4.2)**
**Warum:** Effizienz!  
**Was:** Sammle Events, verarbeite in Batches

---

## 📋 MVP vs. Vollständiger Plan

| Feature | Vollständiger Plan | MVP (Empfohlen) |
|---------|-------------------|-----------------|
| **Modell-Verwaltung** | ✅ | ✅ |
| **Automatische Vorhersagen** | ✅ | ✅ |
| **Feature-Engineering** | ✅ | ✅ |
| **Phase-Filtering** | ✅ | ✅ |
| **Modell-Caching** | ✅ | ✅ |
| **n8n Integration** | ✅ | ✅ |
| **Polling** | ✅ (Fallback) | ✅ (Primär) |
| **Database Triggers** | ✅ (Primär) | ❌ (Später) |
| **Ensemble-Predictions** | ✅ | ❌ (Später) |
| **Alert-System** | ✅ (Komplex) | ❌ (n8n macht das) |
| **Partitionierung** | ✅ | ❌ (Später) |
| **Webhook-Retry** | ✅ | ❌ (n8n macht das) |

---

## 🚀 Empfohlene Implementierungs-Reihenfolge

### **Phase 1: MVP (2-3 Wochen)**
1. ✅ Datenbank-Schema (vereinfacht)
2. ✅ Modell-Verwaltung (API)
3. ✅ Polling-System
4. ✅ Feature-Engine (identisch wie Training)
5. ✅ Prediction-Engine
6. ✅ n8n Webhook (einfach: alle Vorhersagen senden)

### **Phase 2: Optimierungen (später)**
1. ⏳ Database Triggers (LISTEN/NOTIFY)
2. ⏳ Ensemble-Predictions
3. ⏳ Erweiterte Metriken
4. ⏳ Partitionierung (wenn nötig)

---

## 💡 Empfehlung

### **Dein Plan ist zu komplex für MVP!**

**Aber:** Die Grundidee ist richtig! Nur zu viele Features für den Start.

**Empfehlung:**
1. ✅ **Starte mit MVP** (vereinfachter Plan)
2. ✅ **Fokus auf Kern-Funktionen:**
   - Modell-Verwaltung
   - Automatische Vorhersagen
   - n8n Integration (einfach)
3. ✅ **Später erweitern:**
   - Ensemble (wenn nötig)
   - Triggers (wenn Performance-Probleme)
   - Alerts (wenn n8n nicht reicht)

**Vorteile:**
- ✅ Schneller fertig (2-3 Wochen statt 2-3 Monate)
- ✅ Weniger Fehlerquellen
- ✅ Einfacher zu testen
- ✅ Einfacher zu warten
- ✅ n8n übernimmt komplexe Logik (besser!)

---

## ✅ Finale Empfehlung

**Nutze die Schritt-für-Schritt-Anleitung (`ML_PREDICTION_SERVICE_AUFBAU_ANLEITUNG.md`), aber:**

1. ❌ **Überspringe:** Ensemble, Triggers, Partitionierung, komplexe Alerts
2. ✅ **Fokus auf:** Modell-Verwaltung, Vorhersagen, n8n Webhook
3. ✅ **Behalte:** Feature-Engineering, Caching, Phase-Filtering

**Das reicht für MVP! Später kannst du erweitern.**

---

**Status:** ✅ Analyse abgeschlossen  
**Nächster Schritt:** MVP-Implementierung starten

