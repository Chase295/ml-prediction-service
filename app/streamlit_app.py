"""
Streamlit UI für ML Prediction Service
Web-Interface für Modell-Management mit Tab-basiertem Layout
REFACTORED VERSION - Aufgeteilt in Module
"""
import streamlit as st
import os

# Konfiguration
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000/api")

# Page Config
st.set_page_config(
    page_title="ML Prediction Service - Control Panel",
    page_icon="🔮",
    layout="wide"
)

# ============================================================
# Imports aus streamlit_pages
# ============================================================

from streamlit_pages.tabs import (
    tab_dashboard,
    tab_configuration,
    tab_logs,
    tab_metrics,
    tab_info
)
# Lazy Loading der Seiten für bessere Performance
@st.cache_resource
def get_page_overview():
    from streamlit_pages.overview import page_overview
    return page_overview

@st.cache_resource
def get_page_details():
    from streamlit_pages.details import page_details
    return page_details

@st.cache_resource
def get_page_model_import():
    from streamlit_pages.model_import import page_model_import
    return page_model_import

@st.cache_resource
def get_page_alert_system():
    from streamlit_pages.alert_system import page_alert_system
    return page_alert_system

@st.cache_resource
def get_page_alert_config():
    from streamlit_pages.alert_config import page_alert_config
    return page_alert_config

# ============================================================
# Main App
# ============================================================

def main():
    """Hauptfunktion mit Tab-basiertem Layout"""
    st.title("🔮 ML Prediction Service - Control Panel")

    # Tabs Navigation
    tab1, tab2, tab3, tab4, tab5, tab6, tab7, tab8 = st.tabs([
        "📊 Dashboard",
        "⚙️ Konfiguration",
        "📋 Logs",
        "📈 Metriken",
        "ℹ️ Info",
        "🏠 Modelle",
        "📥 Model Import",
        "🚨 Alert System"
    ])

    with tab1:
        tab_dashboard()

    with tab2:
        tab_configuration()

    with tab3:
        tab_logs()

    with tab4:
        tab_metrics()

    with tab5:
        tab_info()

    with tab6:
        # Debug-Ausgabe für Session-State
        if st.checkbox("🐛 Debug Session-State", value=False):
            st.write("**Session-State:**", dict(st.session_state))

        # Seiten-Management basierend auf URL-Parametern (zuverlässiger)
        query_params = st.experimental_get_query_params()
        page_param = query_params.get("page", [None])[0]
        model_id_param = query_params.get("model_id", [None])[0]
        alert_model_param = query_params.get("alert_model", [None])[0]

        # Navigation zurück zur Übersicht (auf allen Unterseiten)
        if page_param in ['details', 'alert_config']:
            col_nav, col_empty = st.columns([1, 4])
            with col_nav:
                if st.button("⬅️ Zurück zur Übersicht", key="nav_back_to_overview"):
                    st.experimental_set_query_params()
                    st.rerun()

        # Seite anzeigen basierend auf URL-Parametern (lazy loading)
        if page_param == 'details' and model_id_param:
            get_page_details()()
        elif page_param == 'alert_config' and alert_model_param:
            get_page_alert_config()()
        else:
            # Standard: Übersichtsseite
            get_page_overview()()

    with tab7:
        get_page_model_import()()

    with tab8:
        get_page_alert_system()()

if __name__ == "__main__":
    main()
