"""
Alert Configuration Page Module
Modell-spezifische Alert-Einstellungen
"""
import streamlit as st
import pandas as pd
from typing import List, Dict, Any, Optional

# Import aus streamlit_utils
from streamlit_utils import (
    api_get, api_post, api_patch,
    get_models
)


def page_alert_config():
    """Modell-spezifische Alert-Konfiguration"""
    st.title("⚙️ Alert-Konfiguration")

    # Hole das ausgewählte Modell aus URL-Parametern
    query_params = st.experimental_get_query_params()
    model_id = query_params.get("alert_model", [None])[0]
    if not model_id:
        st.error("❌ Kein Modell ausgewählt")
        if st.button("⬅️ Zurück zur Übersicht", type="primary"):
            st.experimental_set_query_params()
            st.rerun()
        return

    model_id = int(model_id)

    def load_model():
        """Lädt das Modell neu"""
        with st.spinner("🔄 Lade Modell-Details..."):
            return api_get(f"/models/{model_id}")

    # Hole Modell-Details
    model = load_model()

    if not model:
        st.error("❌ Modell nicht gefunden")
        return

    model_name = model.get('custom_name') or model.get('name', f'Modell {model_id}')
    st.header(f"🎯 Alert-Einstellungen für {model_name}")

    # Aktuelle Konfiguration anzeigen
    st.subheader("📊 Aktuelle Konfiguration")

    col1, col2 = st.columns(2)

    with col1:
        current_webhook = model.get('n8n_webhook_url', '')
        current_mode = model.get('n8n_send_mode', 'all')
        current_threshold = model.get('alert_threshold', 0.7)

        st.info(f"**Webhook URL:** {current_webhook or 'Nicht gesetzt'}")
        st.info(f"**Send-Modus:** {current_mode}")
        st.info(f"**Alert-Schwelle:** {current_threshold * 100:.1f}%")

        # Zeige aktuelle Ignore-Einstellungen
        current_ignore_bad = model.get('ignore_bad_seconds', 0)
        current_ignore_positive = model.get('ignore_positive_seconds', 0)
        current_ignore_alert = model.get('ignore_alert_seconds', 0)

        st.info(f"**Ignore schlecht:** {current_ignore_bad}s")
        st.info(f"**Ignore positiv:** {current_ignore_positive}s")
        st.info(f"**Ignore Alert:** {current_ignore_alert}s")

    with col2:
        is_active = model.get('is_active', False)
        n8n_enabled = model.get('n8n_enabled', True)

        status_color = "🟢" if is_active else "🔴"
        webhook_color = "🟢" if n8n_enabled else "🔴"

        st.info(f"**Modell-Status:** {status_color} {'Aktiv' if is_active else 'Inaktiv'}")
        st.info(f"**N8N aktiviert:** {webhook_color} {'Ja' if n8n_enabled else 'Nein'}")

        # Coin-Filter Status
        filter_mode = model.get('coin_filter_mode', 'all')
        filter_status = "Alle Coins" if filter_mode == 'all' else f"Whitelist ({len(model.get('coin_whitelist', []))} Coins)"
        st.info(f"**Coin-Filter:** {filter_status}")

    # Konfigurations-Formular
    st.subheader("⚙️ Konfiguration ändern")

    with st.form("alert_config_form"):
        st.markdown("### N8N Webhook Einstellungen")

        # N8N Webhook URL
        webhook_url = st.text_input(
            "N8N Webhook URL",
            value=model.get('n8n_webhook_url', ''),
            placeholder="https://your-n8n-instance/webhook/...",
            help="Leer lassen um globale URL zu verwenden"
        )

        # N8N aktiviert/deaktiviert
        n8n_enabled_new = st.checkbox(
            "N8N Benachrichtigungen aktivieren",
            value=model.get('n8n_enabled', True),
            help="Aktiviert/deaktiviert N8N Benachrichtigungen für dieses Modell"
        )

        # Send-Modus
        send_mode_options = {
            'all': 'Alle Vorhersagen senden',
            'alerts_only': 'Nur Alerts senden (über Schwelle)',
            'positive_only': 'Nur positive Vorhersagen',
            'negative_only': 'Nur negative Vorhersagen'
        }

        current_mode = model.get('n8n_send_mode', 'all')
        send_mode = st.selectbox(
            "Send-Modus",
            options=list(send_mode_options.keys()),
            format_func=lambda x: send_mode_options[x],
            index=list(send_mode_options.keys()).index(current_mode),
            help="Was soll an N8N gesendet werden?"
        )

        # Alert-Schwelle
        alert_threshold = st.slider(
            "Alert-Schwelle (%)",
            min_value=0.0,
            max_value=1.0,
            value=model.get('alert_threshold', 0.7),
            step=0.05,
            format="%.1f%%",
            help="Ab welcher Wahrscheinlichkeit gilt es als Alert?"
        )

        st.markdown("### Coin-Filter Einstellungen")

        # Coin-Filter Modus
        current_filter_mode = model.get('coin_filter_mode', 'all')
        filter_mode_options = ['all', 'whitelist']
        filter_mode = st.radio(
            "Coin-Filter Modus",
            options=filter_mode_options,
            format_func=lambda x: "Alle Coins" if x == 'all' else "Whitelist (nur ausgewählte Coins)",
            index=filter_mode_options.index(current_filter_mode),
            help="Welche Coins sollen überwacht werden?"
        )

        # Coin-Whitelist (nur wenn whitelist gewählt)
        coin_whitelist = []
        if filter_mode == 'whitelist':
            st.markdown("**Coin-Whitelist:**")
            st.markdown("*Ein Coin pro Zeile (z.B. ABCxyz123...)*")

            # Hole aktuelle Whitelist aus Modell (falls vorhanden)
            current_whitelist = model.get('coin_whitelist', [])

            whitelist_text = st.text_area(
                "Coin-Adressen (eine pro Zeile)",
                value='\n'.join(current_whitelist) if current_whitelist else '',
                height=100,
                help="Mint-Adressen der Coins die überwacht werden sollen"
            )

            if whitelist_text.strip():
                coin_whitelist = [line.strip() for line in whitelist_text.split('\n') if line.strip()]

        # 🔄 NEUE SEKTION: Coin-Ignore Einstellungen
        st.markdown("### 🚫 Coin-Ignore Einstellungen")
        st.markdown("*Hinweis: Diese Einstellungen gelten nur für automatische Coin-Metric-Verarbeitung, nicht für manuelle API-Calls!*")

        # Zeit-Eingaben für Ignore
        col_ignore1, col_ignore2, col_ignore3 = st.columns(3)

        with col_ignore1:
            ignore_bad_seconds = st.number_input(
                "Schlechte Vorhersagen ignorieren (Sekunden)",
                min_value=0,
                max_value=86400,  # Max 24 Stunden
                value=model.get('ignore_bad_seconds', 0),
                step=10,
                help="Coins mit schlechten Vorhersagen (prediction=0) für diese Zeit ignorieren"
            )

        with col_ignore2:
            ignore_positive_seconds = st.number_input(
                "Positive Vorhersagen ignorieren (Sekunden)",
                min_value=0,
                max_value=86400,
                value=model.get('ignore_positive_seconds', 0),
                step=30,
                help="Coins mit positiven Vorhersagen (prediction=1) für diese Zeit ignorieren"
            )

        with col_ignore3:
            ignore_alert_seconds = st.number_input(
                "Alert-Vorhersagen ignorieren (Sekunden)",
                min_value=0,
                max_value=86400,
                value=model.get('ignore_alert_seconds', 0),
                step=60,
                help="Coins mit Alert-Vorhersagen (probability >= threshold) für diese Zeit ignorieren"
            )

        # Hilfstext für Ignore-Einstellungen
        st.markdown("""
        **Beispiele:**
        - `0` = Nie ignorieren (Standard)
        - `20` = 20 Sekunden ignorieren
        - `300` = 5 Minuten ignorieren
        - `3600` = 1 Stunde ignorieren

        **Funktionsweise:**
        - Coin wird nach entsprechendem Ergebnis für X Sekunden ignoriert
        - Während dieser Zeit: Keine automatischen Scans
        - Nach Ablauf: Normale Verarbeitung möglich
        - Manuelle API-Calls funktionieren immer
        """)

        # Submit Button
        submitted = st.form_submit_button("💾 Konfiguration speichern", type="primary")

        if submitted:
            # Validiere Webhook URL falls angegeben
            if webhook_url and not webhook_url.startswith(('http://', 'https://')):
                st.error("❌ Webhook URL muss mit http:// oder https:// beginnen")
                return

            # Erstelle Update-Daten für Alert-Konfiguration
            alert_update_data = {
                'n8n_webhook_url': webhook_url,
                'n8n_enabled': n8n_enabled_new,
                'n8n_send_mode': send_mode,
                'alert_threshold': alert_threshold,
                'coin_filter_mode': filter_mode,
                'coin_whitelist': coin_whitelist
            }

            # Erstelle Update-Daten für Ignore-Einstellungen
            ignore_update_data = {
                'ignore_bad_seconds': ignore_bad_seconds,
                'ignore_positive_seconds': ignore_positive_seconds,
                'ignore_alert_seconds': ignore_alert_seconds
            }

            # Sende beide Updates an API mit Spinner
            with st.spinner("💾 Speichere Konfiguration..."):
                alert_result = api_patch(f"/models/{model_id}/alert-config", alert_update_data)
                ignore_result = api_patch(f"/models/{model_id}/ignore-settings", ignore_update_data)

            if alert_result and ignore_result:
                st.success("✅ Konfiguration erfolgreich gespeichert!")
                st.success("✅ Alert-Einstellungen und Ignore-Timings aktualisiert!")
                st.balloons()

                # Seite neu laden um alle Werte zu aktualisieren
                st.rerun()
            else:
                if not alert_result:
                    st.error("❌ Fehler beim Speichern der Alert-Konfiguration")
                if not ignore_result:
                    st.error("❌ Fehler beim Speichern der Ignore-Einstellungen")

    # Navigation zurück
    st.divider()
    col_back, col_empty = st.columns([1, 3])

    with col_back:
        if st.button("⬅️ Zurück zur Übersicht", type="secondary", use_container_width=True):
            st.experimental_set_query_params()
            st.rerun()
