# 🔄 Aktualisierte Anleitung - Alle Anforderungen berücksichtigt

**Datum:** 24. Dezember 2025  
**Zweck:** Wichtige Ergänzungen zur Haupt-Anleitung basierend auf neuen Anforderungen

---

## 📋 Neue Anforderungen

1. ✅ **PostgreSQL LISTEN/NOTIFY** für Echtzeit-Kommunikation (nicht nur Polling)
2. ✅ **Getrennte Tabellen-Struktur** - KEIN `is_active` in `ml_models`
3. ✅ **Modell-Download** vom Training Service und lokale Speicherung
4. ✅ **Verschiedene Metriken** berücksichtigen (Features müssen passen)
5. ✅ **Streamlit UI** für Modell-Verwaltung
6. ✅ **API & Prometheus Metrics** für Monitoring

---

## 🔄 Wichtige Änderungen zur Haupt-Anleitung

### 1. Datenbank-Schema (Schritt 2) - ✅ BEREITS AKTUALISIERT

**Getrennte Tabellen:**
- ✅ `prediction_active_models` - Lokale Tabelle für aktive Modelle
- ✅ `predictions` - Vorhersagen
- ✅ `prediction_webhook_log` - Webhook-Logs
- ✅ LISTEN/NOTIFY Trigger für `coin_metrics`

**KEINE Änderungen an `ml_models`!**

---

### 2. Datenbank-Modelle (Schritt 6) - ✅ BEREITS AKTUALISIERT

**Neue Funktionen:**
- ✅ `get_available_models()` - Holt Modelle aus `ml_models` (nur lesen!)
- ✅ `download_model_file(model_id)` - Lädt Modell-Datei vom Training Service
- ✅ `import_model(model_id)` - Importiert Modell in `prediction_active_models`
- ✅ `get_active_models()` - Holt aus `prediction_active_models` (nicht `ml_models`!)

---

### 3. Event-Handler (Schritt 11) - LISTEN/NOTIFY hinzufügen

**Aktualisierte Implementierung:**

```python
# app/prediction/event_handler.py

import asyncio
import json
from datetime import datetime, timezone, timedelta
from app.database.connection import get_pool
from app.utils.config import POLLING_INTERVAL_SECONDS, BATCH_SIZE, BATCH_TIMEOUT_SECONDS

class EventHandler:
    """Event-Handler mit LISTEN/NOTIFY und Polling-Fallback"""
    
    def __init__(self):
        self.pool = None
        self.listener_connection = None
        self.use_listen_notify = True  # Versuche LISTEN/NOTIFY zu nutzen
        self.batch = []
        self.batch_lock = asyncio.Lock()
        self.last_batch_time = datetime.now(timezone.utc)
        self.running = False
    
    async def setup_listener(self):
        """Setup LISTEN/NOTIFY Listener"""
        try:
            pool = await get_pool()
            # Separate Connection für LISTEN (kann nicht über Pool sein)
            self.listener_connection = await asyncpg.connect(DB_DSN)
            
            # Listener-Funktion
            async def notification_handler(conn, pid, channel, payload):
                """Wird aufgerufen wenn NOTIFY empfangen wird"""
                try:
                    data = json.loads(payload)
                    await self.add_to_batch(data)
                except Exception as e:
                    logger.error(f"Fehler beim Verarbeiten von Notification: {e}")
            
            # Listener registrieren
            await self.listener_connection.add_listener(
                'coin_metrics_insert',
                notification_handler
            )
            
            # LISTEN aktivieren
            await self.listener_connection.execute("LISTEN coin_metrics_insert")
            
            logger.info("✅ LISTEN/NOTIFY aktiviert")
            self.use_listen_notify = True
            
        except Exception as e:
            logger.warning(f"⚠️ LISTEN/NOTIFY nicht verfügbar: {e}")
            logger.info("→ Fallback auf Polling")
            self.use_listen_notify = False
    
    async def add_to_batch(self, event_data: Dict):
        """Fügt Event zu Batch hinzu"""
        async with self.batch_lock:
            self.batch.append(event_data)
            
            # Prüfe ob Batch voll oder Timeout erreicht
            now = datetime.now(timezone.utc)
            time_since_last_batch = (now - self.last_batch_time).total_seconds()
            
            if len(self.batch) >= BATCH_SIZE or time_since_last_batch >= BATCH_TIMEOUT_SECONDS:
                await self.process_batch()
    
    async def process_batch(self):
        """Verarbeitet aktuellen Batch"""
        async with self.batch_lock:
            if not self.batch:
                return
            
            batch_to_process = self.batch.copy()
            self.batch.clear()
            self.last_batch_time = datetime.now(timezone.utc)
        
        # Verarbeite Batch (siehe Schritt 11 in Haupt-Anleitung)
        await self._process_coin_entries(batch_to_process)
    
    async def start_polling_fallback(self):
        """Polling-Fallback wenn LISTEN/NOTIFY nicht verfügbar"""
        pool = await get_pool()
        last_processed_timestamp = datetime.now(timezone.utc) - timedelta(hours=1)
        
        while self.running:
            try:
                # Hole neue Einträge
                query = """
                    SELECT DISTINCT mint, MAX(timestamp) as latest_timestamp
                    FROM coin_metrics
                    WHERE timestamp > $1
                    GROUP BY mint
                    ORDER BY latest_timestamp ASC
                    LIMIT $2
                """
                rows = await pool.fetch(query, last_processed_timestamp, BATCH_SIZE)
                
                if rows:
                    events = [dict(row) for row in rows]
                    await self._process_coin_entries(events)
                    last_processed_timestamp = max(e['latest_timestamp'] for e in events)
                
                await asyncio.sleep(POLLING_INTERVAL_SECONDS)
                
            except Exception as e:
                logger.error(f"Fehler im Polling-Loop: {e}")
                await asyncio.sleep(POLLING_INTERVAL_SECONDS)
    
    async def start(self):
        """Startet Event-Handler"""
        self.running = True
        
        # Versuche LISTEN/NOTIFY
        await self.setup_listener()
        
        if self.use_listen_notify:
            # Warte auf Notifications (in separatem Task)
            asyncio.create_task(self._keep_listener_alive())
        else:
            # Fallback: Polling
            await self.start_polling_fallback()
    
    async def _keep_listener_alive(self):
        """Hält Listener-Verbindung am Leben"""
        while self.running:
            try:
                # Prüfe Batch regelmäßig (für Timeout)
                await asyncio.sleep(1)
                await self.process_batch()  # Prüft Timeout
            except Exception as e:
                logger.error(f"Fehler im Listener-Keep-Alive: {e}")
                # Fallback auf Polling
                self.use_listen_notify = False
                await self.start_polling_fallback()
                break
```

---

### 4. Modell-Download (Schritt 9) - ERWEITERN

**Neue Funktionen für Modell-Download:**

```python
# app/prediction/model_manager.py

import aiohttp
import os
import joblib
from app.utils.config import MODEL_STORAGE_PATH, TRAINING_SERVICE_API_URL

async def download_model_file(model_id: int) -> str:
    """
    Lädt Modell-Datei vom Training Service herunter.
    
    Returns:
        Lokaler Pfad zur Modell-Datei
    """
    # 1. API-Call zum Training Service
    download_url = f"{TRAINING_SERVICE_API_URL}/models/{model_id}/download"
    
    async with aiohttp.ClientSession() as session:
        async with session.get(download_url) as response:
            if response.status != 200:
                raise ValueError(f"Modell-Download fehlgeschlagen: {response.status}")
            
            # 2. Speichere lokal
            os.makedirs(MODEL_STORAGE_PATH, exist_ok=True)
            local_path = os.path.join(MODEL_STORAGE_PATH, f"model_{model_id}.pkl")
            
            with open(local_path, 'wb') as f:
                async for chunk in response.content.iter_chunked(8192):
                    f.write(chunk)
    
    logger.info(f"✅ Modell {model_id} heruntergeladen: {local_path}")
    return local_path

async def import_model_from_training_service(model_id: int) -> Dict:
    """
    Importiert Modell vom Training Service.
    
    1. Hole Metadaten aus ml_models
    2. Lade Modell-Datei (Download)
    3. Speichere in prediction_active_models
    """
    pool = await get_pool()
    
    # 1. Hole Metadaten aus ml_models
    row = await pool.fetchrow("""
        SELECT 
            id, name, model_type, model_file_path,
            target_variable, target_operator, target_value,
            future_minutes, price_change_percent, target_direction,
            features, phases, params
        FROM ml_models
        WHERE id = $1 AND status = 'READY' AND is_deleted = false
    """, model_id)
    
    if not row:
        raise ValueError(f"Modell {model_id} nicht gefunden oder nicht READY")
    
    # 2. Lade Modell-Datei
    local_path = await download_model_file(model_id)
    
    # 3. Speichere in prediction_active_models
    active_model_id = await pool.fetchval("""
        INSERT INTO prediction_active_models (
            model_id, model_name, model_type,
            target_variable, target_operator, target_value,
            future_minutes, price_change_percent, target_direction,
            features, phases, params,
            local_model_path, is_active, activated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING id
    """,
        row['id'],
        row['name'],
        row['model_type'],
        row['target_variable'],
        row['target_operator'],
        row['target_value'],
        row['future_minutes'],
        row['price_change_percent'],
        row['target_direction'],
        row['features'],  # JSONB
        row['phases'],  # JSONB
        row['params'],  # JSONB
        local_path,
        True,  # is_active
        datetime.now(timezone.utc)
    )
    
    logger.info(f"✅ Modell {model_id} importiert als active_model_id {active_model_id}")
    return {"active_model_id": active_model_id, "local_path": local_path}
```

---

### 5. Feature-Engineering mit verschiedenen Metriken (Schritt 8) - ERWEITERN

**⚠️ WICHTIG: Verschiedene Metriken berücksichtigen!**

Wenn ein Modell mit bestimmten Features trainiert wurde, müssen die Daten beim Prediction auch passen!

**Erweiterte `prepare_features()`:**

```python
async def prepare_features(
    coin_id: str,
    model_config: Dict,
    pool: asyncpg.Pool
) -> pd.DataFrame:
    """
    Bereitet Features für einen Coin auf.
    Berücksichtigt verschiedene Metriken aus coin_metrics!
    """
    # 1. Hole Historie - WICHTIG: Nur verfügbare Spalten laden!
    # Prüfe welche Features das Modell benötigt
    required_features = model_config['features']
    
    # Basis-Features die immer verfügbar sind (aus coin_metrics)
    available_columns = [
        'price_open', 'price_high', 'price_low', 'price_close',
        'volume_sol',
        'market_cap_close',  # ⚠️ Nur market_cap_close existiert!
        'buy_volume_sol', 'sell_volume_sol',
        'num_buys', 'num_sells',
        'bonding_curve_pct', 'virtual_sol_reserves',
        'unique_wallets', 'is_koth'
    ]
    
    # Prüfe ob alle benötigten Features verfügbar sind
    missing_features = [f for f in required_features if f not in available_columns]
    if missing_features:
        raise ValueError(
            f"Features nicht verfügbar in coin_metrics: {missing_features}\n"
            f"Verfügbare Features: {available_columns}"
        )
    
    # 2. Hole Historie (nur benötigte Spalten!)
    history = await get_coin_history(
        coin_id=coin_id,
        limit=FEATURE_HISTORY_SIZE,
        phases=model_config.get('phases'),
        columns=required_features,  # ⚠️ NEU: Nur benötigte Spalten laden
        pool=pool
    )
    
    # 3. Feature-Engineering (wenn aktiviert)
    params = model_config.get('params') or {}
    use_engineered_features = params.get('use_engineered_features', False)
    
    if use_engineered_features:
        window_sizes = params.get('feature_engineering_windows', [5, 10, 15])
        
        # ⚠️ WICHTIG: Feature-Engineering benötigt bestimmte Basis-Features!
        # z.B. price_close für price_roc, volume_sol für volume_ratio, etc.
        # Prüfe ob alle benötigten Basis-Features vorhanden sind
        required_for_engineering = ['price_close', 'volume_sol', 'market_cap_close']
        missing_for_engineering = [f for f in required_for_engineering if f not in history.columns]
        
        if missing_for_engineering:
            raise ValueError(
                f"Feature-Engineering benötigt folgende Features: {missing_for_engineering}\n"
                f"Verfügbar: {list(history.columns)}"
            )
        
        history = create_pump_detection_features(
            history,
            window_sizes=window_sizes
        )
    
    # 4. Features auswählen (in korrekter Reihenfolge!)
    features = model_config['features'].copy()
    
    # Bei zeitbasierter Vorhersage: target_variable entfernen
    if model_config.get('target_operator') is None:
        features = [f for f in features if f != model_config['target_variable']]
    
    # 5. Validierung
    missing = [f for f in features if f not in history.columns]
    if missing:
        raise ValueError(f"Features fehlen nach Feature-Engineering: {missing}")
    
    # 6. Reihenfolge prüfen
    if list(history[features].columns) != features:
        raise ValueError(
            f"Feature-Reihenfolge stimmt nicht!\n"
            f"Erwartet: {features}\n"
            f"Erhalten: {list(history[features].columns)}"
        )
    
    return history[features]
```

**Erweiterte `get_coin_history()`:**

```python
async def get_coin_history(
    coin_id: str,
    limit: int,
    phases: Optional[List[int]],
    columns: Optional[List[str]] = None,  # ⚠️ NEU: Nur bestimmte Spalten laden
    pool: asyncpg.Pool
) -> pd.DataFrame:
    """
    Holt Historie für einen Coin.
    
    ⚠️ WICHTIG: columns Parameter - nur benötigte Spalten laden!
    """
    # Spalten-String für SQL
    if columns:
        columns_str = ", ".join(columns)
    else:
        columns_str = "*"
    
    if phases:
        query = f"""
            SELECT {columns_str} FROM coin_metrics
            WHERE mint = $1 AND phase_id_at_time = ANY($2::int[])
            ORDER BY timestamp DESC
            LIMIT $3
        """
        rows = await pool.fetch(query, coin_id, phases, limit)
    else:
        query = f"""
            SELECT {columns_str} FROM coin_metrics
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

---

### 6. Streamlit UI (NEUER SCHRITT)

**Schritt 20: Streamlit UI für Modell-Verwaltung**

**Was zu tun ist:**
1. Erstelle `app/streamlit_app.py`
2. Implementiere UI für Modell-Verwaltung
3. Zeige Vorhersagen und Statistiken

**Vorgehen:**
- Seiten:
  - "🏠 Übersicht" - Aktive Modelle, Statistiken
  - "📥 Modell importieren" - Liste verfügbarer Modelle, Import
  - "⚙️ Modell verwalten" - Aktivieren/Deaktivieren, Löschen
  - "📊 Vorhersagen" - Liste aller Vorhersagen
  - "📈 Statistiken" - Charts und Metriken

**Beispiel-Code:**
```python
# app/streamlit_app.py
import streamlit as st
import requests
from datetime import datetime, timezone

API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000/api")

def page_overview():
    """Übersicht: Aktive Modelle und Statistiken"""
    st.title("🏠 Übersicht")
    
    # Hole aktive Modelle
    response = requests.get(f"{API_BASE_URL}/models/active")
    if response.status_code == 200:
        models = response.json().get("models", [])
        
        st.metric("Aktive Modelle", len(models))
        
        # Liste der Modelle
        for model in models:
            with st.expander(f"🤖 {model['name']} ({model['model_type']})"):
                col1, col2 = st.columns(2)
                with col1:
                    st.write(f"**Modell-ID:** {model['id']}")
                    st.write(f"**Typ:** {model['model_type']}")
                    st.write(f"**Vorhersagen:** {model.get('total_predictions', 0)}")
                with col2:
                    st.write(f"**Letzte Vorhersage:** {model.get('last_prediction_at', 'Nie')}")
                    if st.button("🛑 Deaktivieren", key=f"deactivate_{model['id']}"):
                        requests.post(f"{API_BASE_URL}/models/{model['id']}/deactivate")
                        st.rerun()

def page_import_model():
    """Modell importieren"""
    st.title("📥 Modell importieren")
    
    # Hole verfügbare Modelle
    response = requests.get(f"{API_BASE_URL}/models/available")
    if response.status_code == 200:
        available_models = response.json().get("models", [])
        
        if available_models:
            selected_model = st.selectbox(
                "Wähle Modell zum Importieren",
                available_models,
                format_func=lambda m: f"{m['name']} (ID: {m['id']})"
            )
            
            if st.button("📥 Importieren"):
                with st.spinner("Importiere Modell..."):
                    response = requests.post(
                        f"{API_BASE_URL}/models/import",
                        json={"model_id": selected_model['id']}
                    )
                    if response.status_code == 200:
                        st.success("✅ Modell erfolgreich importiert!")
                        st.rerun()
                    else:
                        st.error(f"❌ Fehler: {response.text}")
        else:
            st.info("Keine verfügbaren Modelle gefunden")

def page_predictions():
    """Vorhersagen anzeigen"""
    st.title("📊 Vorhersagen")
    
    # Filter
    col1, col2 = st.columns(2)
    with col1:
        coin_id = st.text_input("Coin ID (optional)")
    with col2:
        model_id = st.number_input("Modell-ID (optional)", min_value=0, value=0)
    
    # Hole Vorhersagen
    params = {}
    if coin_id:
        params["coin_id"] = coin_id
    if model_id > 0:
        params["model_id"] = model_id
    
    response = requests.get(f"{API_BASE_URL}/predictions", params=params)
    if response.status_code == 200:
        predictions = response.json().get("predictions", [])
        
        st.metric("Anzahl Vorhersagen", len(predictions))
        
        # Tabelle
        if predictions:
            df = pd.DataFrame(predictions)
            st.dataframe(df)
```

**Dockerfile erweitern:**
```dockerfile
# Supervisor Config für zwei Prozesse (FastAPI + Streamlit)
RUN printf '[supervisord]\n\
nodaemon=true\n\
\n\
[program:fastapi]\n\
command=uvicorn app.main:app --host 0.0.0.0 --port 8000\n\
directory=/app\n\
autostart=true\n\
autorestart=true\n\
\n\
[program:streamlit]\n\
command=streamlit run app/streamlit_app.py --server.port 8501 --server.address 0.0.0.0\n\
directory=/app\n\
autostart=true\n\
autorestart=true\n\
' > /etc/supervisor/conf.d/supervisord.conf

EXPOSE 8000 8501
```

---

### 7. API-Endpunkte (Schritt 13) - ERWEITERN

**Neue Endpunkte für Modell-Verwaltung:**

```python
# app/api/routes.py

# Modell-Verwaltung
@router.get("/models/available")
async def get_available_models():
    """Liste aller verfügbaren Modelle aus ml_models (READY, nicht gelöscht)"""
    models = await get_available_models_from_training_service()
    return {"models": models}

@router.post("/models/import")
async def import_model(request: ImportModelRequest):
    """Importiert Modell vom Training Service"""
    result = await import_model_from_training_service(request.model_id)
    return result

@router.get("/models/active")
async def get_active_models():
    """Liste aller aktiven Modelle (aus prediction_active_models)"""
    models = await get_active_models()
    return {"models": models}

@router.post("/models/{active_model_id}/activate")
async def activate_model(active_model_id: int):
    """Aktiviert Modell"""
    await activate_active_model(active_model_id)
    return {"success": True, "message": "Modell aktiviert"}

@router.post("/models/{active_model_id}/deactivate")
async def deactivate_model(active_model_id: int):
    """Deaktiviert Modell"""
    await deactivate_active_model(active_model_id)
    return {"success": True, "message": "Modell deaktiviert"}

@router.delete("/models/{active_model_id}")
async def delete_active_model(active_model_id: int):
    """Löscht Modell (aus prediction_active_models + lokale Datei)"""
    await delete_active_model_and_file(active_model_id)
    return {"success": True, "message": "Modell gelöscht"}
```

---

## ✅ Zusammenfassung der Änderungen

### Datenbank:
- ✅ Separate Tabelle `prediction_active_models` (kein `is_active` in `ml_models`)
- ✅ LISTEN/NOTIFY Trigger für Echtzeit-Kommunikation
- ✅ Modell-Download und lokale Speicherung

### Code:
- ✅ Modell-Download vom Training Service
- ✅ Feature-Engineering mit verschiedenen Metriken berücksichtigen
- ✅ LISTEN/NOTIFY Event-Handler (mit Polling-Fallback)
- ✅ Streamlit UI für Modell-Verwaltung

### API:
- ✅ Endpunkte für Modell-Import/Verwaltung
- ✅ Prometheus Metrics (bereits in Haupt-Anleitung)

---

**Status:** ✅ Alle Anforderungen berücksichtigt  
**Nächster Schritt:** Haupt-Anleitung mit diesen Änderungen aktualisieren

