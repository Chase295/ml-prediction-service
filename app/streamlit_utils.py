"""
Streamlit Utility Functions
Hilfsfunktionen für API-Calls, Konfiguration und gemeinsame Operationen
Für ML Prediction Service
"""
import streamlit as st
import os
import httpx
import yaml
import json
import subprocess
import re
from typing import List, Dict, Any, Optional
from pathlib import Path
from urllib.parse import urlparse

# Konfiguration
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000/api")

# ============================================================
# Feature Definitions (für Prediction)
# ============================================================

# Verfügbare Features für Prediction
AVAILABLE_FEATURES = [
    # Basis OHLC
    "price_open", "price_high", "price_low", "price_close",

    # Volumen
    "volume_sol", "buy_volume_sol", "sell_volume_sol", "net_volume_sol",

    # Market Cap & Phase
    "market_cap_close", "phase_id_at_time",

    # ⚠️ KRITISCH für Rug-Detection
    "dev_sold_amount",  # Wichtigster Indikator für Rug-Pulls!

    # Ratio-Metriken (Bot-Spam vs. echtes Interesse)
    "buy_pressure_ratio",
    "unique_signer_ratio",

    # Whale-Aktivität
    "whale_buy_volume_sol",
    "whale_sell_volume_sol",
    "num_whale_buys",
    "num_whale_sells",

    # Volatilität
    "volatility_pct",
    "avg_trade_size_sol"
]

# Feature-Kategorien für UI
FEATURE_CATEGORIES = {
    "Basis OHLC": ["price_open", "price_high", "price_low", "price_close"],
    "Volumen": ["volume_sol", "buy_volume_sol", "sell_volume_sol", "net_volume_sol"],
    "Market Cap & Phase": ["market_cap_close", "phase_id_at_time"],
    "Dev-Tracking (Rug-Pull-Erkennung)": ["dev_sold_amount"],
    "Ratio-Metriken (Bot-Spam vs. echtes Interesse)": ["buy_pressure_ratio", "unique_signer_ratio"],
    "Whale-Aktivität": ["whale_buy_volume_sol", "whale_sell_volume_sol", "num_whale_buys", "num_whale_sells"],
    "Volatilität": ["volatility_pct", "avg_trade_size_sol"]
}

# Kritische Features (empfohlen für Rug-Detection)
CRITICAL_FEATURES = [
    "dev_sold_amount",  # Wichtigster Indikator!
    "buy_pressure_ratio",
    "unique_signer_ratio",
    "whale_buy_volume_sol",
    "volatility_pct",
    "net_volume_sol"
]

# ============================================================
# API Functions
# ============================================================

def api_get(endpoint: str, show_errors: bool = False) -> Any:
    """GET Request zur API (kann Dict oder List zurückgeben)"""
    try:
        response = httpx.get(f"{API_BASE_URL}{endpoint}", timeout=30.0)
        response.raise_for_status()
        return response.json()
    except httpx.HTTPError as e:
        if show_errors:
            st.error(f"❌ API-Fehler: {e}")
        return [] if 'models' in endpoint or 'predictions' in endpoint or 'alerts' in endpoint else {}

def api_post(endpoint: str, data: Dict[str, Any], show_errors: bool = True) -> Optional[Dict[str, Any]]:
    """POST Request zur API"""
    try:
        response = httpx.post(f"{API_BASE_URL}{endpoint}", json=data, timeout=30.0)
        response.raise_for_status()
        return response.json()
    except httpx.HTTPError as e:
        if show_errors:
            st.error(f"❌ API-Fehler: {e}")
            if hasattr(e, 'response') and hasattr(e.response, 'text'):
                st.error(f"Details: {e.response.text}")
        return None

def api_delete(endpoint: str) -> bool:
    """DELETE Request zur API"""
    try:
        response = httpx.delete(f"{API_BASE_URL}{endpoint}", timeout=30.0)
        response.raise_for_status()
        return True
    except httpx.HTTPError as e:
        # Fehler wird nicht hier angezeigt, sondern in der aufrufenden Funktion
        # damit mehrere Löschungen nicht zu vielen Fehlermeldungen führen
        return False

def api_patch(endpoint: str, data: Dict[str, Any], show_errors: bool = True) -> Optional[Dict[str, Any]]:
    """PATCH Request zur API"""
    print(f"🔥 DEBUG UI: api_patch called - Endpoint: {endpoint}")
    print(f"🔥 DEBUG UI: api_patch data: {data}")
    try:
        response = httpx.patch(f"{API_BASE_URL}{endpoint}", json=data, timeout=30.0)
        print(f"🔥 DEBUG UI: Response status: {response.status_code}")
        response.raise_for_status()
        result = response.json()
        print(f"🔥 DEBUG UI: Response data: {result}")
        return result
    except httpx.HTTPError as e:
        print(f"🔥 DEBUG UI: HTTPError: {e}")
        if hasattr(e, 'response') and hasattr(e.response, 'text'):
            print(f"🔥 DEBUG UI: Response text: {e.response.text}")
        if show_errors:
            st.error(f"❌ API-Fehler: {e}")
            if hasattr(e, 'response') and hasattr(e.response, 'text'):
                st.error(f"Details: {e.response.text}")
        return None

# ============================================================
# Configuration Functions
# ============================================================

def load_config():
    """Lädt Konfiguration aus YAML-Datei und merged mit aktuellen Umgebungsvariablen"""
    # Starte mit Defaults
    config = get_default_config()

    # Lade aus YAML-Datei falls vorhanden
    config_file = "/app/config/config.yaml"
    if os.path.exists(config_file):
        try:
            with open(config_file, 'r') as f:
                yaml_config = yaml.safe_load(f)
                if yaml_config:
                    config.update(yaml_config)
        except Exception as e:
            st.error(f"❌ Fehler beim Laden der YAML-Konfiguration: {e}")

    return config

def save_config(config: Dict[str, Any]) -> bool:
    """Speichert Konfiguration in YAML-Datei"""
    config_file = "/app/config/config.yaml"
    try:
        os.makedirs(os.path.dirname(config_file), exist_ok=True)
        with open(config_file, 'w') as f:
            yaml.dump(config, f, default_flow_style=False, sort_keys=False)
        return True
    except Exception as e:
        st.error(f"❌ Fehler beim Speichern der Konfiguration: {e}")
        return False

def get_default_config() -> Dict[str, Any]:
    """Standard-Konfiguration"""
    return {
        "DB_DSN": os.getenv("DB_DSN", ""),
        "API_PORT": int(os.getenv("API_PORT", "8000")),
        "STREAMLIT_PORT": int(os.getenv("STREAMLIT_PORT", "8501")),
        "MODEL_STORAGE_PATH": os.getenv("MODEL_STORAGE_PATH", "/app/models"),
        "API_BASE_URL": os.getenv("API_BASE_URL", "http://localhost:8000"),
        "JOB_POLL_INTERVAL": int(os.getenv("JOB_POLL_INTERVAL", "5")),
        "MAX_CONCURRENT_JOBS": int(os.getenv("MAX_CONCURRENT_JOBS", "2")),
        "LOG_LEVEL": os.getenv("LOG_LEVEL", "INFO"),
        "LOG_FORMAT": os.getenv("LOG_FORMAT", "text"),
        "LOG_JSON_INDENT": int(os.getenv("LOG_JSON_INDENT", "0")),
    }

def validate_url(url: str, allow_empty: bool = True) -> tuple[bool, str]:
    """Validiert eine URL"""
    if allow_empty and not url:
        return True, ""

    if not url:
        return False, "URL darf nicht leer sein"

    try:
        result = urlparse(url)
        if not result.scheme or not result.netloc:
            return False, "Ungültige URL-Format"
        return True, ""
    except:
        return False, "Ungültige URL"

def validate_port(port: int) -> tuple[bool, str]:
    """Validiert einen Port"""
    if not isinstance(port, int):
        return False, "Port muss eine Zahl sein"
    if port < 1 or port > 65535:
        return False, "Port muss zwischen 1 und 65535 liegen"
    return True, ""

def reload_config() -> tuple[bool, str]:
    """Lädt die Konfiguration im Service neu"""
    try:
        response = httpx.post(f"{API_BASE_URL}/reload-config", timeout=10)
        if response.status_code == 200:
            return True, "Konfiguration wurde neu geladen"
        else:
            return False, f"Fehler: HTTP {response.status_code}"
    except Exception as e:
        return False, f"Verbindungsfehler: {e}"

def restart_service() -> tuple[bool, str]:
    """Startet den Service neu"""
    try:
        # Versuche über API neu zu starten
        response = httpx.post(f"{API_BASE_URL}/restart", timeout=10)
        if response.status_code == 200:
            return True, "Service wird neu gestartet"
        else:
            return False, f"Fehler: HTTP {response.status_code}"
    except:
        # Fallback: Docker Compose verwenden
        try:
            result = subprocess.run(
                ["docker", "compose", "restart", "ml-prediction-service"],
                capture_output=True,
                text=True,
                cwd="/app"
            )
            if result.returncode == 0:
                return True, "Service wird neu gestartet (Docker Compose)"
            else:
                return False, f"Docker Compose Fehler: {result.stderr}"
        except Exception as e:
            return False, f"Neustart fehlgeschlagen: {e}"

def get_service_logs(lines: int = 100) -> str:
    """Holt Service-Logs"""
    try:
        # Versuche über API Logs zu holen
        response = httpx.get(f"{API_BASE_URL}/logs?lines={lines}", timeout=10)
        if response.status_code == 200:
            return response.text
    except:
        pass

    # Fallback: Docker Logs verwenden
    try:
        result = subprocess.run(
            ["docker", "logs", "--tail", str(lines), "ml-prediction-service"],
            capture_output=True,
            text=True,
            cwd="/app"
        )
        if result.returncode == 0:
            return result.stdout
        else:
            return f"Fehler beim Laden der Logs: {result.stderr}"
    except Exception as e:
        return f"Logs nicht verfügbar: {e}"

# ============================================================
# Health & Monitoring Functions
# ============================================================

def get_health_status() -> Optional[Dict[str, Any]]:
    """Holt Health-Status des Services"""
    return api_get("/health", show_errors=False)

def get_metrics() -> Optional[Dict[str, Any]]:
    """Holt Prometheus-Metriken"""
    try:
        response = httpx.get(f"{API_BASE_URL}/metrics", timeout=5)
        if response.status_code == 200:
            return response.text
    except:
        return None

# ============================================================
# Model Functions
# ============================================================

def get_models() -> List[Dict[str, Any]]:
    """Holt alle aktiven Modelle"""
    models_data = api_get("/models", show_errors=False)
    if isinstance(models_data, dict) and 'models' in models_data:
        models = models_data['models']
        # Filter nur aktive Modelle
        return [m for m in models if m.get('is_active', True)]
    return []

def get_model_details(model_id: int) -> Optional[Dict[str, Any]]:
    """Holt Details eines Modells"""
    return api_get(f"/models/{model_id}", show_errors=False)

def delete_model(model_id: int) -> bool:
    """Löscht ein Modell"""
    return api_delete(f"/models/{model_id}")

def update_model(model_id: int, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Aktualisiert ein Modell"""
    return api_patch(f"/models/{model_id}", data)

# ============================================================
# Prediction Functions
# ============================================================

def get_predictions(model_id: Optional[int] = None, active_model_id: Optional[int] = None, limit: int = 50) -> List[Dict[str, Any]]:
    """Holt Vorhersagen"""
    endpoint = "/predictions"
    params = []

    if model_id:
        params.append(f"model_id={model_id}")
    if active_model_id:
        params.append(f"active_model_id={active_model_id}")
    if limit:
        params.append(f"limit={limit}")

    if params:
        endpoint += "?" + "&".join(params)

    predictions = api_get(endpoint, show_errors=False)

    # API gibt {"predictions": [...], "total": ..., "limit": ..., "offset": ...} zurück
    if isinstance(predictions, dict) and "predictions" in predictions:
        return predictions["predictions"]
    elif isinstance(predictions, list):
        return predictions
    else:
        return []

def make_prediction(model_id: int, features: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Macht eine Vorhersage"""
    return api_post(f"/models/{model_id}/predict", {"features": features})

# ============================================================
# Alert Functions
# ============================================================

def get_alerts() -> List[Dict[str, Any]]:
    """Holt alle Alerts"""
    alerts = api_get("/alerts", show_errors=False)
    return alerts if isinstance(alerts, list) else []

def create_alert(alert_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Erstellt einen Alert"""
    return api_post("/alerts", alert_data)

def update_alert(alert_id: int, alert_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Aktualisiert einen Alert"""
    return api_patch(f"/alerts/{alert_id}", alert_data)

def delete_alert(alert_id: int) -> bool:
    """Löscht einen Alert"""
    return api_delete(f"/alerts/{alert_id}")

# ============================================================
# Utility Functions
# ============================================================

def format_datetime(dt_str: str) -> str:
    """Formatiert ein Datetime-String für Anzeige"""
    if not dt_str:
        return "N/A"
    try:
        from datetime import datetime
        dt = datetime.fromisoformat(dt_str.replace('Z', '+00:00'))
        return dt.strftime("%d.%m.%Y %H:%M:%S")
    except:
        return str(dt_str)

def format_duration(seconds: float) -> str:
    """Formatiert eine Dauer in lesbarer Form"""
    if not seconds:
        return "N/A"

    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)

    if hours > 0:
        return f"{hours}h {minutes}m {secs}s"
    elif minutes > 0:
        return f"{minutes}m {secs}s"
    else:
        return f"{secs}s"

# ============================================================
# UI Helper Functions
# ============================================================

def load_phases() -> List[Dict[str, Any]]:
    """Lädt verfügbare Phasen aus der Datenbank"""
    phases = api_get("/api/phases", show_errors=False)
    if not phases or not isinstance(phases, list):
        # Fallback: Standard-Phasen
        return [
            {"id": 1, "name": "Baby Zone", "interval_seconds": 5, "max_age_minutes": 10},
            {"id": 2, "name": "Survival Zone", "interval_seconds": 30, "max_age_minutes": 60},
            {"id": 3, "name": "Mature Zone", "interval_seconds": 60, "max_age_minutes": 1440}
        ]
    return phases
