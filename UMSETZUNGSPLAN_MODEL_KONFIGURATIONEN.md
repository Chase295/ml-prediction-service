# 🎯 Umsetzungsplan: Alle Modell-Konfigurationen korrekt verarbeiten

**Version:** 1.0  
**Datum:** 24. Dezember 2025  
**Ziel:** Sicherstellen, dass ALLE Modell-Konfigurationen korrekt verarbeitet werden

---

## 📋 Problemstellung

Der ML Training Service erlaubt die Erstellung von Modellen mit sehr unterschiedlichen Konfigurationen:

- ✅ Verschiedene Modell-Typen (Random Forest, XGBoost)
- ✅ Verschiedene Vorhersage-Typen (klassisch vs. zeitbasiert)
- ✅ Feature-Engineering aktiviert/deaktiviert
- ✅ Verschiedene Feature-Listen
- ✅ Verschiedene Phasen
- ✅ SMOTE aktiviert/deaktiviert
- ✅ TimeSeriesSplit aktiviert/deaktiviert
- ✅ Verschiedene Hyperparameter

**Herausforderung:** Der Prediction Service muss ALLE diese Varianten korrekt verarbeiten können.

---

## 🔍 Analyse: Alle möglichen Modell-Konfigurationen

### 1. Modell-Typen

#### 1.1 Random Forest
- **Erkennung:** `model_type = "random_forest"`
- **Laden:** `joblib.load()` → `RandomForestClassifier`
- **Vorhersage:** `model.predict()`, `model.predict_proba()`
- **Features:** Standard Scikit-learn Features

#### 1.2 XGBoost
- **Erkennung:** `model_type = "xgboost"`
- **Laden:** `joblib.load()` → `XGBClassifier`
- **Vorhersage:** `model.predict()`, `model.predict_proba()`
- **Features:** Standard XGBoost Features

**Unterschiede:**
- Beide funktionieren gleich (Scikit-learn API)
- Keine spezielle Behandlung nötig

---

### 2. Vorhersage-Typen

#### 2.1 Klassische Vorhersage

**Erkennung:**
```python
target_operator IS NOT NULL AND target_value IS NOT NULL
```

**Parameter:**
- `target_variable`: z.B. "market_cap_close"
- `target_operator`: ">", "<", ">=", "<=", "="
- `target_value`: z.B. 10000.0

**Beispiel:**
- "market_cap_close > 10000"

**Vorhersage-Logik:**
- Modell sagt: 0 (Bedingung nicht erfüllt) oder 1 (Bedingung erfüllt)
- **WICHTIG:** Labels werden beim Training mit `create_labels()` erstellt
- **WICHTIG:** Beim Prediction brauchen wir KEINE Labels (nur Features)

#### 2.2 Zeitbasierte Vorhersage

**Erkennung:**
```python
target_operator IS NULL AND target_value IS NULL
AND future_minutes IS NOT NULL AND price_change_percent IS NOT NULL
```

**Parameter:**
- `target_variable`: z.B. "price_close" (für welche Variable wird Änderung berechnet)
- `future_minutes`: z.B. 5 (in wie vielen Minuten)
- `min_percent_change`: z.B. 30.0 (um wie viel Prozent)
- `target_direction`: "up" oder "down"

**Beispiel:**
- "Steigt price_close in 5 Minuten um 30%?"

**Vorhersage-Logik:**
- Modell sagt: 0 (wird nicht steigen) oder 1 (wird steigen)
- **WICHTIG:** Labels werden beim Training mit `create_time_based_labels()` erstellt
- **WICHTIG:** Beim Prediction brauchen wir KEINE Labels (nur Features)
- **WICHTIG:** `target_variable` wird für Feature-Engineering benötigt, aber NICHT als Feature verwendet (verhindert Data Leakage)

---

### 3. Feature-Konfigurationen

#### 3.1 Basis-Features

**Mögliche Features:**
- `price_open`, `price_high`, `price_low`, `price_close`
- `volume_sol`, `volume_usd`
- `market_cap_close`, `market_cap_open`
- `buy_volume_sol`, `sell_volume_sol`
- `order_buy_volume`, `order_sell_volume`
- `whale_buy_volume`, `whale_sell_volume`
- `num_buys`, `num_sells`
- `unique_wallets`
- `bonding_curve_pct`
- `virtual_sol_reserves`
- `is_koth`
- etc.

**Gespeichert in:** `ml_models.features` (JSONB Array)

**Beispiel:**
```json
["price_open", "price_high", "price_low", "price_close", "volume_sol"]
```

#### 3.2 Feature-Engineering Features

**Erstellt wenn:** `params.use_engineered_features = true`

**Feature-Typen:**
- `price_roc_5`, `price_roc_10`, `price_roc_15` (Rate of Change)
- `price_volatility_5`, `price_volatility_10`, `price_volatility_15` (Volatilität)
- `mcap_velocity_5`, `mcap_velocity_10`, `mcap_velocity_15` (Market Cap Geschwindigkeit)
- `price_range_5`, `price_range_10`, `price_range_15` (Preisspanne)
- `price_change_5`, `price_change_10`, `price_change_15` (Preisänderung)

**Gespeichert in:** `ml_models.features` (enthält auch engineered features)

**Beispiel:**
```json
[
  "price_open", "price_high", "price_low", "price_close",
  "price_roc_10", "price_volatility_15", "mcap_velocity_5"
]
```

**WICHTIG:**
- Feature-Engineering Features werden beim Training automatisch zu `features` hinzugefügt
- Beim Prediction müssen wir die GLEICHEN Features erstellen
- Reihenfolge muss identisch sein

---

### 4. Feature-Engineering Konfiguration

#### 4.1 Feature-Engineering aktiviert

**Erkennung:**
```python
params.get('use_engineered_features') == True
```

**Parameter:**
- `feature_engineering_windows`: [5, 10, 15] (Fenstergrößen)

**Was passiert:**
- `create_pump_detection_features()` wird aufgerufen
- Zusätzliche Features werden erstellt
- Features werden zu `features` Liste hinzugefügt

**Beim Prediction:**
- MUSS Feature-Engineering auch angewendet werden
- MUSS mit gleichen `window_sizes` arbeiten
- MUSS gleiche Features in gleicher Reihenfolge erstellen

#### 4.2 Feature-Engineering deaktiviert

**Erkennung:**
```python
params.get('use_engineered_features') == False or None
```

**Was passiert:**
- Nur Basis-Features werden verwendet
- Keine zusätzlichen Features

**Beim Prediction:**
- KEIN Feature-Engineering anwenden
- Nur Basis-Features verwenden

---

### 5. Phasen-Konfiguration

#### 5.1 Phasen-Filter

**Gespeichert in:** `ml_models.phases` (JSONB Array)

**Beispiel:**
```json
[1, 2, 3]
```

**Bedeutung:**
- Modell wurde nur mit Daten aus Phase 1, 2, 3 trainiert
- Beim Prediction sollten wir auch nur diese Phasen verwenden

**WICHTIG:**
- `coin_metrics` hat `phase_id_at_time` Feld
- Beim Prediction: Nur Daten aus den trainierten Phasen verwenden

**Optional:**
- Können wir auch andere Phasen verwenden (Modell ist flexibel)
- Oder: Warnung ausgeben wenn Phase nicht in Training-Phasen

---

### 6. Hyperparameter

#### 6.1 Random Forest Parameter

**Gespeichert in:** `ml_models.params` (JSONB)

**Beispiel:**
```json
{
  "n_estimators": 100,
  "max_depth": 10,
  "min_samples_split": 2,
  "min_samples_leaf": 1
}
```

**WICHTIG:**
- Diese Parameter sind bereits im trainierten Modell gespeichert
- Beim Prediction brauchen wir sie NICHT (Modell ist bereits trainiert)
- Nur für Referenz/Logging

#### 6.2 XGBoost Parameter

**Beispiel:**
```json
{
  "n_estimators": 100,
  "max_depth": 6,
  "learning_rate": 0.1,
  "subsample": 0.8
}
```

**WICHTIG:**
- Gleiche Situation wie Random Forest
- Parameter sind im Modell gespeichert

---

### 7. Training-Parameter (SMOTE, TimeSeriesSplit)

#### 7.1 SMOTE

**Erkennung:**
```python
params.get('use_smote') == True
```

**Bedeutung:**
- Beim Training wurde SMOTE (Oversampling) verwendet
- **WICHTIG:** Beim Prediction brauchen wir SMOTE NICHT
- SMOTE wird nur beim Training verwendet, nicht bei Vorhersagen

#### 7.2 TimeSeriesSplit

**Erkennung:**
```python
params.get('use_timeseries_split') == True
```

**Bedeutung:**
- Beim Training wurde TimeSeriesSplit für Cross-Validation verwendet
- **WICHTIG:** Beim Prediction brauchen wir TimeSeriesSplit NICHT
- TimeSeriesSplit wird nur beim Training verwendet, nicht bei Vorhersagen

---

## 🎯 Umsetzungs-Strategie

### Phase 1: Modell-Metadaten vollständig laden

#### 1.1 Datenbank-Query

**Query:**
```sql
SELECT 
    id, name, model_type, status,
    target_variable, target_operator, target_value,
    future_minutes, price_change_percent, target_direction,
    features, phases, params,
    model_file_path, is_active, alert_threshold
FROM ml_models
WHERE is_active = true AND status = 'READY'
```

#### 1.2 Modell-Konfiguration extrahieren

**Python-Struktur:**
```python
class ModelConfig:
    # Basis
    id: int
    name: str
    model_type: str  # "random_forest" oder "xgboost"
    model_file_path: str
    
    # Vorhersage-Typ
    is_time_based: bool
    target_variable: str
    target_operator: Optional[str]  # None wenn zeitbasiert
    target_value: Optional[float]   # None wenn zeitbasiert
    future_minutes: Optional[int]    # None wenn klassisch
    min_percent_change: Optional[float]  # None wenn klassisch
    target_direction: Optional[str]  # None wenn klassisch
    
    # Features
    features: List[str]  # Enthält Basis + ggf. Engineered Features
    use_engineered_features: bool
    feature_engineering_windows: Optional[List[int]]
    
    # Phasen
    phases: Optional[List[int]]
    
    # Parameter (nur für Referenz)
    params: Dict[str, Any]
    
    # Alert
    alert_threshold: float
```

#### 1.3 Validierung

**Prüfungen:**
- ✅ Modell-Datei existiert?
- ✅ Alle Features verfügbar?
- ✅ Feature-Engineering Parameter konsistent?
- ✅ Vorhersage-Typ eindeutig identifizierbar?

---

### Phase 2: Feature-Aufbereitung (Kritisch!)

#### 2.1 Historie sammeln

**Für jeden Coin:**
```python
async def get_coin_history(coin_id: str, limit: int = 20) -> pd.DataFrame:
    """
    Holt Historie für einen Coin.
    
    WICHTIG: 
    - Nach timestamp DESC sortiert (neueste zuerst)
    - Genug Einträge für Feature-Engineering
    - Optional: Filter nach Phasen (wenn phases gesetzt)
    """
    query = """
        SELECT * FROM coin_metrics
        WHERE mint = $1
        -- Optional: AND phase_id_at_time = ANY($2::int[])
        ORDER BY timestamp DESC
        LIMIT $3
    """
    # Umkehren für chronologische Reihenfolge (älteste zuerst)
    data = await pool.fetch(query, coin_id, limit)
    return pd.DataFrame(data).sort_values('timestamp')
```

**WICHTIG:**
- Mindestens 15-20 Einträge für Feature-Engineering
- Falls zu wenig: Warnung, aber trotzdem verarbeiten

#### 2.2 Feature-Engineering anwenden (wenn nötig)

**Logik:**
```python
def prepare_features(
    data: pd.DataFrame,
    model_config: ModelConfig
) -> pd.DataFrame:
    """
    Bereitet Features auf - GLEICHE Logik wie beim Training!
    """
    # 1. Basis-Features sind bereits in data
    
    # 2. Feature-Engineering (wenn aktiviert)
    if model_config.use_engineered_features:
        from ml_training_service.app.training.feature_engineering import (
            create_pump_detection_features
        )
        
        # WICHTIG: Gleiche window_sizes wie beim Training!
        window_sizes = model_config.feature_engineering_windows or [5, 10, 15]
        
        data = create_pump_detection_features(
            data,
            window_sizes=window_sizes
        )
    
    # 3. Nur benötigte Features auswählen
    # WICHTIG: In GLEICHER Reihenfolge wie beim Training!
    features = model_config.features
    
    # Prüfe ob alle Features vorhanden
    missing = [f for f in features if f not in data.columns]
    if missing:
        raise ValueError(f"Features fehlen: {missing}")
    
    # WICHTIG: target_variable NICHT als Feature verwenden!
    # (verhindert Data Leakage bei zeitbasierter Vorhersage)
    if model_config.is_time_based:
        # target_variable wird für Feature-Engineering benötigt,
        # aber NICHT in features Liste
        features = [f for f in features if f != model_config.target_variable]
    
    return data[features]
```

**Kritische Punkte:**
1. ✅ Feature-Engineering nur wenn `use_engineered_features = true`
2. ✅ Gleiche `window_sizes` wie beim Training
3. ✅ Features in GLEICHER Reihenfolge
4. ✅ `target_variable` NICHT als Feature (bei zeitbasierter Vorhersage)

#### 2.3 Feature-Reihenfolge validieren

**Problem:**
- Modell erwartet Features in bestimmter Reihenfolge
- Wenn Reihenfolge falsch → falsche Vorhersagen!

**Lösung:**
```python
def validate_feature_order(
    model_features: List[str],
    data_features: List[str]
) -> bool:
    """
    Prüft ob Feature-Reihenfolge korrekt ist.
    """
    # Entferne target_variable aus model_features (wenn zeitbasiert)
    # (wird beim Training auch entfernt)
    
    if model_features != data_features:
        raise ValueError(
            f"Feature-Reihenfolge stimmt nicht!\n"
            f"Erwartet: {model_features}\n"
            f"Erhalten: {data_features}"
        )
    return True
```

---

### Phase 3: Vorhersage-Logik

#### 3.1 Modell laden

**Logik:**
```python
def load_model(model_config: ModelConfig) -> Any:
    """
    Lädt Modell aus Datei.
    """
    if not os.path.exists(model_config.model_file_path):
        raise FileNotFoundError(
            f"Modell-Datei nicht gefunden: {model_config.model_file_path}"
        )
    
    model = joblib.load(model_config.model_file_path)
    
    # Validierung: Modell-Typ prüfen
    expected_type = "RandomForestClassifier" if model_config.model_type == "random_forest" else "XGBClassifier"
    actual_type = type(model).__name__
    
    if expected_type not in actual_type:
        raise ValueError(
            f"Modell-Typ stimmt nicht! Erwartet: {expected_type}, "
            f"Erhalten: {actual_type}"
        )
    
    return model
```

#### 3.2 Vorhersage machen

**Logik:**
```python
def make_prediction(
    model: Any,
    features: pd.DataFrame,
    model_config: ModelConfig
) -> Dict[str, Any]:
    """
    Macht Vorhersage - funktioniert für ALLE Modell-Konfigurationen!
    """
    # 1. Features in Array konvertieren
    X = features.values  # Shape: (n_samples, n_features)
    
    # 2. Vorhersage (funktioniert für Random Forest UND XGBoost)
    prediction = model.predict(X)  # 0 oder 1
    probability = model.predict_proba(X)[:, 1]  # Wahrscheinlichkeit für Klasse 1
    
    # 3. Für einzelne Vorhersage (letzter Eintrag)
    if len(prediction) > 0:
        return {
            "prediction": int(prediction[-1]),
            "probability": float(probability[-1])
        }
    else:
        raise ValueError("Keine Vorhersage möglich - keine Features")
```

**WICHTIG:**
- Funktioniert für Random Forest UND XGBoost (gleiche API)
- Funktioniert für klassische UND zeitbasierte Vorhersage
- Keine spezielle Behandlung nötig!

---

### Phase 4: Vollständiger Workflow

#### 4.1 Workflow für einen Coin

```python
async def predict_coin(
    coin_id: str,
    timestamp: datetime,
    model_config: ModelConfig,
    model_cache: Dict[int, Any]
) -> Dict[str, Any]:
    """
    Vollständiger Workflow für einen Coin und ein Modell.
    """
    try:
        # 1. Hole Historie
        history = await get_coin_history(
            coin_id=coin_id,
            limit=20,  # Genug für Feature-Engineering
            phases=model_config.phases  # Optional: Filter nach Phasen
        )
        
        if len(history) < 5:
            raise ValueError(f"Zu wenig Historie für Coin {coin_id}: {len(history)} Einträge")
        
        # 2. Bereite Features auf
        features_df = prepare_features(
            data=history,
            model_config=model_config
        )
        
        # 3. Validiere Feature-Reihenfolge
        validate_feature_order(
            model_features=model_config.features,
            data_features=list(features_df.columns)
        )
        
        # 4. Lade Modell (aus Cache oder Datei)
        if model_config.id not in model_cache:
            model = load_model(model_config)
            model_cache[model_config.id] = model
        else:
            model = model_cache[model_config.id]
        
        # 5. Mache Vorhersage
        result = make_prediction(
            model=model,
            features=features_df,
            model_config=model_config
        )
        
        # 6. Speichere Ergebnis
        await save_prediction(
            coin_id=coin_id,
            timestamp=timestamp,
            model_id=model_config.id,
            prediction=result["prediction"],
            probability=result["probability"],
            features=features_df.iloc[-1].to_dict()  # Optional: Features speichern
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Fehler bei Vorhersage für Coin {coin_id}, Modell {model_config.id}: {e}")
        raise
```

#### 4.2 Multi-Modell-Vorhersagen

```python
async def predict_coin_all_models(
    coin_id: str,
    timestamp: datetime,
    active_models: List[ModelConfig],
    model_cache: Dict[int, Any]
) -> List[Dict[str, Any]]:
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
                model_cache=model_cache
            )
            
            results.append({
                "model_id": model_config.id,
                "model_name": model_config.name,
                **result
            })
            
        except Exception as e:
            logger.error(f"Fehler bei Modell {model_config.id}: {e}")
            # Weiter mit nächstem Modell
            continue
    
    return results
```

---

## ✅ Validierungs-Strategie

### 1. Modell-Validierung beim Laden

**Prüfungen:**
```python
def validate_model_config(model_config: ModelConfig) -> List[str]:
    """
    Validiert Modell-Konfiguration.
    Gibt Liste von Warnungen/Fehlern zurück.
    """
    errors = []
    warnings = []
    
    # 1. Modell-Datei existiert?
    if not os.path.exists(model_config.model_file_path):
        errors.append(f"Modell-Datei nicht gefunden: {model_config.model_file_path}")
    
    # 2. Vorhersage-Typ eindeutig?
    if model_config.is_time_based:
        if not model_config.future_minutes or not model_config.min_percent_change:
            errors.append("Zeitbasierte Vorhersage: future_minutes oder min_percent_change fehlt")
    else:
        if not model_config.target_operator or model_config.target_value is None:
            errors.append("Klassische Vorhersage: target_operator oder target_value fehlt")
    
    # 3. Features vorhanden?
    if not model_config.features or len(model_config.features) == 0:
        errors.append("Keine Features definiert")
    
    # 4. Feature-Engineering konsistent?
    if model_config.use_engineered_features:
        if not model_config.feature_engineering_windows:
            warnings.append("Feature-Engineering aktiviert, aber keine window_sizes definiert")
    
    # 5. Phasen konsistent?
    if model_config.phases and len(model_config.phases) == 0:
        warnings.append("Phasen-Liste ist leer")
    
    return errors, warnings
```

### 2. Feature-Validierung

**Prüfungen:**
```python
def validate_features(
    data: pd.DataFrame,
    model_config: ModelConfig
) -> List[str]:
    """
    Validiert ob alle benötigten Features vorhanden sind.
    """
    errors = []
    
    # Basis-Features prüfen
    for feature in model_config.features:
        if feature not in data.columns:
            errors.append(f"Feature fehlt: {feature}")
    
    # Feature-Engineering Features prüfen (wenn aktiviert)
    if model_config.use_engineered_features:
        expected_engineered = get_expected_engineered_features(
            model_config.feature_engineering_windows
        )
        for feature in expected_engineered:
            if feature in model_config.features and feature not in data.columns:
                errors.append(f"Feature-Engineering Feature fehlt: {feature}")
    
    return errors
```

### 3. Vorhersage-Validierung

**Prüfungen:**
```python
def validate_prediction(
    prediction: int,
    probability: float,
    model_config: ModelConfig
) -> List[str]:
    """
    Validiert Vorhersage-Ergebnis.
    """
    errors = []
    
    # Prediction muss 0 oder 1 sein
    if prediction not in [0, 1]:
        errors.append(f"Ungültige Vorhersage: {prediction} (muss 0 oder 1 sein)")
    
    # Probability muss zwischen 0 und 1 sein
    if not 0.0 <= probability <= 1.0:
        errors.append(f"Ungültige Wahrscheinlichkeit: {probability} (muss zwischen 0 und 1 sein)")
    
    return errors
```

---

## 🧪 Testing-Strategie

### 1. Unit Tests

#### Test 1: Modell-Konfiguration laden
```python
def test_load_model_config():
    """Test: Lädt Modell-Konfiguration korrekt"""
    # Erstelle Test-Modell in DB
    # Lade Konfiguration
    # Prüfe alle Felder
```

#### Test 2: Feature-Aufbereitung
```python
def test_prepare_features_with_engineering():
    """Test: Feature-Engineering wird korrekt angewendet"""
    # Erstelle Test-Daten
    # Wende Feature-Engineering an
    # Prüfe ob Features erstellt wurden
```

#### Test 3: Feature-Aufbereitung ohne Engineering
```python
def test_prepare_features_without_engineering():
    """Test: Ohne Feature-Engineering werden nur Basis-Features verwendet"""
    # Erstelle Test-Daten
    # KEIN Feature-Engineering
    # Prüfe ob nur Basis-Features vorhanden
```

#### Test 4: Feature-Reihenfolge
```python
def test_feature_order():
    """Test: Features sind in korrekter Reihenfolge"""
    # Lade Modell-Konfiguration
    # Bereite Features auf
    # Prüfe Reihenfolge
```

### 2. Integration Tests

#### Test 1: Vollständiger Workflow (klassische Vorhersage)
```python
async def test_classic_prediction_workflow():
    """Test: Vollständiger Workflow für klassische Vorhersage"""
    # Erstelle Modell mit klassischer Vorhersage
    # Erstelle Test-Daten
    # Mache Vorhersage
    # Prüfe Ergebnis
```

#### Test 2: Vollständiger Workflow (zeitbasierte Vorhersage)
```python
async def test_time_based_prediction_workflow():
    """Test: Vollständiger Workflow für zeitbasierte Vorhersage"""
    # Erstelle Modell mit zeitbasierter Vorhersage
    # Erstelle Test-Daten
    # Mache Vorhersage
    # Prüfe Ergebnis
```

#### Test 3: Multi-Modell-Vorhersagen
```python
async def test_multi_model_predictions():
    """Test: Vorhersagen mit mehreren Modellen"""
    # Erstelle mehrere Modelle (verschiedene Konfigurationen)
    # Mache Vorhersagen
    # Prüfe alle Ergebnisse
```

### 3. End-to-End Tests

#### Test 1: Alle Modell-Konfigurationen
```python
async def test_all_model_configurations():
    """
    Test: Testet ALLE möglichen Modell-Konfigurationen
    
    Konfigurationen:
    1. Random Forest, klassisch, ohne Feature-Engineering
    2. Random Forest, klassisch, mit Feature-Engineering
    3. Random Forest, zeitbasiert, ohne Feature-Engineering
    4. Random Forest, zeitbasiert, mit Feature-Engineering
    5. XGBoost, klassisch, ohne Feature-Engineering
    6. XGBoost, klassisch, mit Feature-Engineering
    7. XGBoost, zeitbasiert, ohne Feature-Engineering
    8. XGBoost, zeitbasiert, mit Feature-Engineering
    9. Verschiedene Phasen
    10. Verschiedene Features
    """
    for config in all_possible_configurations:
        # Erstelle Modell mit dieser Konfiguration
        # Mache Vorhersage
        # Prüfe Ergebnis
```

---

## 🔧 Implementierungs-Details

### 1. Modell-Config-Klasse

```python
from dataclasses import dataclass
from typing import List, Optional, Dict, Any

@dataclass
class ModelConfig:
    """Vollständige Modell-Konfiguration"""
    # Basis
    id: int
    name: str
    model_type: str
    model_file_path: str
    is_active: bool
    alert_threshold: float
    
    # Vorhersage-Typ
    is_time_based: bool
    target_variable: str
    target_operator: Optional[str]
    target_value: Optional[float]
    future_minutes: Optional[int]
    min_percent_change: Optional[float]
    target_direction: Optional[str]
    
    # Features
    features: List[str]
    use_engineered_features: bool
    feature_engineering_windows: Optional[List[int]]
    
    # Phasen
    phases: Optional[List[int]]
    
    # Parameter (nur für Referenz)
    params: Dict[str, Any]
    
    @classmethod
    def from_db_row(cls, row: Dict[str, Any]) -> 'ModelConfig':
        """Erstellt ModelConfig aus DB-Zeile"""
        params = row.get('params') or {}
        if isinstance(params, str):
            import json
            params = json.loads(params)
        
        # Prüfe Vorhersage-Typ
        is_time_based = (
            row.get('target_operator') is None or
            row.get('target_value') is None
        ) and (
            row.get('future_minutes') is not None and
            row.get('price_change_percent') is not None
        )
        
        return cls(
            id=row['id'],
            name=row['name'],
            model_type=row['model_type'],
            model_file_path=row['model_file_path'],
            is_active=row.get('is_active', False),
            alert_threshold=row.get('alert_threshold', 0.7),
            
            is_time_based=is_time_based,
            target_variable=row['target_variable'],
            target_operator=row.get('target_operator'),
            target_value=float(row['target_value']) if row.get('target_value') else None,
            future_minutes=row.get('future_minutes'),
            min_percent_change=float(row.get('price_change_percent')) if row.get('price_change_percent') else None,
            target_direction=row.get('target_direction'),
            
            features=row.get('features') or [],
            use_engineered_features=params.get('use_engineered_features', False),
            feature_engineering_windows=params.get('feature_engineering_windows', [5, 10, 15]),
            
            phases=row.get('phases'),
            params=params
        )
```

### 2. Feature-Processor

```python
class FeatureProcessor:
    """Verarbeitet Features für Vorhersagen"""
    
    def __init__(self):
        # Import Feature-Engineering (wenn möglich)
        try:
            from ml_training_service.app.training.feature_engineering import (
                create_pump_detection_features
            )
            self.create_pump_detection_features = create_pump_detection_features
        except ImportError:
            logger.warning("Feature-Engineering kann nicht importiert werden - verwende Duplikation")
            # Fallback: Eigene Implementierung
    
    async def prepare_features(
        self,
        coin_id: str,
        model_config: ModelConfig,
        pool: asyncpg.Pool
    ) -> pd.DataFrame:
        """
        Bereitet Features für einen Coin auf.
        """
        # 1. Hole Historie
        history = await self.get_coin_history(
            coin_id=coin_id,
            limit=20,
            phases=model_config.phases,
            pool=pool
        )
        
        # 2. Feature-Engineering (wenn aktiviert)
        if model_config.use_engineered_features:
            history = self.create_pump_detection_features(
                history,
                window_sizes=model_config.feature_engineering_windows
            )
        
        # 3. Features auswählen (in korrekter Reihenfolge)
        features = model_config.features.copy()
        
        # Bei zeitbasierter Vorhersage: target_variable entfernen
        if model_config.is_time_based:
            features = [f for f in features if f != model_config.target_variable]
        
        # 4. Validierung
        missing = [f for f in features if f not in history.columns]
        if missing:
            raise ValueError(f"Features fehlen: {missing}")
        
        # 5. Reihenfolge prüfen
        if list(history[features].columns) != features:
            raise ValueError("Feature-Reihenfolge stimmt nicht!")
        
        return history[features]
    
    async def get_coin_history(
        self,
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
        # Umkehren für chronologische Reihenfolge
        return df.sort_values('timestamp').reset_index(drop=True)
```

### 3. Prediction Engine

```python
class PredictionEngine:
    """Haupt-Engine für Vorhersagen"""
    
    def __init__(self):
        self.model_cache: Dict[int, Any] = {}
        self.feature_processor = FeatureProcessor()
    
    async def predict_coin(
        self,
        coin_id: str,
        timestamp: datetime,
        model_config: ModelConfig,
        pool: asyncpg.Pool
    ) -> Dict[str, Any]:
        """
        Macht Vorhersage für einen Coin mit einem Modell.
        """
        # 1. Bereite Features auf
        features_df = await self.feature_processor.prepare_features(
            coin_id=coin_id,
            model_config=model_config,
            pool=pool
        )
        
        # 2. Lade Modell (aus Cache oder Datei)
        model = await self.get_model(model_config)
        
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
    
    async def get_model(self, model_config: ModelConfig) -> Any:
        """Lädt Modell (mit Caching)"""
        if model_config.id in self.model_cache:
            return self.model_cache[model_config.id]
        
        model = joblib.load(model_config.model_file_path)
        self.model_cache[model_config.id] = model
        return model
```

---

## ✅ Checkliste: Alle Konfigurationen abdecken

### Modell-Typen
- [ ] Random Forest
- [ ] XGBoost

### Vorhersage-Typen
- [ ] Klassische Vorhersage (target_operator, target_value)
- [ ] Zeitbasierte Vorhersage (future_minutes, min_percent_change)

### Feature-Engineering
- [ ] Feature-Engineering aktiviert
- [ ] Feature-Engineering deaktiviert
- [ ] Verschiedene window_sizes ([5, 10, 15], [5, 10], etc.)

### Features
- [ ] Nur Basis-Features
- [ ] Basis + Feature-Engineering Features
- [ ] Verschiedene Feature-Kombinationen

### Phasen
- [ ] Keine Phasen-Filter
- [ ] Phasen-Filter aktiviert ([1], [1, 2], etc.)

### Edge Cases
- [ ] Zu wenig Historie (< 5 Einträge)
- [ ] Fehlende Features
- [ ] Falsche Feature-Reihenfolge
- [ ] Modell-Datei nicht gefunden
- [ ] Ungültige Modell-Konfiguration

---

## 🎯 Zusammenfassung

### Kritische Punkte

1. **Feature-Reihenfolge:** MUSS identisch sein wie beim Training
2. **Feature-Engineering:** MUSS angewendet werden wenn aktiviert
3. **target_variable:** DARF NICHT als Feature verwendet werden (bei zeitbasierter Vorhersage)
4. **Modell-Typ:** Funktioniert für Random Forest UND XGBoost (gleiche API)
5. **Vorhersage-Typ:** Funktioniert für klassisch UND zeitbasiert

### Validierung

- ✅ Modell-Konfiguration vollständig laden
- ✅ Features validieren (vorhanden, Reihenfolge)
- ✅ Feature-Engineering korrekt anwenden
- ✅ Vorhersage-Ergebnisse validieren

### Testing

- ✅ Unit Tests für alle Komponenten
- ✅ Integration Tests für alle Konfigurationen
- ✅ End-to-End Tests für alle Varianten

---

**Status:** 📋 Umsetzungsplan erstellt  
**Nächster Schritt:** Implementierung starten

