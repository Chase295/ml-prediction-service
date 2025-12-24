# 🤖 ML Prediction Service

**Status:** 📋 Planungsphase  
**Version:** 1.0  
**Datum:** 24. Dezember 2025

---

## 📋 Übersicht

Der **ML Prediction Service** ist ein Echtzeit-Vorhersage-Service, der automatisch Vorhersagen macht, sobald neue Daten in die `coin_metrics` Tabelle eingetragen werden.

### Hauptfunktion

**Echtzeit-Vorhersagen für alle Coins mit allen aktiven Modellen.**

---

## 🎯 Was macht der Service?

1. ✅ **Überwacht `coin_metrics`** auf neue Einträge
2. ✅ **Lädt aktive Modelle** aus `ml_models` Tabelle
3. ✅ **Sammelt Historie** für jeden Coin (für Feature-Engineering)
4. ✅ **Bereitet Features auf** (gleiche Logik wie Training Service)
5. ✅ **Macht Vorhersagen** mit allen aktiven Modellen
6. ✅ **Speichert Ergebnisse** in `predictions` Tabelle
7. ✅ **Sendet Alerts** bei hoher Wahrscheinlichkeit (optional)

---

## 📚 Dokumentation

### ⭐ Start hier: [PROJEKT_PLAN.md](PROJEKT_PLAN.md)

Der Projektplan enthält:
- ✅ Vollständige Architektur
- ✅ Alle Funktionen im Detail
- ✅ API-Endpunkte
- ✅ Datenbank-Schema
- ✅ Workflow-Beispiele
- ✅ Konfiguration
- ✅ Deployment-Strategie
- ✅ Erweiterungen

---

## 🏗️ Architektur (Kurz)

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

## 🔌 API (Geplant)

### Modell-Verwaltung
- `GET /api/models/active` - Liste aktiver Modelle
- `POST /api/models/{id}/activate` - Modell aktivieren
- `POST /api/models/{id}/deactivate` - Modell deaktivieren
- `POST /api/models/{id}/reload` - Modell neu laden

### Vorhersagen
- `POST /api/predict` - Manuelle Vorhersage
- `GET /api/predictions` - Liste aller Vorhersagen
- `GET /api/predictions/latest/{coin_id}` - Neueste Vorhersage

### Status
- `GET /api/health` - Health Check
- `GET /api/metrics` - Prometheus Metriken
- `GET /api/stats` - Statistiken

---

## 🗄️ Datenbank

### Neue Tabellen

#### `predictions`
Speichert alle Vorhersagen.

**Felder:**
- `id`, `coin_id`, `timestamp`
- `model_id` (Foreign Key zu ml_models)
- `prediction` (0 oder 1)
- `probability` (0.0 - 1.0)
- `features` (JSONB, optional)

#### `prediction_alerts` (Optional)
Speichert ausgelöste Alerts.

### Erweiterungen

#### `ml_models`
- `is_active` (BOOLEAN) - Ist Modell aktiv?
- `alert_threshold` (NUMERIC) - Threshold für Alerts

---

## ⚙️ Technologie-Stack

- **Backend:** FastAPI (Python 3.11)
- **Datenbank:** PostgreSQL (asyncpg)
- **ML-Frameworks:** Scikit-learn, XGBoost
- **Monitoring:** Prometheus Metriken
- **Deployment:** Docker, Coolify

---

## 📊 Features

### Kern-Funktionen
- ✅ Echtzeit-Vorhersagen
- ✅ Multi-Modell-Support
- ✅ Feature-Engineering (gleiche Logik wie Training)
- ✅ Modell-Caching
- ✅ Batch-Verarbeitung
- ✅ Alert-System

### Geplant (Später)
- 🔄 Ensemble-Vorhersagen
- 🔄 Real-time WebSocket
- 🔄 Modell-Auto-Selection
- 🔄 Advanced Alerts

---

## 🚀 Nächste Schritte

1. ✅ **Planungsphase abgeschlossen**
2. ⏳ **Implementierung starten** (nach Genehmigung des Plans)
3. ⏳ **Testing**
4. ⏳ **Deployment**

---

## 📝 Wichtige Hinweise

### Code-Wiederverwendung
- Feature-Engineering: Gleiche Logik wie Training Service
- Modell-Laden: Ähnliche Logik wie Testing
- **Empfehlung:** Import aus Training Service für Start

### Performance
- Modell-Caching für schnelle Vorhersagen
- Batch-Verarbeitung für Effizienz
- Parallel-Verarbeitung für Skalierung

### Integration
- **ML Training Service:** Lädt Modelle aus `ml_models`
- **Pump Metrics Service:** Reagiert auf neue `coin_metrics`
- **n8n:** Vollständig API-kompatibel

---

## 📖 Vollständiger Plan

Siehe **[PROJEKT_PLAN.md](PROJEKT_PLAN.md)** für alle Details.

---

**Status:** 📋 Planungsphase  
**Nächster Schritt:** Plan durchgehen und genehmigen

