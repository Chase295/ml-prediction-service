"""
Model Import Page Module
Extrahierte Seite aus streamlit_app.py
"""
import streamlit as st
import os
from datetime import datetime
from typing import Dict, Any, Optional
import httpx

# Import aus streamlit_utils
from streamlit_utils import (
    api_post
)


def page_model_import():
    """Modell-Import"""
    st.title("📥 Modell-Import")

    st.markdown("""
    **Modell-Import aus dem ML Training Service**

    Hier können trainierte Modelle aus dem ML Training Service importiert werden.
    Die Modelle werden automatisch heruntergeladen und in der Datenbank gespeichert.
    """)

    # Verfügbare Modelle laden und als Dropdown anzeigen
    st.subheader("📋 Verfügbare Modelle")

    selected_model = None

    # Versuche verfügbare Modelle aus Training Service zu laden
    try:
        # Training Service URL (persistent gespeichert)
        # Verwende Konfigurationsdatei, dann Umgebungsvariable, dann Default
        config_file = "/app/config/training_service_url.txt"

        # Lade gespeicherte URL aus Datei
        if os.path.exists(config_file):
            try:
                with open(config_file, 'r') as f:
                    saved_url = f.read().strip()
                    if saved_url:
                        default_url = saved_url
                    else:
                        default_url = os.getenv("TRAINING_SERVICE_API_URL", "http://host.docker.internal:8012/api")
                        if default_url.endswith('/api'):
                            default_url = default_url[:-4]  # Entferne /api für die Anzeige
            except:
                default_url = os.getenv("TRAINING_SERVICE_API_URL", "http://host.docker.internal:8012/api")
                if default_url.endswith('/api'):
                    default_url = default_url[:-4]  # Entferne /api für die Anzeige
        else:
            default_url = os.getenv("TRAINING_SERVICE_API_URL", "http://host.docker.internal:8012/api")
            if default_url.endswith('/api'):
                default_url = default_url[:-4]  # Entferne /api für die Anzeige

        # URL-Konfiguration (persistent gespeichert)
        col1, col2 = st.columns([3, 1])
        with col1:
            training_service_url = st.text_input(
                "Training Service URL",
                value=default_url,
                help="URL des ML Training Service (wird dauerhaft gespeichert)"
            )

        with col2:
            if st.button("💾 Speichern"):
                try:
                    # Erstelle Verzeichnis falls nicht vorhanden
                    os.makedirs(os.path.dirname(config_file), exist_ok=True)
                    # Speichere URL in Datei
                    with open(config_file, 'w') as f:
                        f.write(training_service_url)
                    st.success("✅ URL dauerhaft gespeichert!")
                    st.rerun()  # Seite neu laden um Änderung zu zeigen
                except Exception as e:
                    st.error(f"❌ Fehler beim Speichern: {str(e)}")

        # Zeige aktuelle gespeicherte URL
        if os.path.exists(config_file):
            try:
                with open(config_file, 'r') as f:
                    current_saved = f.read().strip()
                st.caption(f"💾 Aktuell gespeichert: {current_saved}")
            except:
                pass
        with col2:
            if st.button("🔄 Test Verbindung"):
                try:
                    with httpx.Client(timeout=10.0) as client:
                        response = client.get(f"{training_service_url}/api/health")
                        if response.status_code == 200:
                            st.success("✅ Verbindung erfolgreich!")
                        else:
                            st.error("❌ Verbindung fehlgeschlagen")
                except Exception as e:
                    st.error(f"❌ Verbindung fehlgeschlagen: {str(e)}")

        st.info("🔍 Lade verfügbare Modelle aus Training Service...")

        # API Call zum Training Service
        try:
            with httpx.Client(timeout=10.0) as client:
                response = client.get(f"{training_service_url}/api/models")
                if response.status_code == 200:
                    training_models = response.json()
                else:
                    training_models = None
                    st.error(f"❌ API Fehler: {response.status_code}")
        except Exception as e:
            training_models = None
            st.error(f"❌ Verbindung fehlgeschlagen: {str(e)}")


        if training_models and isinstance(training_models, list):
            st.success(f"✅ {len(training_models)} Modell(e) gefunden!")

            # Erstelle Dropdown-Optionen
            model_options = ["-- Modell auswählen --"]
            model_details = {"-- Modell auswählen --": None}

            for model in training_models:
                model_name = model.get('name', f"Modell {model.get('id', 'N/A')}")
                model_type = model.get('model_type', 'N/A')
                accuracy = model.get('training_accuracy', 0)
                created_at = model.get('created_at', 'N/A')

                # Formatierte Option mit Details
                option_text = f"{model_name} ({model_type}) - Acc: {accuracy:.1%}"
                model_options.append(option_text)
                model_details[option_text] = model

            # Dropdown für Modell-Auswahl
            selected_option = st.selectbox(
                "Verfügbares Modell auswählen:",
                options=model_options,
                key="model_selector",
                help="Wähle ein trainiertes Modell aus dem Training Service aus"
            )

            # Wenn ein Modell ausgewählt wurde, zeige Details
            if selected_option and selected_option != "-- Modell auswählen --":
                selected_model = model_details[selected_option]

                # Zeige Modell-Details
                with st.expander("📋 Modell-Details", expanded=True):
                    col1, col2, col3 = st.columns(3)

                    with col1:
                        st.metric("Name", selected_model.get('name', 'N/A'))
                        st.metric("Typ", selected_model.get('model_type', 'N/A'))

                    with col2:
                        accuracy = selected_model.get('training_accuracy', 0)
                        f1 = selected_model.get('training_f1', 0)
                        st.metric("Accuracy", f"{accuracy:.1%}")
                        st.metric("F1-Score", f"{f1:.1%}")

                    with col3:
                        created = selected_model.get('created_at', 'N/A')
                        status = selected_model.get('status', 'N/A')
                        st.metric("Status", status.upper())
                        if created != 'N/A':
                            try:
                                created_dt = datetime.fromisoformat(created.replace('Z', '+00:00'))
                                st.metric("Erstellt", created_dt.strftime('%d.%m.%Y'))
                            except:
                                st.metric("Erstellt", created[:10])

                    # Features anzeigen
                    features = selected_model.get('features', [])
                    if features:
                        st.subheader("📊 Features")
                        st.write(f"{len(features)} Features: {', '.join(features[:10])}{'...' if len(features) > 10 else ''}")

        # Import-Form (erscheint erst nach der Modell-Auswahl)
        if selected_model:
            st.divider()
            st.subheader("📥 Import durchführen")

            with st.form("import_form"):
                # Zeige ausgewähltes Modell
                model_name = selected_model.get('name', '')
                model_type = selected_model.get('model_type', 'random_forest')
                st.success(f"✅ Ausgewählt: {model_name} ({model_type})")

                # Import-Button
                submitted = st.form_submit_button("📥 Modell importieren", type="primary")

            if submitted:
                # Import-Prozess starten
                with st.spinner("📥 Modell wird importiert..."):
                    # API Request für Import - verwende die model_id aus dem ausgewählten Modell
                    import_data = {
                        "model_id": selected_model.get("id"),  # Die ID aus der ml_models Tabelle
                        "model_file_url": None  # Wird automatisch vom Service generiert
                    }

                    result = api_post("/models/import", import_data)

                    if result:
                        st.success(f"✅ Modell '{model_name}' erfolgreich importiert!")

                        # Zusätzliche Info anzeigen
                        model_id = result.get('model_id')
                        if model_id:
                            st.info(f"📋 Modell-ID: {model_id}")

                            # Button für Details
                            if st.button("📋 Zu den Details", key="goto_details"):
                                st.session_state['model_id'] = model_id
                                st.session_state['page'] = 'details'
                                st.rerun()

                        # Raw Response
                        with st.expander("📄 Import Details"):
                            st.json(result)

                    else:
                        st.error("❌ Fehler beim Importieren des Modells")
                        st.info("💡 Prüfe ob der ML Training Service läuft und das Modell existiert")

        else:
            st.warning("⚠️ Keine Modelle im Training Service gefunden")
            st.info("💡 Stelle sicher, dass der ML Training Service läuft und Modelle trainiert wurden")

    except Exception as e:
        st.error(f"❌ Fehler beim Laden der Modelle: {str(e)}")
        st.caption("🔌 Training Service nicht erreichbar oder API-Fehler")
        st.info("💡 Prüfe die Training Service URL und Netzwerkverbindung")

    # Anleitung
    st.divider()
    st.subheader("📖 Anleitung")

    st.markdown("""
    **Schritt-für-Schritt Anleitung:**

    1. **Training Service starten:** Stelle sicher, dass der ML Training Service läuft
    2. **Modell trainieren:** Erstelle und trainiere ein Modell im Training Service
    3. **Modell-Name notieren:** Merke dir den Namen des trainierten Modells
    4. **Import durchführen:** Gib den Modell-Namen oben ein und klicke "Importieren"
    5. **Verwendung:** Das importierte Modell steht nun für Vorhersagen zur Verfügung

    **Wichtige Hinweise:**
    - ✅ Modelle werden automatisch validiert beim Import
    - ✅ Alle Metadaten werden übertragen (Features, Metriken, etc.)
    - ✅ Modelle sind sofort einsatzbereit nach dem Import
    - ⚠️ Bereits existierende Modelle mit gleichem Namen werden überschrieben
    """)
