# 🚨 Alert-System - Umsetzungsplan

**Version:** 1.0  
**Datum:** 25. Dezember 2025  
**Ziel:** Umfassendes Alert-Management mit Erfolgs-Tracking

---

## 📋 Zusammenfassung der Anforderungen

### **Was der Benutzer möchte:**

1. **Neuer Reiter "Alerts"** in der Streamlit UI
   - Zeigt alle Alerts an
   - **Pro Coin nur 1 Alert** (der **älteste** - da zu diesem Zeitpunkt gekauft wird)
   - Wichtigste Infos im Reiter (kompakt)

2. **Detail-Seite für Alerts**
   - Alle wichtigen Infos zum Alert
   - **Coin-Werte anzeigen** (Preis, Volume, Market Cap, Buy/Sell Ratio, etc.)
   - **Alle weiteren Alerts vom selben Coin** (in der Detail-Ansicht)
   - **Auswertung nach Ablauf der Zeit:**
     - Zeit, die im Modell verwendet wurde (z.B. 5 Min)
     - ✅ **Erfolgreich:** Alert hat sein Ziel erreicht
     - ❌ **Fehlgeschlagen:** Alert hat sein Ziel NICHT erreicht
     - ⏳ **Laufend:** Alert ist noch in der Zeitspanne (noch nicht abgelaufen)
   - **Erweiterte Zeitachse:** Mehr Zeit vor dem Alert und nach dem Ende anzeigen
   - **Umfassende Metriken:** Nicht nur Preis, sondern alle wichtigen Werte (Volume, Market Cap, etc.)

---

## 🎯 Erweiterte Ideen & Vorschläge

### **1. Alert-Status-Tracking**

**Separate Tabelle `alert_evaluations` (sauberer):**
```sql
CREATE TABLE IF NOT EXISTS alert_evaluations (
    id BIGSERIAL PRIMARY KEY,
    prediction_id BIGINT NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
    coin_id VARCHAR(255) NOT NULL,
    model_id BIGINT NOT NULL,
    
    -- Alert-Konfiguration (zum Zeitpunkt des Alerts)
    -- WICHTIG: Unterstützt sowohl zeitbasierte als auch klassische Vorhersagen!
    prediction_type VARCHAR(20) NOT NULL,  -- 'time_based' oder 'classic'
    
    -- Zeitbasierte Vorhersage (wenn prediction_type = 'time_based')
    target_variable VARCHAR(100),  -- z.B. "price_close"
    future_minutes INTEGER,        -- z.B. 5
    price_change_percent NUMERIC(10, 4),  -- z.B. 30.0
    target_direction VARCHAR(10),  -- "up" oder "down"
    
    -- Klassische Vorhersage (wenn prediction_type = 'classic')
    target_operator VARCHAR(10),  -- ">", "<", ">=", "<=", "="
    target_value NUMERIC(20, 2),  -- z.B. 50000.0
    
    -- Werte zum Zeitpunkt des Alerts (umfassend)
    alert_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    price_close_at_alert NUMERIC(20, 8) NOT NULL,
    price_open_at_alert NUMERIC(20, 8),
    price_high_at_alert NUMERIC(20, 8),
    price_low_at_alert NUMERIC(20, 8),
    market_cap_close_at_alert NUMERIC(20, 2),
    market_cap_open_at_alert NUMERIC(20, 2),
    volume_sol_at_alert NUMERIC(20, 2),
    volume_usd_at_alert NUMERIC(20, 2),
    buy_volume_sol_at_alert NUMERIC(20, 2),
    sell_volume_sol_at_alert NUMERIC(20, 2),
    num_buys_at_alert INTEGER,
    num_sells_at_alert INTEGER,
    unique_wallets_at_alert INTEGER,
    phase_id_at_alert INTEGER,
    -- Weitere Metriken können hier hinzugefügt werden
    
    -- Werte nach Ablauf der Zeit (umfassend)
    evaluation_timestamp TIMESTAMP WITH TIME ZONE,  -- alert_timestamp + future_minutes (oder NULL bei classic)
    price_close_at_evaluation NUMERIC(20, 8),
    price_open_at_evaluation NUMERIC(20, 8),
    price_high_at_evaluation NUMERIC(20, 8),
    price_low_at_evaluation NUMERIC(20, 8),
    market_cap_close_at_evaluation NUMERIC(20, 2),
    market_cap_open_at_evaluation NUMERIC(20, 2),
    volume_sol_at_evaluation NUMERIC(20, 2),
    volume_usd_at_evaluation NUMERIC(20, 2),
    buy_volume_sol_at_evaluation NUMERIC(20, 2),
    sell_volume_sol_at_evaluation NUMERIC(20, 2),
    num_buys_at_evaluation INTEGER,
    num_sells_at_evaluation INTEGER,
    unique_wallets_at_evaluation INTEGER,
    phase_id_at_evaluation INTEGER,
    
    -- Berechnete Werte
    actual_price_change_pct NUMERIC(10, 4),  -- Für time_based
    actual_value_at_evaluation NUMERIC(20, 2),  -- Für classic (z.B. price_close)
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- 'pending', 'success', 'failed', 'expired', 'not_applicable'
    evaluated_at TIMESTAMP WITH TIME ZONE,
    evaluation_note TEXT,  -- Zusätzliche Info (z.B. warum fehlgeschlagen)
    
    -- Metadaten
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_alert_evaluations_coin_timestamp ON alert_evaluations(coin_id, alert_timestamp ASC);  -- ASC für ältesten zuerst!
CREATE INDEX idx_alert_evaluations_status ON alert_evaluations(status) WHERE status = 'pending';
CREATE INDEX idx_alert_evaluations_prediction ON alert_evaluations(prediction_id);
CREATE INDEX idx_alert_evaluations_type ON alert_evaluations(prediction_type);
```

**Vorteil:** 
- Saubere Trennung, keine Änderung an bestehender `predictions` Tabelle
- Unterstützt sowohl zeitbasierte als auch klassische Vorhersagen
- Umfassende Metriken-Speicherung

---

### **2. Alert-Übersichtsseite (Reiter "Alerts")**

**Funktionen:**
- **Filter:**
  - Status (Alle, Laufend, Erfolgreich, Fehlgeschlagen)
  - Modell
  - Zeitraum (Heute, Letzte 24h, Letzte 7 Tage, Custom)
  - Coin-ID (Suche)
  
- **Anzeige pro Coin (nur ältester Alert - da zu diesem Zeitpunkt gekauft wird):**
  - Coin-ID (kurz)
  - Modell-Name
  - Alert-Zeitpunkt (ältester)
  - Ziel (z.B. "5 Min, +30%" oder "price_close > 50000")
  - Vorhersage-Typ (⏰ Zeitbasiert / 🎯 Klassisch)
  - Wahrscheinlichkeit
  - Status (🟢 Laufend, ✅ Erfolgreich, ❌ Fehlgeschlagen)
  - Aktueller Preis (wenn verfügbar)
  - Verbleibende Zeit (bei laufenden Alerts)
  - Anzahl weiterer Alerts für diesen Coin (z.B. "+3 weitere")
  
- **Sortierung:**
  - Standard: Älteste zuerst (für Kauf-Entscheidung wichtig)
  - Optional: Nach Status, Modell, Coin-ID, Neueste zuerst

- **Aktionen:**
  - Klick auf Alert → Detail-Seite
  - Button "Details anzeigen"

---

### **3. Alert-Detail-Seite**

**Sektionen:**

#### **3.1 Alert-Informationen**
- Coin-ID (vollständig)
- Modell-Name & ID
- Alert-Zeitpunkt
- Wahrscheinlichkeit
- Ziel-Konfiguration:
  - Variable (z.B. `price_close`)
  - Zeitraum (z.B. 5 Minuten)
  - Erwartete Änderung (z.B. +30%)
  - Richtung (📈 Steigt / 📉 Fällt)

#### **3.2 Coin-Werte zum Zeitpunkt des Alerts**
- `price_close`, `price_open`, `price_high`, `price_low`
- `market_cap_close`, `market_cap_open`
- `volume_sol`, `volume_usd`
- `buy_volume_sol`, `sell_volume_sol`
- `num_buys`, `num_sells`
- `unique_wallets`
- `phase_id`
- Alle anderen relevanten Metriken

#### **3.3 Status & Auswertung**
- **Status-Badge:**
  - 🟢 **Laufend:** Alert ist noch aktiv (Zeit noch nicht abgelaufen)
  - ✅ **Erfolgreich:** Ziel wurde erreicht (z.B. Preis stieg um ≥30% in 5 Min)
  - ❌ **Fehlgeschlagen:** Ziel wurde NICHT erreicht
  - ⏸️ **Abgelaufen:** Zeit abgelaufen, aber noch nicht ausgewertet

- **Zeit-Informationen:**
  - Alert erstellt: `2025-12-25 16:00:00`
  - Auswertungs-Zeitpunkt: `2025-12-25 16:05:00` (Alert-Zeit + 5 Min)
  - Verbleibende Zeit: `2 Min 30 Sek` (bei laufenden Alerts)
  - Abgelaufen vor: `5 Min 30 Sek` (bei abgelaufenen Alerts)

- **Ergebnis (wenn ausgewertet):**
  - Preis zum Zeitpunkt des Alerts: `$0.001234`
  - Preis nach Ablauf: `$0.001567`
  - Tatsächliche Änderung: `+26.95%` (oder `-5.23%`)
  - Ziel: `+30.0%`
  - **Status:** ✅ Erfolgreich (wenn ≥30%) oder ❌ Fehlgeschlagen (wenn <30%)

#### **3.4 Erweiterte Charts & Visualisierung**

**Zeitachse-Erweiterung:**
- **Vor dem Alert:** Zeige z.B. 10-15 Minuten VOR dem Alert (Kontext)
- **Alert-Zeitraum:** Vom Alert bis zur Auswertung (z.B. 5 Min)
- **Nach der Auswertung:** Zeige z.B. 10-15 Minuten NACH der Auswertung (weitere Entwicklung)

**Multi-Metriken-Charts:**

1. **Preis-Chart:**
   - `price_close` über die Zeit
   - `price_high` und `price_low` (Bereich)
   - Markierungen:
     - 🟢 Alert-Zeitpunkt (Start)
     - 🎯 Ziel-Preis (z.B. `price_at_alert * 1.30` für +30%)
     - 🔴 Auswertungs-Zeitpunkt (Ende)
     - 📊 Höchster Preis im Zeitraum
     - 📉 Niedrigster Preis im Zeitraum
     - Aktueller Preis (wenn noch laufend)

2. **Volume-Chart:**
   - `volume_sol` über die Zeit
   - `buy_volume_sol` vs. `sell_volume_sol` (gestapelt)
   - Markierungen für Alert- und Auswertungs-Zeitpunkt

3. **Market Cap-Chart:**
   - `market_cap_close` über die Zeit
   - Markierungen für Alert- und Auswertungs-Zeitpunkt

4. **Buy/Sell Ratio-Chart:**
   - Verhältnis `num_buys` / `num_sells` über die Zeit
   - Markierungen für Alert- und Auswertungs-Zeitpunkt

5. **Kombiniertes Dashboard:**
   - Alle Charts nebeneinander
   - Synchronisierte Zeitachse
   - Zoom-Funktion

**Zusatz-Info-Karten:**
- Höchster/Niedrigster Preis im Zeitraum
- Durchschnittlicher Preis
- Gesamt-Volume im Zeitraum
- Durchschnittliches Buy/Sell Ratio
- Maximale Market Cap
- Minimale Market Cap

#### **3.5 Alle weiteren Alerts vom selben Coin**
- **Liste aller Alerts** für diesen Coin (chronologisch)
- Kompakte Karten-Ansicht
- Status-Badges
- Klick auf anderen Alert → Wechsel zur Detail-Ansicht dieses Alerts
- Filter: Nur erfolgreiche, nur fehlgeschlagene, etc.

#### **3.6 Umfassende Metriken-Entwicklung**
- **Preis-Entwicklung:** 
  - Start → Ende
  - Höchster/Niedrigster
  - Durchschnitt
  - Volatilität
  
- **Volume-Entwicklung:**
  - Gesamt-Volume
  - Buy vs. Sell Volume
  - Volume-Spitzen
  
- **Market Cap-Entwicklung:**
  - Start → Ende
  - Höchster/Niedrigster
  - Durchschnitt
  
- **Buy/Sell Ratio:**
  - Durchschnitt
  - Spitzen
  - Trend
  
- **Unique Wallets:**
  - Anzahl zum Zeitpunkt des Alerts
  - Anzahl zur Auswertung
  - Änderung
  
- **Phase-Entwicklung:**
  - Phase zum Zeitpunkt des Alerts
  - Phase zur Auswertung
  - Phase-Änderungen im Zeitraum

#### **3.7 Statistiken & Auswertung**
- **Alert-Erfolgsrate für dieses Modell:**
  - Gesamt: 150 Alerts
  - Erfolgreich: 45 (30%)
  - Fehlgeschlagen: 105 (70%)
  - Laufend: 10
  
- **Durchschnittliche Abweichung (nur für zeitbasierte Vorhersagen):**
  - Durchschnittliche tatsächliche Änderung: `+18.5%`
  - Durchschnittliche erwartete Änderung: `+30.0%`
  - Durchschnittliche Abweichung: `-11.5%`
  
- **Durchschnittliche Metriken-Entwicklung (für erfolgreiche Alerts):**
  - Durchschnittliche Preis-Änderung: `+32.5%`
  - Durchschnittliche Volume-Änderung: `+150%`
  - Durchschnittliche Market Cap-Änderung: `+35%`
  - Durchschnittliche Buy/Sell Ratio: `2.5:1`
  
- **Vergleich: Erfolgreich vs. Fehlgeschlagen:**
  - Durchschnittliche Preis-Änderung (erfolgreich): `+32.5%`
  - Durchschnittliche Preis-Änderung (fehlgeschlagen): `+5.2%`
  - Durchschnittliche Volume-Änderung (erfolgreich): `+150%`
  - Durchschnittliche Volume-Änderung (fehlgeschlagen): `+20%`

---

### **4. Hintergrund-Job: Alert-Auswertung**

**Funktion:**
- Läuft alle 1-2 Minuten
- Findet alle Alerts mit Status `pending`, deren `evaluation_timestamp` erreicht wurde
- **Unterscheidet zwischen zeitbasierten und klassischen Vorhersagen**
- Lädt **ALLE relevanten Metriken** aus `coin_metrics` für den Auswertungs-Zeitpunkt
- Berechnet tatsächliche Änderung (für zeitbasierte) oder prüft Bedingung (für klassische)
- Vergleicht mit Ziel
- Setzt Status auf `success` oder `failed`
- Speichert **ALLE Metriken** (Preis, Volume, Market Cap, etc.)

**SQL-Query für Auswertung:**

**Zeitbasierte Vorhersagen:**
```sql
-- Finde alle auswertbaren Alerts (zeitbasiert)
SELECT * FROM alert_evaluations
WHERE status = 'pending'
  AND prediction_type = 'time_based'
  AND evaluation_timestamp <= NOW()
ORDER BY evaluation_timestamp ASC
LIMIT 100;  -- Batch-Verarbeitung

-- Für jeden Alert:
-- 1. Hole ALLE Metriken zum Auswertungs-Zeitpunkt aus coin_metrics
SELECT 
    price_close, price_open, price_high, price_low,
    market_cap_close, market_cap_open,
    volume_sol, volume_usd,
    buy_volume_sol, sell_volume_sol,
    num_buys, num_sells,
    unique_wallets,
    phase_id
FROM coin_metrics
WHERE coin_id = $1
  AND timestamp <= $2  -- evaluation_timestamp
ORDER BY timestamp DESC
LIMIT 1;

-- 2. Berechne Änderung
actual_change = ((price_close_at_evaluation - price_close_at_alert) / price_close_at_alert) * 100

-- 3. Vergleiche mit Ziel
IF target_direction = 'up':
    success = actual_change >= price_change_percent
ELSE:
    success = actual_change <= -price_change_percent

-- 4. Update Status mit ALLEN Metriken
UPDATE alert_evaluations
SET status = CASE WHEN success THEN 'success' ELSE 'failed' END,
    price_close_at_evaluation = $1,
    price_open_at_evaluation = $2,
    price_high_at_evaluation = $3,
    price_low_at_evaluation = $4,
    market_cap_close_at_evaluation = $5,
    market_cap_open_at_evaluation = $6,
    volume_sol_at_evaluation = $7,
    volume_usd_at_evaluation = $8,
    buy_volume_sol_at_evaluation = $9,
    sell_volume_sol_at_evaluation = $10,
    num_buys_at_evaluation = $11,
    num_sells_at_evaluation = $12,
    unique_wallets_at_evaluation = $13,
    phase_id_at_evaluation = $14,
    actual_price_change_pct = $15,
    evaluated_at = NOW(),
    updated_at = NOW()
WHERE id = $16;
```

**Klassische Vorhersagen:**
```sql
-- Finde alle auswertbaren Alerts (klassisch)
-- Für klassische Vorhersagen: Auswertung nach X Minuten (z.B. 5 Min) oder sofort?
-- Vorschlag: Auch hier nach X Minuten auswerten (konfigurierbar, z.B. 5 Min)

SELECT * FROM alert_evaluations
WHERE status = 'pending'
  AND prediction_type = 'classic'
  AND evaluation_timestamp <= NOW()  -- alert_timestamp + X Minuten
ORDER BY evaluation_timestamp ASC
LIMIT 100;

-- Für jeden Alert:
-- 1. Hole Wert der target_variable zum Auswertungs-Zeitpunkt
SELECT {target_variable} as actual_value
FROM coin_metrics
WHERE coin_id = $1
  AND timestamp <= $2  -- evaluation_timestamp
ORDER BY timestamp DESC
LIMIT 1;

-- 2. Vergleiche mit Ziel
IF target_operator = '>':
    success = actual_value > target_value
ELSE IF target_operator = '<':
    success = actual_value < target_value
ELSE IF target_operator = '>=':
    success = actual_value >= target_value
ELSE IF target_operator = '<=':
    success = actual_value <= target_value
ELSE IF target_operator = '=':
    success = actual_value = target_value

-- 3. Update Status
UPDATE alert_evaluations
SET status = CASE WHEN success THEN 'success' ELSE 'failed' END,
    actual_value_at_evaluation = $1,
    evaluated_at = NOW(),
    updated_at = NOW()
WHERE id = $2;
```

---

### **5. API-Endpunkte**

#### **5.1 Alerts auflisten**
```
GET /api/alerts
Query-Parameter:
  - status: 'pending' | 'success' | 'failed' | 'all' (default: 'all')
  - model_id: int (optional)
  - coin_id: str (optional)
  - prediction_type: 'time_based' | 'classic' | 'all' (default: 'all')
  - date_from: datetime (optional)
  - date_to: datetime (optional)
  - limit: int (default: 100)
  - offset: int (default: 0)
  - unique_coins: bool (default: true)  # Nur ältester Alert pro Coin (für Kauf-Entscheidung)

Response:
{
  "alerts": [
    {
      "id": 123,
      "prediction_id": 456,
      "coin_id": "ABC...",
      "model_id": 1,
      "model_name": "5min 30% Pump",
      "prediction_type": "time_based",  # oder "classic"
      "alert_timestamp": "2025-12-25T16:00:00Z",
      "evaluation_timestamp": "2025-12-25T16:05:00Z",
      
      # Zeitbasiert:
      "target_variable": "price_close",
      "future_minutes": 5,
      "price_change_percent": 30.0,
      "target_direction": "up",
      
      # Klassisch (wenn prediction_type = 'classic'):
      "target_operator": null,  # oder ">", "<", etc.
      "target_value": null,  # oder 50000.0
      
      "probability": 0.85,
      "price_close_at_alert": 0.001234,
      "status": "pending",  # oder "success", "failed"
      "actual_price_change_pct": null,  # oder 26.95 (nur bei time_based)
      "actual_value_at_evaluation": null,  # oder 50123.45 (nur bei classic)
      "remaining_seconds": 180,  # bei pending
      "evaluated_at": null,  # oder timestamp
      "other_alerts_count": 3  # Anzahl weiterer Alerts für diesen Coin
    }
  ],
  "total": 150,
  "pending": 45,
  "success": 30,
  "failed": 75
}
```

#### **5.2 Alert-Details**
```
GET /api/alerts/{alert_id}
Query-Parameter:
  - chart_before_minutes: int (default: 10)  # Minuten vor Alert
  - chart_after_minutes: int (default: 10)   # Minuten nach Auswertung

Response:
{
  "alert": { ... },  # Wie oben, aber mit mehr Details
  "coin_values_at_alert": {
    "price_close": 0.001234,
    "price_open": 0.001200,
    "price_high": 0.001250,
    "price_low": 0.001180,
    "market_cap_close": 123456.78,
    "market_cap_open": 123000.00,
    "volume_sol": 5000.0,
    "volume_usd": 6000.0,
    "buy_volume_sol": 3000.0,
    "sell_volume_sol": 2000.0,
    "num_buys": 150,
    "num_sells": 100,
    "unique_wallets": 50,
    "phase_id": 1,
    ...
  },
  "coin_values_at_evaluation": { ... },  # Wenn ausgewertet (gleiche Struktur)
  
  # Erweiterte Historie für Charts (vor Alert, Alert-Zeitraum, nach Auswertung)
  "price_history": [
    {"timestamp": "2025-12-25T15:50:00Z", "price_close": 0.001200, "price_high": 0.001210, "price_low": 0.001190},
    {"timestamp": "2025-12-25T15:55:00Z", "price_close": 0.001220, "price_high": 0.001230, "price_low": 0.001200},
    {"timestamp": "2025-12-25T16:00:00Z", "price_close": 0.001234, "price_high": 0.001250, "price_low": 0.001180},  # Alert
    {"timestamp": "2025-12-25T16:01:00Z", "price_close": 0.001245, "price_high": 0.001260, "price_low": 0.001240},
    ...
    {"timestamp": "2025-12-25T16:05:00Z", "price_close": 0.001567, "price_high": 0.001580, "price_low": 0.001550},  # Auswertung
    {"timestamp": "2025-12-25T16:10:00Z", "price_close": 0.001600, "price_high": 0.001620, "price_low": 0.001580},
    {"timestamp": "2025-12-25T16:15:00Z", "price_close": 0.001580, "price_high": 0.001600, "price_low": 0.001570},
    ...
  ],
  
  # Weitere Metriken-Historie
  "volume_history": [ ... ],
  "market_cap_history": [ ... ],
  "buy_sell_ratio_history": [ ... ],
  
  # Alle weiteren Alerts für diesen Coin
  "other_alerts": [
    {
      "id": 124,
      "alert_timestamp": "2025-12-25T16:02:00Z",
      "model_name": "10min 40% Pump",
      "status": "pending",
      "probability": 0.78
    },
    ...
  ],
  
  "statistics": {
    "model_total_alerts": 150,
    "model_success_rate": 0.30,
    "model_avg_actual_change": 18.5,  # Nur bei time_based
    "model_avg_expected_change": 30.0,  # Nur bei time_based
    "model_avg_volume_change": 150.0,  # Durchschnittliche Volume-Änderung bei erfolgreichen Alerts
    "model_avg_market_cap_change": 35.0  # Durchschnittliche Market Cap-Änderung
  }
}
```

#### **5.3 Alert-Statistiken**
```
GET /api/alerts/statistics
Query-Parameter:
  - model_id: int (optional)
  - date_from: datetime (optional)
  - date_to: datetime (optional)

Response:
{
  "total_alerts": 150,
  "pending": 45,
  "success": 30,
  "failed": 75,
  "success_rate": 0.20,  # 30 / (30 + 75) = 20% (ohne pending)
  "by_model": [
    {
      "model_id": 1,
      "model_name": "5min 30% Pump",
      "total": 50,
      "success": 15,
      "failed": 25,
      "pending": 10,
      "success_rate": 0.375
    }
  ]
}
```

---

### **6. UI-Komponenten**

#### **6.1 Alert-Übersichtsseite (`page_alerts`)**
- **Filter-Bereich** (Expander)
- **Statistik-Karten:**
  - Gesamt Alerts
  - Laufend
  - Erfolgreich
  - Fehlgeschlagen
  - Erfolgsrate
  
- **Alert-Liste:**
  - Karten-Layout (wie Model-Übersicht)
  - Pro Coin nur 1 Karte (**ältester Alert** - da zu diesem Zeitpunkt gekauft wird)
  - Kompakte Info:
    - Coin-ID (kurz)
    - Modell-Name
    - Vorhersage-Typ (⏰ Zeitbasiert / 🎯 Klassisch)
    - Alert-Zeitpunkt (ältester)
    - Ziel (z.B. "5 Min, +30%" oder "price_close > 50000")
    - Wahrscheinlichkeit
    - Status-Badge
    - Verbleibende Zeit (bei laufenden)
    - Anzahl weiterer Alerts (z.B. "+3 weitere")
    - Button "Details anzeigen"

#### **6.2 Alert-Detail-Seite (`page_alert_details`)**
- **Alert-Header:**
  - Coin-ID (vollständig, kopierbar)
  - Modell-Name & Link zu Modell-Details
  - Status-Badge (groß, farbig)
  
- **Alert-Informationen** (Karten)
- **Coin-Werte zum Zeitpunkt** (Tabelle)
- **Status & Auswertung** (Karten mit Metriken)
- **Multi-Metriken-Charts** (Plotly):
  - Preis-Chart (mit erweiterter Zeitachse)
  - Volume-Chart
  - Market Cap-Chart
  - Buy/Sell Ratio-Chart
  - Kombiniertes Dashboard
- **Alle weiteren Alerts für diesen Coin** (Liste)
- **Umfassende Metriken-Entwicklung** (Karten mit Vergleich)
- **Statistiken** (Karten mit Erfolgsrate, Durchschnittswerten, etc.)

---

### **7. Datenbank-Migration**

**Schritt 1: Erstelle `alert_evaluations` Tabelle**
```sql
-- Siehe oben
```

**Schritt 2: Migriere bestehende Alerts (optional)**
```sql
-- Finde alle bestehenden Alerts (prediction = 1, probability >= threshold)
-- Erstelle Einträge in alert_evaluations
INSERT INTO alert_evaluations (
    prediction_id, coin_id, model_id,
    target_variable, future_minutes, price_change_percent, target_direction,
    alert_timestamp, price_at_alert, status
)
SELECT 
    p.id,
    p.coin_id,
    p.model_id,
    pam.target_variable,
    pam.future_minutes,
    pam.price_change_percent,
    pam.target_direction,
    p.created_at,
    -- Hole price_close zum Zeitpunkt des Alerts aus coin_metrics
    (SELECT price_close FROM coin_metrics 
     WHERE coin_id = p.coin_id 
       AND timestamp <= p.data_timestamp 
     ORDER BY timestamp DESC LIMIT 1) as price_at_alert,
    CASE 
        WHEN p.created_at + (pam.future_minutes || ' minutes')::interval <= NOW() 
        THEN 'pending'  -- Wird später ausgewertet
        ELSE 'pending'
    END as status
FROM predictions p
JOIN prediction_active_models pam ON p.active_model_id = pam.id
WHERE p.prediction = 1
  AND p.probability >= 0.7  -- alert_threshold
  AND pam.future_minutes IS NOT NULL  -- Nur zeitbasierte Vorhersagen
  AND p.created_at >= NOW() - INTERVAL '7 days';  -- Nur letzte 7 Tage
```

**Schritt 3: Erstelle Index für Performance**
```sql
-- Bereits oben definiert
```

---

### **8. Hintergrund-Job: Alert-Auswertung**

**Implementierung:**
- Neue Funktion: `evaluate_pending_alerts()`
- Läuft als Background-Task in `app/main.py` (ähnlich wie `EventHandler`)
- Intervall: Alle 60 Sekunden
- Batch-Größe: 100 Alerts pro Durchlauf

**Code-Struktur:**
```python
async def evaluate_pending_alerts():
    """Wertet alle ausstehenden Alerts aus"""
    pool = await get_pool()
    
    # Finde auswertbare Alerts (zeitbasiert)
    time_based_alerts = await pool.fetch("""
        SELECT * FROM alert_evaluations
        WHERE status = 'pending'
          AND prediction_type = 'time_based'
          AND evaluation_timestamp <= NOW()
        ORDER BY evaluation_timestamp ASC
        LIMIT 100
    """)
    
    for alert in time_based_alerts:
        try:
            # Hole ALLE Metriken zum Auswertungs-Zeitpunkt
            metrics = await get_metrics_at_timestamp(
                alert['coin_id'],
                alert['evaluation_timestamp']
            )
            
            if metrics is None:
                await update_alert_status(alert['id'], 'expired')
                continue
            
            # Berechne Änderung
            actual_change = calculate_price_change(
                alert['price_close_at_alert'],
                metrics['price_close']
            )
            
            # Vergleiche mit Ziel
            success = check_if_target_reached(
                actual_change,
                alert['price_change_percent'],
                alert['target_direction']
            )
            
            # Update Status mit ALLEN Metriken
            await update_alert_evaluation_time_based(
                alert['id'],
                metrics,  # Alle Metriken
                actual_change,
                'success' if success else 'failed'
            )
            
        except Exception as e:
            logger.error(f"Fehler bei Auswertung von Alert {alert['id']}: {e}")
    
    # Finde auswertbare Alerts (klassisch)
    classic_alerts = await pool.fetch("""
        SELECT * FROM alert_evaluations
        WHERE status = 'pending'
          AND prediction_type = 'classic'
          AND evaluation_timestamp <= NOW()
        ORDER BY evaluation_timestamp ASC
        LIMIT 100
    """)
    
    for alert in classic_alerts:
        try:
            # Hole Wert der target_variable zum Auswertungs-Zeitpunkt
            actual_value = await get_value_at_timestamp(
                alert['coin_id'],
                alert['target_variable'],  # z.B. "price_close"
                alert['evaluation_timestamp']
            )
            
            if actual_value is None:
                await update_alert_status(alert['id'], 'expired')
                continue
            
            # Vergleiche mit Ziel
            success = check_classic_condition(
                actual_value,
                alert['target_operator'],
                alert['target_value']
            )
            
            # Update Status
            await update_alert_evaluation_classic(
                alert['id'],
                actual_value,
                'success' if success else 'failed'
            )
            
        except Exception as e:
            logger.error(f"Fehler bei Auswertung von Alert {alert['id']}: {e}")
```

---

### **9. Automatische Alert-Erstellung**

**Beim Speichern einer Vorhersage:**
- Prüfe ob `prediction = 1` und `probability >= alert_threshold`
- Wenn ja, erstelle Eintrag in `alert_evaluations`
- **Unterscheide zwischen zeitbasierten und klassischen Vorhersagen:**
  - **Zeitbasiert:** `future_minutes IS NOT NULL`
    - Hole **ALLE Metriken** aus `coin_metrics` zum Zeitpunkt des Alerts
    - Setze `evaluation_timestamp = alert_timestamp + future_minutes`
    - Setze `prediction_type = 'time_based'`
  - **Klassisch:** `target_operator IS NOT NULL AND target_value IS NOT NULL`
    - Hole **ALLE Metriken** aus `coin_metrics` zum Zeitpunkt des Alerts
    - Setze `evaluation_timestamp = alert_timestamp + X Minuten` (konfigurierbar, z.B. 5 Min)
    - Setze `prediction_type = 'classic'`

**Code-Integration:**
- In `save_prediction()` oder separat in `event_handler.py`
- Nach erfolgreichem Speichern der Vorhersage
- **WICHTIG:** Nur 1 Alert pro Coin (ältester) in der Übersicht, aber alle in der Detail-Ansicht

---

## 📊 Zusammenfassung der Features

### **✅ Kern-Funktionen:**
1. ✅ Alert-Übersichtsseite (Reiter "Alerts")
2. ✅ Alert-Detail-Seite
3. ✅ Automatische Alert-Erstellung bei Vorhersagen
4. ✅ Hintergrund-Job für Alert-Auswertung
5. ✅ Status-Tracking (laufend, erfolgreich, fehlgeschlagen)
6. ✅ Vergleich mit tatsächlichen Coin-Werten
7. ✅ Preis-Chart-Visualisierung
8. ✅ Statistiken (Erfolgsrate, Durchschnittswerte)

### **🎨 UI-Features:**
- Filter (Status, Modell, Zeitraum, Coin-ID)
- Sortierung
- Kompakte Karten-Ansicht
- Detaillierte Auswertung
- Interaktive Charts

### **📈 Auswertung:**
- Erfolgreich vs. Fehlgeschlagen
- Tatsächliche vs. Erwartete Änderung
- Erfolgsrate pro Modell
- Durchschnittliche Abweichung

---

## 🚀 Umsetzungsreihenfolge

1. **Phase 1: Datenbank-Schema**
   - Erstelle `alert_evaluations` Tabelle
   - Migration für bestehende Alerts (optional)

2. **Phase 2: Backend-Logik**
   - Automatische Alert-Erstellung
   - Hintergrund-Job für Auswertung
   - API-Endpunkte

3. **Phase 3: UI**
   - Alert-Übersichtsseite
   - Alert-Detail-Seite
   - Integration in Navigation

4. **Phase 4: Testing & Optimierung**
   - Test mit echten Daten
   - Performance-Optimierung
   - Bug-Fixes

---

## ❓ Offene Fragen

1. **Sollten wir auch klassische Vorhersagen (nicht zeitbasiert) als Alerts tracken?**
   - Aktuell nur zeitbasierte Vorhersagen
   - Könnte erweitert werden

2. **Wie lange sollen Alerts gespeichert werden?**
   - Vorschlag: 30 Tage
   - Ältere können archiviert werden

3. **Sollen abgelaufene Alerts automatisch gelöscht werden?**
   - Vorschlag: Nein, für Statistiken behalten
   - Optional: Archivierung nach X Tagen

4. **Soll es Benachrichtigungen geben, wenn ein Alert erfolgreich/fehlgeschlagen ist?**
   - Aktuell: Nur n8n-Integration
   - Könnte erweitert werden (z.B. E-Mail, Push)

---

## 💡 Weitere Verbesserungsvorschläge

1. **Alert-Gruppierung:**
   - Gruppiere Alerts nach Coin (alle Alerts für einen Coin zusammen)
   - Zeige Trend (mehr/weniger erfolgreich über Zeit)

2. **Alert-Vergleich:**
   - Vergleiche mehrere Alerts für denselben Coin
   - Zeige, welches Modell besser performt

3. **Machine Learning für Alert-Optimierung:**
   - Lerne aus erfolgreichen/fehlgeschlagenen Alerts
   - Passe Alert-Threshold dynamisch an

4. **Export-Funktion:**
   - Exportiere Alert-Statistiken als CSV/Excel
   - Für weitere Analyse

5. **Alert-Historie:**
   - Zeige alle Alerts für einen Coin (nicht nur neuesten)
   - Timeline-Ansicht

---

**Bereit für Implementierung?** 🚀

