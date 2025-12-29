"""
Tabs Page Module
Extrahierte Seite aus streamlit_app.py
"""
import streamlit as st
import pandas as pd
import plotly.express as px
import httpx
import time
import os
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional

# Import aus streamlit_utils
from streamlit_utils import (
    api_get, api_post, api_delete, api_patch,
    get_health_status, get_metrics,
    load_config, save_config, get_default_config,
    validate_url, validate_port,
    reload_config, restart_service, get_service_logs,
    format_datetime, format_duration
)


def tab_dashboard():
    """Dashboard Tab"""
    st.title("📊 Dashboard")

    # Health Status
    health = get_health_status()

    col1, col2, col3, col4 = st.columns(4)

    with col1:
        if health:
            status = "🟢 Healthy" if health.get("status") == "healthy" else "🔴 Degraded"
            st.metric("Status", status)
        else:
            st.metric("Status", "❌ Nicht erreichbar")

    with col2:
        if health:
            st.metric("Modelle", health.get("model_count", 0))
        else:
            st.metric("Modelle", "-")

    with col3:
        if health:
            db_status = "✅ Verbunden" if health.get("db_connected") else "❌ Getrennt"
            st.metric("Datenbank", db_status)
        else:
            st.metric("Datenbank", "-")

    with col4:
        if health:
            uptime = health.get("uptime_seconds", 0)
            hours = uptime // 3600
            minutes = (uptime % 3600) // 60
            st.metric("Uptime", f"{int(hours)}h {int(minutes)}m")
        else:
            st.metric("Uptime", "-")

    # Modelle-Übersicht
    st.subheader("📋 Modelle-Übersicht")
    models = api_get("/models")
    if models:
        st.info(f"📊 {len(models)} Modell(e) gefunden")
    else:
        st.info("ℹ️ Keine Modelle gefunden")

    # Service-Management
    st.subheader("🔧 Service-Management")
    col1, col2 = st.columns(2)

    with col1:
        if st.button("🔄 Konfiguration neu laden", type="primary"):
            with st.spinner("Konfiguration wird neu geladen..."):
                success, message = reload_config()
                if success:
                    st.success(message)
                    time.sleep(2)
                else:
                    st.error(message)
                st.rerun()

    with col2:
        if st.button("🔄 Seite aktualisieren"):
            st.rerun()

    # Auto-Refresh - ohne time.sleep() um UI nicht zu blockieren
    auto_refresh_enabled = st.checkbox("🔄 Auto-Refresh (5s)", key="auto_refresh_dashboard")
    if auto_refresh_enabled:
        # Verwende st.empty() und st.rerun() ohne time.sleep() - Streamlit wird automatisch neu rendern
        placeholder = st.empty()
        placeholder.info("⏳ Auto-Refresh aktiv...")
        st.rerun()


def tab_configuration():
    """Konfiguration Tab"""
    st.title("⚙️ Konfiguration")

    try:
        config = load_config()
    except Exception as e:
        st.error(f"⚠️ Fehler beim Laden der Config: {e}")
        config = get_default_config()

    using_env_vars = bool(os.getenv('DB_DSN'))

    if using_env_vars:
        st.info("🌐 **Coolify-Modus erkannt:** Environment Variables haben Priorität, aber du kannst die Konfiguration trotzdem hier speichern.")
    else:
        st.info("💡 Änderungen werden in der Konfigurationsdatei gespeichert. Nutze den 'Konfiguration neu laden' Button, um Änderungen ohne Neustart zu übernehmen.")

    with st.form("config_form"):
        st.subheader("🗄️ Datenbank Einstellungen")
        config["DB_DSN"] = st.text_input("DB DSN", value=config.get("DB_DSN", ""), help="PostgreSQL Connection String")
        if config["DB_DSN"]:
            db_valid, db_error = validate_url(config["DB_DSN"], allow_empty=False)
            if not db_valid:
                st.error(f"❌ {db_error}")

        st.subheader("🔌 Port Einstellungen")
        config["API_PORT"] = st.number_input("API Port", min_value=1, max_value=65535, value=int(config.get("API_PORT", 8000)))
        config["STREAMLIT_PORT"] = st.number_input("Streamlit Port", min_value=1, max_value=65535, value=int(config.get("STREAMLIT_PORT", 8501)))

        st.subheader("📁 Pfad Einstellungen")
        config["MODEL_STORAGE_PATH"] = st.text_input("Model Storage Path", value=config.get("MODEL_STORAGE_PATH", "/app/models"))
        config["API_BASE_URL"] = st.text_input("API Base URL", value=config.get("API_BASE_URL", "http://localhost:8000"), help="Innerhalb des Containers: localhost:8000, von außen: localhost:8012")
        if config["API_BASE_URL"]:
            api_valid, api_error = validate_url(config["API_BASE_URL"], allow_empty=False)
            if not api_valid:
                st.error(f"❌ {api_error}")

        st.subheader("📝 Logging Einstellungen")
        config["LOG_LEVEL"] = st.selectbox("Log Level", ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"], index=["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"].index(config.get("LOG_LEVEL", "INFO")))
        config["LOG_FORMAT"] = st.selectbox("Log Format", ["text", "json"], index=["text", "json"].index(config.get("LOG_FORMAT", "text")))
        config["LOG_JSON_INDENT"] = st.number_input("Log JSON Indent", min_value=0, max_value=4, value=config.get("LOG_JSON_INDENT", 0))

        col1, col2 = st.columns(2)
        with col1:
            save_button = st.form_submit_button("💾 Konfiguration speichern", type="primary")
        with col2:
            reset_button = st.form_submit_button("🔄 Auf Standard zurücksetzen")

        if save_button:
            errors = []

            db_valid, db_error = validate_url(config["DB_DSN"], allow_empty=False)
            if not db_valid:
                errors.append(f"DB DSN: {db_error}")

            api_valid, api_error = validate_url(config["API_BASE_URL"], allow_empty=False)
            if not api_valid:
                errors.append(f"API Base URL: {api_error}")

            if errors:
                st.error("❌ **Validierungsfehler:**")
                for error in errors:
                    st.error(f"  - {error}")
            else:
                try:
                    result = save_config(config)
                    if result:
                        st.session_state.config_saved = True
                        st.success("✅ Konfiguration gespeichert!")
                        if using_env_vars:
                            st.info("💡 **Tipp:** Nutze den 'Konfiguration neu laden' Button unten, um die Änderungen ohne Neustart zu übernehmen.")
                        else:
                            st.info("💡 **Tipp:** Nutze den 'Konfiguration neu laden' Button unten, um die Änderungen ohne Neustart zu übernehmen.")
                        st.session_state.config_just_saved = True
                except Exception as e:
                    st.error(f"❌ **Fehler beim Speichern:** {e}")

        if reset_button:
            try:
                default_config = get_default_config()
                if save_config(default_config):
                    st.session_state.config_saved = True
                    st.success("✅ Konfiguration auf Standard zurückgesetzt!")
                    st.warning("⚠️ Bitte Service neu starten oder 'Konfiguration neu laden' Button unten verwenden!")
                    st.session_state.config_just_saved = True
            except Exception as e:
                st.error(f"❌ **Fehler beim Zurücksetzen:** {e}")

    # Reload-Button
    st.divider()
    st.subheader("🔄 Konfiguration neu laden")
    st.caption("Lädt die gespeicherte Konfiguration im Service neu (ohne Neustart)")
    if st.button("🔄 Konfiguration neu laden", type="primary", key="reload_config_button"):
        with st.spinner("Konfiguration wird neu geladen..."):
            success, message = reload_config()
            if success:
                st.success(f"✅ {message}")
                st.info("💡 Die neue Konfiguration ist jetzt aktiv! Kein Neustart nötig.")
            else:
                st.error(f"❌ {message}")
                st.info("💡 Falls der Reload fehlschlägt, starte den Service manuell neu.")

    # Neustart-Button
    if st.session_state.get("config_saved", False):
        st.divider()
        st.subheader("🔄 Service-Neustart")
        col1, col2 = st.columns([2, 1])
        with col1:
            st.info("💡 Die Konfiguration wurde gespeichert. Starte den Service neu, damit die neuen Werte geladen werden.")
        with col2:
            if st.button("🔄 Service neu starten", type="primary", use_container_width=True):
                with st.spinner("Service wird neu gestartet..."):
                    success, message = restart_service()
                    if success:
                        st.success(message)
                        st.info("⏳ Bitte warte 5-10 Sekunden, bis der Service vollständig neu gestartet ist.")
                        st.session_state.config_saved = False
                        # Kein automatisches Rerun - User kann manuell aktualisieren
                    else:
                        st.error(message)
                        st.info("💡 Du kannst den Service auch manuell neu starten: `docker compose restart ml-prediction-service`")

    # Info nach Speichern (ohne Auto-Rerun)
    if st.session_state.get("config_just_saved", False):
        st.session_state.config_just_saved = False
        st.info("💡 Konfiguration wurde gespeichert! Verwende 'Konfiguration neu laden' um Änderungen zu aktivieren.")

    # Aktuelle Konfiguration anzeigen
    st.subheader("📄 Aktuelle Konfiguration")
    st.json(config)


def tab_logs():
    """Logs Tab"""
    st.title("📋 Service Logs")

    col1, col2 = st.columns([3, 1])

    with col1:
        lines = st.number_input("Anzahl Zeilen", min_value=10, max_value=1000, value=100, step=10, key="logs_lines_input")

    with col2:
        refresh_logs = st.button("🔄 Logs aktualisieren", key="refresh_logs_button")
        if refresh_logs:
            st.rerun()

    logs = get_service_logs(lines=lines)

    st.text_area(
        "Service Logs (neueste oben)",
        logs,
        height=600,
        key="logs_display",
        help="Die neuesten Logs stehen oben, die ältesten unten."
    )

    if not logs or logs.strip() == "":
        st.warning("⚠️ Keine Logs verfügbar. Prüfe ob der Service läuft.")

    auto_refresh = st.checkbox("🔄 Auto-Refresh Logs (10s)", key="auto_refresh_logs")
    if auto_refresh:
        # Verwende st.empty() und st.rerun() ohne time.sleep() - Streamlit wird automatisch neu rendern
        placeholder = st.empty()
        placeholder.info("⏳ Auto-Refresh aktiv...")
        st.rerun()


def tab_metrics():
    """Metriken Tab - Vollständige Metriken-Übersicht"""
    st.title("📈 Metriken & Monitoring")

    # Metriken-Erklärung
    st.markdown("""
    **📊 ML-Modell Metriken:**
    - **Accuracy:** Anteil korrekter Vorhersagen (0-1)
    - **Precision:** Anteil korrekter positiver Vorhersagen (0-1)
    - **Recall:** Anteil gefundener positiver Fälle (0-1)
    - **F1-Score:** Harmonisches Mittel von Precision und Recall (0-1)
    - **ROC-AUC:** Area under ROC Curve (0-1, >0.5 ist besser als zufällig)

    **🏥 System Metriken:**
    - **Health Status:** Service-Verfügbarkeit
    - **Uptime:** Laufzeit des Services
    - **API Requests:** Anzahl der API-Aufrufe
    """)

    st.divider()

    if st.button("🔄 Metriken aktualisieren"):
        st.rerun()

    # System Health Metriken
    st.subheader("🏥 System Health")
    health = get_health_status()
    if health:
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("Status", "🟢 Healthy" if health.get("status") == "healthy" else "🔴 Degraded")
        with col2:
            uptime = health.get("uptime_seconds", 0)
            hours = uptime // 3600
            minutes = (uptime % 3600) // 60
            st.metric("Uptime", f"{int(hours)}h {int(minutes)}m")
        with col3:
            st.metric("Modelle", health.get("model_count", 0))

    # Prometheus Metrics
    st.subheader("📊 Prometheus Monitoring")
    try:
        metrics = get_metrics()
        if metrics:
            # Parse Metriken nach Kategorien
            system_metrics = {}
            api_metrics = {}
            model_metrics = {}

            for line in metrics.split('\n'):
                if line and not line.startswith('#'):
                    parts = line.split()
                    if len(parts) >= 2:
                        metric_name = parts[0]
                        try:
                            metric_value = float(parts[1]) if '.' in parts[1] else int(parts[1])

                            # Kategorisiere Metriken
                            if 'api' in metric_name.lower() or 'http' in metric_name.lower():
                                api_metrics[metric_name] = metric_value
                            elif 'model' in metric_name.lower():
                                model_metrics[metric_name] = metric_value
                            else:
                                system_metrics[metric_name] = metric_value

                        except:
                            system_metrics[metric_name] = parts[1]

            # Zeige Metriken nach Kategorien
            col1, col2, col3 = st.columns(3)

            with col1:
                st.markdown("**🖥️ System Metriken**")
                if system_metrics:
                    st.json(system_metrics)
                else:
                    st.info("Keine System-Metriken verfügbar")

            with col2:
                st.markdown("**🌐 API Metriken**")
                if api_metrics:
                    st.json(api_metrics)
                else:
                    st.info("Keine API-Metriken verfügbar")

            with col3:
                st.markdown("**🤖 Modell Metriken**")
                if model_metrics:
                    st.json(model_metrics)
                else:
                    st.info("Keine Modell-Metriken verfügbar")

            # Raw Metriken (expandable)
            with st.expander("📄 Raw Prometheus Metriken"):
                st.code(metrics, language="text")

        else:
            st.error("❌ Metriken konnten nicht abgerufen werden")
    except Exception as e:
        st.error(f"❌ Fehler beim Abrufen der Metriken: {str(e)}")

    st.divider()

    # Modell-Metriken Übersicht
    st.subheader("🤖 Aktuelle Modelle")
    models = api_get("/models")
    if models and isinstance(models, list):
        # Erstelle Übersicht der Metriken
        metrics_data = []
        for model in models[:10]:  # Zeige nur die letzten 10
            metrics_data.append({
                "Name": model.get("name", "N/A"),
                "Status": model.get("status", "N/A"),
                "Accuracy": f"{model.get('accuracy', 0):.3f}",
                "F1-Score": f"{model.get('f1_score', 0):.3f}",
                "Features": len(model.get('features', []))
            })

        if metrics_data:
            st.dataframe(metrics_data, use_container_width=True)
    else:
        st.info("Keine Modelle gefunden")

    auto_refresh_metrics = st.checkbox("🔄 Auto-Refresh Metriken (10s)", key="auto_refresh_metrics")
    if auto_refresh_metrics:
        import time
        time.sleep(10)
        st.rerun()


def tab_info():
    """Info Tab - Vollständige Projekt-Informationen"""
    st.title("ℹ️ Projekt-Informationen")

    # Projekt-Übersicht
    st.header("📋 Was macht dieses Projekt?")
    st.markdown("""
    **ML Prediction Service** ist ein Machine-Learning-Service für die Verwaltung und Nutzung trainierter KI-Modelle.

    Das System:
    - ✅ Verwaltet trainierte ML-Modelle (Random Forest, XGBoost)
    - ✅ Ermöglicht manuelle Vorhersagen mit gespeicherten Modellen
    - ✅ Bietet ein Web-Interface für Monitoring und Konfiguration
    - ✅ Integriert Alert-System für automatische Benachrichtigungen
    - ✅ Importiert Modelle aus dem ML Training Service
    - ✅ Speichert Vorhersage-Historie
    - ✅ Exportiert Prometheus-Metriken für Monitoring
    """)

    st.divider()

    # Datenfluss
    st.header("🔄 Datenfluss")
    st.code("""
    ML Training Service (extern)
            ↓
            ├─ trainierte Modelle (.pkl Dateien)
            └─ Modell-Metadaten
            ↓
    ML Prediction Service
            ├─ API-Endpunkte (/api/models, /api/predict, etc.)
            ├─ Vorhersage-Engine
            ├─ Alert-System
            ├─ Web-UI (Streamlit)
            └─ Prometheus-Metriken
    """, language="text")

    st.divider()

    # Technische Details
    st.header("🔧 Technische Details")

    st.subheader("Services")
    st.markdown("""
    - **FastAPI Service** (`app/main.py`): API-Endpunkte, Modell-Management, Health-Checks, Prometheus-Metriken
    - **Streamlit UI** (`app/streamlit_app.py`): Web-Interface für Monitoring und Modell-Management
    """)

    st.subheader("Ports")
    st.markdown("""
    **Externe Ports (Docker Host):**
    - **API**: Port `8012` (FastAPI)
    - **Web UI**: Port `8502` (Streamlit)

    **Interne Ports (Docker Container):**
    - **API**: Port `8000` (FastAPI)
    - **Web UI**: Port `8501` (Streamlit)
    """)

    st.divider()

    # API Endpoints
    st.header("🔌 API Endpoints - Vollständige Dokumentation")

    st.markdown("""
    **📋 API Übersicht:**
    - **Base URL:** `http://localhost:8012/api`
    - **Authentifizierung:** Keine erforderlich (lokale Entwicklung)
    - **Format:** JSON für Request/Response
    """)

    st.subheader("🤖 Modell-Management")

    st.markdown("""
    **GET `/api/models`**
    *Alle Modelle auflisten*

    **Response:**
    ```json
    [
      {
        "id": 1,
        "name": "XGBoost Modell",
        "model_type": "xgboost",
        "status": "active",
        "accuracy": 0.87,
        "created_at": "2024-12-27T10:00:00Z"
      }
    ]
    ```

    **GET `/api/models/{model_id}`**
    *Modell-Details abrufen*

    **POST `/api/models/{model_id}/predict`**
    *Vorhersage mit Modell treffen*

    ```json
    {
      "features": {
        "price_close": 100.0,
        "volume_sol": 1000.0,
        "buy_pressure_ratio": 0.6
      }
    }
    ```
    """)

    st.subheader("🚨 Alert-System")

    st.markdown("""
    **GET `/api/alerts`**
    *Alle Alerts auflisten*

    **POST `/api/alerts`**
    *Neuen Alert erstellen*

    ```json
    {
      "name": "High Accuracy Alert",
      "model_id": 1,
      "threshold": 0.8,
      "email": "admin@example.com"
    }
    ```
    """)

    st.subheader("🔍 System & Monitoring")

    st.markdown("""
    **GET `/api/health`**
    *Health Check*

    **GET `/api/metrics`**
    *Prometheus-Metriken*

    **GET `/api/config`**
    *Aktuelle Konfiguration*
    """)

    st.divider()

    # Zusammenfassung
    st.header("📊 Zusammenfassung")

    col1, col2, col3 = st.columns(3)

    with col1:
        st.metric("Modelle", "Random Forest, XGBoost")

    with col2:
        st.metric("Vorhersagen", "Manuell + Historie")

    with col3:
        st.metric("Monitoring", "Prometheus + Health")

    st.info("""
    **Wichtig:**
    - Modelle werden aus dem ML Training Service importiert
    - Vorhersagen können manuell über die Web-UI oder API getroffen werden
    - Alert-System ermöglicht automatische Benachrichtigungen
    - Prometheus-Metriken sind für Monitoring verfügbar
    """)
