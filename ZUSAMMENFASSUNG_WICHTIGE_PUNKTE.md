# 📋 Zusammenfassung: Wichtigste Punkte - ML Prediction Service

**Datum:** 24. Dezember 2025  
**Status:** Planungsphase abgeschlossen, bereit für Implementierung

---

## 🎯 Kern-Funktionen

### 1. **Modell-Verwaltung (via n8n oder UI)**
- ✅ Modelle vom Training Service importieren (Download + lokale Speicherung)
- ✅ Modelle aktivieren/deaktivieren
- ✅ Modelle löschen (aus DB + lokale Datei)
- ✅ Status abfragen

### 2. **Automatische Vorhersagen**
- ✅ **LISTEN/NOTIFY** für Echtzeit (< 100ms Latency)
- ✅ **Polling-Fallback** alle 30s (wenn LISTEN/NOTIFY nicht verfügbar)
- ✅ Batch-Verarbeitung (max 50 Events oder 5s Timeout)
- ✅ Alle aktiven Modelle parallel ausführen
- ✅ Phase-Filtering (nur passende Phasen)

### 3. **n8n Integration**
- ✅ **ALLE Vorhersagen** an n8n senden (nicht nur Alerts!)
- ✅ n8n entscheidet dann (Filter, Thresholds, Trading, etc.)
- ✅ Webhook-Logging für Debugging

---

## 🗄️ Datenbank-Design

### **Getrennte Tabellen-Struktur (separater Server!)**

#### ✅ `prediction_active_models` (NEU)
- Lokale Tabelle im Prediction Service
- Speichert importierte Modelle
- **KEIN `is_active` in `ml_models`!** (separater Server)

#### ✅ `predictions`
- Alle Vorhersagen
- Verlinkt zu `prediction_active_models.id`
- Speichert: coin_id, model_id, prediction, probability, timestamp

#### ✅ `prediction_webhook_log` (optional)
- Logs für n8n Webhook-Calls
- Debugging und Monitoring

#### ✅ LISTEN/NOTIFY Trigger
- Trigger in `coin_metrics` für Echtzeit-Kommunikation
- Automatische Notification bei neuen Einträgen

---

## 🔧 Technische Details

### **Modell-Download & Speicherung**
- ✅ Modell-Dateien werden vom Training Service heruntergeladen
- ✅ Lokale Speicherung in `MODEL_STORAGE_PATH`
- ✅ Kein Shared Storage nötig (separater Server!)

### **Feature-Engineering**
- ✅ **MUSS identisch sein wie Training Service!**
- ✅ Gleiche `window_sizes` verwenden
- ✅ Features in GLEICHER Reihenfolge
- ✅ **Verschiedene Metriken berücksichtigen:**
  - Prüft ob benötigte Features in `coin_metrics` vorhanden sind
  - Nur benötigte Spalten laden (Performance)
  - Fehler bei fehlenden Features

### **Data Leakage Prevention**
- ✅ Bei zeitbasierter Vorhersage: `target_variable` NICHT als Feature verwenden
- ✅ Automatische Entfernung in Feature-Processor

---

## 🎨 Streamlit UI

### **Seiten:**
1. **🏠 Übersicht** - Aktive Modelle, Statistiken
2. **📥 Modell importieren** - Liste verfügbarer Modelle, Import
3. **⚙️ Modell verwalten** - Aktivieren/Deaktivieren, Löschen
4. **📊 Vorhersagen** - Liste aller Vorhersagen (mit Filtern)
5. **📈 Statistiken** - Charts und Metriken

### **Ports:**
- Port **8000**: FastAPI (API, Health, Metrics)
- Port **8501**: Streamlit UI

---

## 📡 API-Endpunkte

### **Modell-Verwaltung:**
```
GET    /api/models/available          → Liste verfügbarer Modelle (aus ml_models)
POST   /api/models/import              → Importiert Modell (Download + Speicherung)
GET    /api/models/active             → Liste aktiver Modelle (aus prediction_active_models)
POST   /api/models/{id}/activate      → Aktiviert Modell
POST   /api/models/{id}/deactivate    → Deaktiviert Modell
DELETE /api/models/{id}                → Löscht Modell (DB + Datei)
```

### **Vorhersagen:**
```
POST   /api/predict                   → Manuelle Vorhersage
GET    /api/predictions               → Liste (mit Filtern)
GET    /api/predictions/latest/{coin} → Neueste für Coin
```

### **System:**
```
GET    /api/health                    → Health Check (JSON)
GET    /api/metrics                   → Prometheus Metrics
GET    /api/stats                     → Statistiken
```

---

## 🐳 Docker & Deployment

### **Dockerfile:**
- Python 3.11-slim
- Supervisor für FastAPI + Streamlit
- Health Check auf `/api/health`
- Externe Datenbank (nicht im Container!)

### **Environment Variables:**
```bash
# Datenbank (EXTERNE DB!)
DB_DSN=postgresql://user:pass@EXTERNE_DB_HOST:5432/crypto

# Modell-Storage (lokal)
MODEL_STORAGE_PATH=/app/models

# Training Service (für Modell-Download)
TRAINING_SERVICE_API_URL=http://localhost:8000/api

# n8n Integration (optional)
N8N_WEBHOOK_URL=https://n8n.example.com/webhook/ml-predictions

# Event-Handling
POLLING_INTERVAL_SECONDS=30
BATCH_SIZE=50
BATCH_TIMEOUT_SECONDS=5

# Performance
MAX_CONCURRENT_PREDICTIONS=10
MODEL_CACHE_SIZE=10
```

---

## ⚠️ Wichtige Regeln

### **1. Separate Tabellen**
- ❌ **KEIN `is_active` in `ml_models`!**
- ✅ Nutze `prediction_active_models` (lokal)
- ✅ Modell-Download vom Training Service

### **2. Feature-Engineering**
- ✅ **MUSS identisch sein wie Training Service!**
- ✅ Gleiche `window_sizes`
- ✅ Gleiche Reihenfolge
- ✅ Prüfe verfügbare Metriken in `coin_metrics`

### **3. n8n Integration**
- ✅ **ALLE Vorhersagen senden** (nicht nur Alerts!)
- ✅ n8n filtert dann selbst
- ✅ Keine komplexe Alert-Logik nötig

### **4. LISTEN/NOTIFY**
- ✅ Primär: LISTEN/NOTIFY für Echtzeit
- ✅ Fallback: Polling alle 30s
- ✅ Automatischer Fallback bei Fehlern

---

## 📊 Workflow

### **1. Modell importieren:**
```
1. GET /api/models/available → Liste verfügbarer Modelle
2. POST /api/models/import → Download + Speicherung
3. Modell ist aktiv und bereit
```

### **2. Automatische Vorhersage:**
```
1. Neuer Eintrag in coin_metrics
2. PostgreSQL NOTIFY → Event-Handler
3. Batch-Verarbeitung (max 50 oder 5s)
4. Für jeden Coin:
   - Historie laden (20 Zeilen)
   - Für jedes aktive Modell:
     - Phase-Check
     - Feature-Aufbereitung
     - Vorhersage machen
     - Speichern in DB
5. ALLE Vorhersagen an n8n senden
6. n8n entscheidet was passiert
```

---

## ✅ Checkliste vor Implementierung

### **Datenbank:**
- [ ] `prediction_active_models` Tabelle erstellt
- [ ] `predictions` Tabelle erstellt
- [ ] `prediction_webhook_log` Tabelle erstellt
- [ ] LISTEN/NOTIFY Trigger erstellt
- [ ] Indizes erstellt

### **Code:**
- [ ] Modell-Download implementiert
- [ ] Feature-Engineering (identisch wie Training)
- [ ] LISTEN/NOTIFY Event-Handler
- [ ] Polling-Fallback
- [ ] n8n Webhook-Integration
- [ ] Streamlit UI
- [ ] Prometheus Metrics

### **Testing:**
- [ ] Modell-Import funktioniert
- [ ] LISTEN/NOTIFY funktioniert
- [ ] Polling-Fallback funktioniert
- [ ] Feature-Engineering korrekt
- [ ] n8n Webhook funktioniert
- [ ] Streamlit UI funktioniert

---

## 🚀 Nächste Schritte

1. **Datenbank-Schema erstellen** (Schritt 2)
2. **Projektstruktur aufbauen** (Schritt 1)
3. **Modell-Download implementieren** (Schritt 9)
4. **Event-Handler mit LISTEN/NOTIFY** (Schritt 11)
5. **Streamlit UI** (Schritt 18)
6. **Testing** (Schritt 19)

---

**Status:** ✅ Planung abgeschlossen  
**Nächster Schritt:** Implementierung starten (Schritt 1 der Anleitung)

