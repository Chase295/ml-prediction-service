"""
Alert System Page Module
Extrahierte Seite aus streamlit_app.py
"""
import streamlit as st
import pandas as pd
from typing import List, Dict, Any, Optional

# Import aus streamlit_utils
from streamlit_utils import (
    api_get, api_post, api_delete,
    get_alerts, create_alert, delete_alert,
    get_models
)


def page_alert_system():
    """Alert-System"""
    st.title("🚨 Alert-System")

    st.markdown("""
    **Alert-Management**

    Hier können Alerts für Modell-Vorhersagen konfiguriert werden.
    Alerts können bei bestimmten Vorhersage-Ergebnissen Benachrichtigungen auslösen.
    """)

    # Tabs für Alert-System
    tab1, tab2, tab3 = st.tabs([
        "📋 Aktive Alerts",
        "➕ Neuen Alert",
        "📊 Alert-Historie"
    ])

    with tab1:
        show_active_alerts()

    with tab2:
        show_create_alert()

    with tab3:
        show_alert_history()


def show_active_alerts():
    """Zeige aktive Alerts"""
    st.header("📋 Aktive Alerts")

    # Alerts laden
    alerts = get_alerts()
    if alerts is None:
        st.error("❌ Fehler beim Laden der Alerts")
        return

    if not alerts:
        st.info("ℹ️ Keine Alerts konfiguriert")
        st.info("💡 Erstelle deinen ersten Alert im Tab 'Neuen Alert'")
        return

    st.info(f"📊 {len(alerts)} Alert(s) gefunden")

    # Alerts als Karten darstellen
    for alert in alerts:
        with st.container():
            col1, col2, col3, col4, col5 = st.columns([2, 2, 1, 1, 1])

            with col1:
                st.subheader(f"🚨 {alert.get('name', 'Unbenannter Alert')}")

            with col2:
                model_id = alert.get('model_id')
                threshold = alert.get('threshold', 0)
                st.write(f"**Modell:** {model_id}")
                st.write(f"**Schwellwert:** {threshold}")
                st.write(f"**Status:** {'Aktiv' if alert.get('active', True) else 'Inaktiv'}")

            with col3:
                email = alert.get('email', 'Keine E-Mail')
                st.write(f"**E-Mail:** {email}")

            with col4:
                if st.button("✏️ Bearbeiten", key=f"edit_{alert.get('id')}", use_container_width=True):
                    st.info("✏️ Bearbeiten-Funktion kommt bald")

            with col5:
                if st.button("🗑️ Löschen", key=f"delete_{alert.get('id')}", use_container_width=True, type="secondary"):
                    if delete_alert(alert.get('id')):
                        st.success("✅ Alert gelöscht")
                        st.rerun()
                    else:
                        st.error("❌ Fehler beim Löschen")

            st.divider()


def show_create_alert():
    """Zeige Form für neuen Alert"""
    st.header("➕ Neuen Alert erstellen")

    # Verfügbare Modelle laden
    models = get_models()
    if not models:
        st.warning("⚠️ Keine Modelle verfügbar. Erstelle zuerst ein Modell.")
        return

    # Alert-Form
    with st.form("alert_form"):
        st.subheader("📋 Alert-Konfiguration")

        alert_name = st.text_input(
            "Alert-Name *",
            help="Eindeutiger Name für den Alert"
        )

        # Modell-Auswahl
        model_options = {f"{m.get('name')} (ID: {m.get('id')})": m.get('id') for m in models}
        selected_model_display = st.selectbox(
            "Modell auswählen *",
            options=list(model_options.keys()),
            help="Wähle das Modell für das der Alert gelten soll"
        )
        model_id = model_options.get(selected_model_display)

        threshold = st.slider(
            "Schwellwert *",
            min_value=0.0,
            max_value=1.0,
            value=0.8,
            step=0.05,
            help="Schwellwert für Alert-Auslösung (0.0 = immer, 1.0 = nie)"
        )

        condition = st.selectbox(
            "Bedingung",
            ["prediction > threshold", "prediction < threshold", "confidence > threshold", "confidence < threshold"],
            help="Unter welcher Bedingung soll der Alert ausgelöst werden?"
        )

        email = st.text_input(
            "E-Mail für Benachrichtigungen",
            help="E-Mail-Adresse für Alert-Benachrichtigungen (optional)"
        )

        active = st.checkbox(
            "Alert aktiv",
            value=True,
            help="Aktiviert/deaktiviert den Alert"
        )

        # Erklärung der Bedingungen
        with st.expander("ℹ️ Hilfe zu Alert-Bedingungen"):
            st.markdown("""
            **Verfügbare Bedingungen:**

            - **prediction > threshold:** Alert wenn Vorhersage > Schwellwert
            - **prediction < threshold:** Alert wenn Vorhersage < Schwellwert
            - **confidence > threshold:** Alert wenn Konfidenz > Schwellwert
            - **confidence < threshold:** Alert wenn Konfidenz < Schwellwert

            **Beispiele:**
            - Schwellwert 0.8 + "prediction > threshold" → Alert bei Vorhersagen > 80%
            - Schwellwert 0.2 + "confidence < threshold" → Alert bei niedriger Konfidenz < 20%
            """)

        submitted = st.form_submit_button("🚨 Alert erstellen", type="primary")

        if submitted:
            if not alert_name:
                st.error("❌ Bitte Alert-Name eingeben")
                return

            if not model_id:
                st.error("❌ Bitte Modell auswählen")
                return

            alert_data = {
                "name": alert_name,
                "model_id": model_id,
                "threshold": threshold,
                "condition": condition,
                "email": email,
                "active": active
            }

            result = create_alert(alert_data)

            if result:
                st.success("✅ Alert erstellt!")
                st.info("🔄 Seite wird aktualisiert...")
                st.rerun()
            else:
                st.error("❌ Fehler beim Erstellen des Alerts")


def show_alert_history():
    """Zeige Alert-Historie"""
    st.header("📊 Alert-Historie")

    # Placeholder für Alert-Historie
    st.info("📊 Alert-Historie wird geladen...")

    # Hier könnte Alert-Historie aus der API geladen werden
    # alert_history = api_get("/alerts/history")

    st.caption("💡 Alert-Historie Funktion wird in zukünftiger Version verfügbar sein")

    # Beispiel-Daten für Demo
    sample_history = [
        {
            "id": 1,
            "alert_name": "High Risk Alert",
            "model_name": "XGBoost Modell",
            "prediction": 0.95,
            "threshold": 0.8,
            "triggered_at": "2024-12-27 14:30:00",
            "email_sent": True
        },
        {
            "id": 2,
            "alert_name": "Low Confidence Alert",
            "model_name": "Random Forest Modell",
            "prediction": 0.3,
            "threshold": 0.2,
            "triggered_at": "2024-12-27 13:15:00",
            "email_sent": False
        }
    ]

    if sample_history:
        history_df = pd.DataFrame(sample_history)
        st.dataframe(history_df, use_container_width=True)

        # Statistiken
        total_alerts = len(sample_history)
        email_sent = sum(1 for alert in sample_history if alert.get('email_sent', False))

        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("Ausgelöste Alerts", total_alerts)
        with col2:
            st.metric("E-Mails versendet", email_sent)
        with col3:
            st.metric("Erfolgsrate", f"{email_sent/total_alerts*100:.0f}%" if total_alerts > 0 else "0%")
