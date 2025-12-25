"""
Streamlit UI für ML Prediction Service

Bietet vollständige Verwaltung und Monitoring:
- Modell-Verwaltung (Import, Aktivieren, Deaktivieren, Umbenennen, Löschen)
- Vorhersagen (manuell, Liste, Details)
- Logs anzeigen
- Statistiken
- Health Status
"""
import streamlit as st
import requests
import json
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional, List
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go

# ============================================================
# Konfiguration
# ============================================================

API_BASE_URL = "http://localhost:8000/api"

# Page Config
st.set_page_config(
    page_title="ML Prediction Service",
    page_icon="🔮",
    layout="wide",
    initial_sidebar_state="expanded"
)

# ============================================================
# Helper Functions
# ============================================================

def api_get(endpoint: str, params: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
    """GET Request zur API"""
    try:
        response = requests.get(f"{API_BASE_URL}{endpoint}", params=params, timeout=10)
        if response.status_code == 200:
            return response.json()
        else:
            st.error(f"❌ API Fehler ({response.status_code}): {response.text}")
            return None
    except Exception as e:
        st.error(f"❌ Verbindungsfehler: {e}")
        return None

def api_post(endpoint: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """POST Request zur API"""
    try:
        response = requests.post(f"{API_BASE_URL}{endpoint}", json=data, timeout=30)
        if response.status_code in [200, 201]:
            return response.json()
        else:
            error_text = response.text
            try:
                error_json = response.json()
                error_text = error_json.get("detail", error_text)
            except:
                pass
            st.error(f"❌ API Fehler ({response.status_code}): {error_text}")
            return None
    except Exception as e:
        st.error(f"❌ Verbindungsfehler: {e}")
        return None

def api_patch(endpoint: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """PATCH Request zur API"""
    try:
        response = requests.patch(f"{API_BASE_URL}{endpoint}", json=data, timeout=10)
        if response.status_code == 200:
            return response.json()
        else:
            error_text = response.text
            try:
                error_json = response.json()
                error_text = error_json.get("detail", error_text)
            except:
                pass
            st.error(f"❌ API Fehler ({response.status_code}): {error_text}")
            return None
    except Exception as e:
        st.error(f"❌ Verbindungsfehler: {e}")
        return None

def api_delete(endpoint: str) -> bool:
    """DELETE Request zur API"""
    try:
        response = requests.delete(f"{API_BASE_URL}{endpoint}", timeout=10)
        if response.status_code == 200:
            return True
        else:
            error_text = response.text
            try:
                error_json = response.json()
                error_text = error_json.get("detail", error_text)
            except:
                pass
            st.error(f"❌ API Fehler ({response.status_code}): {error_text}")
            return False
    except Exception as e:
        st.error(f"❌ Verbindungsfehler: {e}")
        return False

# ============================================================
# Seiten
# ============================================================

def page_overview():
    """Übersicht: Aktive Modelle"""
    st.title("🏠 Übersicht - Aktive Modelle")
    
    # Initialisiere selected_models in session_state
    if 'selected_model_ids' not in st.session_state:
        st.session_state['selected_model_ids'] = []
    
    # Filter-Optionen
    col_filter1, col_filter2 = st.columns(2)
    with col_filter1:
        show_inactive = st.checkbox("📋 Pausierte Modelle anzeigen", value=False, help="Zeigt auch inaktive (pausierte) Modelle an")
    with col_filter2:
        st.caption("")  # Spacer
    
    # Lade Modelle (aktiv + optional inaktiv)
    params = {"include_inactive": "true"} if show_inactive else None
    data = api_get("/models/active", params=params)
    if not data:
        st.warning("⚠️ Konnte Modelle nicht laden")
        return
    
    models = data.get("models", [])
    total = data.get("total", 0)
    
    filter_text = " (inkl. pausierte)" if show_inactive else ""
    st.info(f"📊 {total} Modell(e) gefunden{filter_text}")
    
    if total == 0:
        st.info("ℹ️ Keine aktiven Modelle. Importiere zuerst ein Modell!")
        return
    
    # Kompakte Karten-Ansicht (wie Training Service)
    st.subheader("📋 Aktive Modelle")
    
    # Erstelle Karten in einem Grid (2 Spalten)
    cols = st.columns(2)
    
    for idx, model in enumerate(models):
        model_id = model.get('id')
        model_name = model.get('custom_name') or model.get('name', f"ID: {model_id}")
        model_type = model.get('model_type', 'N/A')
        is_active = model.get('is_active', False)
        total_predictions = model.get('total_predictions', 0)
        last_prediction = model.get('last_prediction_at')
        downloaded_at = model.get('downloaded_at')
        
        # Checkbox
        is_selected = model_id in st.session_state.get('selected_model_ids', [])
        checkbox_key = f"checkbox_{model_id}"
        
        # Wähle Spalte (abwechselnd)
        col = cols[idx % 2]
        
        with col:
            # Karte mit Border (wie Training Service)
            card_style = """
            <style>
            .model-card {
                border: 2px solid #e0e0e0;
                border-radius: 8px;
                padding: 12px;
                margin-bottom: 12px;
                background: white;
            }
            .model-card.selected {
                border-color: #1f77b4;
                background: #f0f8ff;
            }
            </style>
            """
            st.markdown(card_style, unsafe_allow_html=True)
            
            # Header mit Checkbox und Name
            header_col1, header_col2, header_col3, header_col4 = st.columns([0.3, 4, 0.6, 0.6])
            with header_col1:
                checked = st.checkbox("Auswählen", value=is_selected, key=checkbox_key, label_visibility="collapsed")
                if checked != is_selected:
                    if checked:
                        if model_id not in st.session_state['selected_model_ids']:
                            st.session_state['selected_model_ids'].append(model_id)
                            st.rerun()
                    else:
                        if model_id in st.session_state['selected_model_ids']:
                            st.session_state['selected_model_ids'].remove(model_id)
                            st.rerun()
            
            with header_col2:
                # Name mit Umbenennen
                if st.session_state.get(f'renaming_{model_id}', False):
                    # Popup-ähnliches Verhalten mit Expander
                    with st.expander("✏️ Modell bearbeiten", expanded=True):
                        new_name = st.text_input("Name *", value=model_name, key=f"new_name_{model_id}")
                        new_desc = st.text_area("Beschreibung", value=model.get('description', '') or '', key=f"new_desc_{model_id}", height=80)
                        
                        # Alert-Threshold (kompakt)
                        alert_threshold = model.get('alert_threshold', 0.7)
                        new_threshold = st.slider(
                            "🚨 Alert-Threshold",
                            min_value=0.0,
                            max_value=1.0,
                            value=float(alert_threshold),
                            step=0.01,
                            key=f"threshold_{model_id}",
                            help="Wahrscheinlichkeits-Schwelle für Alerts (0.0-1.0, z.B. 0.7 = 70%)"
                        )
                        
                        st.divider()
                        st.markdown("**🔗 n8n Einstellungen**")
                        
                        # n8n aktiviert/deaktiviert
                        # Direkt aus model dict lesen, explizit prüfen ob None
                        # WICHTIG: Prüfe session_state zuerst, sonst wird der Wert beim Öffnen nicht aktualisiert
                        checkbox_key = f"n8n_enabled_{model_id}"
                        if checkbox_key not in st.session_state:
                            # Initialisiere aus model dict
                            model_n8n_enabled = model.get('n8n_enabled')
                            if model_n8n_enabled is None:
                                st.session_state[checkbox_key] = True  # Default
                            else:
                                st.session_state[checkbox_key] = bool(model_n8n_enabled)
                        
                        new_n8n_enabled = st.checkbox(
                            "n8n aktiviert",
                            value=st.session_state[checkbox_key],
                            key=checkbox_key,
                            help="Wenn deaktiviert, werden keine Vorhersagen an n8n gesendet"
                        )
                        
                        # n8n Webhook URL
                        current_n8n_url = model.get('n8n_webhook_url') or ''
                        new_n8n_url = st.text_input(
                            "n8n Webhook URL",
                            value=current_n8n_url if current_n8n_url else '',
                            key=f"n8n_url_{model_id}",
                            help="n8n Webhook URL für dieses Modell (optional, leer = globale URL verwenden)",
                            disabled=not new_n8n_enabled
                        )
                        
                        # n8n Send Mode
                        current_send_mode = model.get('n8n_send_mode', 'all')
                        new_send_mode = st.selectbox(
                            "Send-Mode",
                            options=['all', 'alerts_only'],
                            index=0 if current_send_mode == 'all' else 1,
                            key=f"n8n_mode_{model_id}",
                            help="'all' = alle Vorhersagen senden, 'alerts_only' = nur Alerts senden",
                            disabled=not new_n8n_enabled
                        )
                        
                        # Buttons nebeneinander ohne verschachtelte Spalten
                        if st.button("💾 Speichern", key=f"save_{model_id}", use_container_width=True, type="primary"):
                            if new_name and new_name.strip():
                                data = {"name": new_name.strip()}
                                if new_desc and new_desc.strip():
                                    data["description"] = new_desc.strip()
                                result = api_patch(f"/models/{model_id}/rename", data)
                                if result:
                                    # Speichere auch Alert-Threshold
                                    threshold_result = api_patch(f"/models/{model_id}/alert-threshold", {"alert_threshold": new_threshold})
                                    
                                    # Speichere n8n Einstellungen (immer speichern, auch wenn unverändert)
                                    n8n_data = {
                                        'n8n_enabled': bool(new_n8n_enabled),  # Explizit zu bool konvertieren
                                        'n8n_webhook_url': new_n8n_url.strip() if new_n8n_url.strip() else None,
                                        'n8n_send_mode': new_send_mode
                                    }
                                    n8n_result = api_patch(f"/models/{model_id}/n8n-settings", n8n_data)
                                    if not n8n_result:
                                        st.warning("⚠️ n8n Einstellungen konnten nicht gespeichert werden")
                                    else:
                                        # Debug: Zeige was gespeichert wurde
                                        st.info(f"🔍 Debug: n8n_enabled={n8n_result.get('n8n_enabled')} gespeichert")
                                    
                                    # Lösche session_state für Checkbox, damit beim nächsten Öffnen der aktuelle Wert geladen wird
                                    if checkbox_key in st.session_state:
                                        del st.session_state[checkbox_key]
                                    
                                    if threshold_result:
                                        st.session_state[f'renaming_{model_id}'] = False
                                        st.success("✅ Modell erfolgreich aktualisiert")
                                        st.rerun()
                                    else:
                                        st.session_state[f'renaming_{model_id}'] = False
                                        st.success("✅ Modell erfolgreich umbenannt")
                                        st.rerun()
                            else:
                                st.warning("⚠️ Name darf nicht leer sein")
                        
                        if st.button("❌ Abbrechen", key=f"cancel_{model_id}", use_container_width=True):
                            # Lösche session_state für Checkbox beim Abbrechen
                            if checkbox_key in st.session_state:
                                del st.session_state[checkbox_key]
                            st.session_state[f'renaming_{model_id}'] = False
                            st.rerun()
                else:
                    st.markdown(f"**{model_name}**")
            
            with header_col3:
                if st.button("📋", key=f"details_{model_id}", help="Details anzeigen", use_container_width=True):
                    st.session_state['details_model_id'] = model_id
                    st.session_state['page'] = 'details'
                    st.rerun()
            
            with header_col4:
                if not st.session_state.get(f'renaming_{model_id}', False):
                    if st.button("✏️", key=f"rename_{model_id}", help="Umbenennen", use_container_width=True):
                        st.session_state[f'renaming_{model_id}'] = True
                        st.rerun()
            
            # Kompakte Info-Zeile
            info_col1, info_col2, info_col3, info_col4 = st.columns(4)
            
            with info_col1:
                type_emoji = "🌲" if model_type == "random_forest" else "🚀" if model_type == "xgboost" else "🤖"
                st.caption(f"{type_emoji} {model_type}")
            
            with info_col2:
                if is_active:
                    status_text = "🟢 Aktiv"
                    st.caption(status_text)
                else:
                    status_text = "⏸️ Pausiert"
                    st.caption(f":orange[{status_text}]", help="Modell ist pausiert und verarbeitet keine neuen Vorhersagen")
            
            with info_col3:
                st.caption(f"#{model_id}")
            
            with info_col4:
                # n8n Status (aktiviert/deaktiviert + letzter Send-Versuch)
                # DEBUG: Zeige den rohen Wert
                model_n8n_enabled_raw = model.get('n8n_enabled')
                if model_n8n_enabled_raw is None:
                    n8n_enabled = True  # Default
                else:
                    n8n_enabled = bool(model_n8n_enabled_raw)
                
                # DEBUG: Zeige was geladen wurde
                # st.caption(f"DEBUG: raw={model_n8n_enabled_raw}, bool={n8n_enabled}")
                
                if not n8n_enabled:
                    st.caption("🔗 n8n: ⏸️", help="n8n ist für dieses Modell deaktiviert")
                else:
                    # Nur Status abrufen wenn n8n aktiviert ist (spart API-Calls)
                    n8n_status_data = api_get(f"/models/{model_id}/n8n-status")
                    if n8n_status_data:
                        n8n_status = n8n_status_data.get('status', 'unknown')
                        last_attempt = n8n_status_data.get('last_attempt')
                        last_error = n8n_status_data.get('last_error')
                        
                        if n8n_status == 'ok':
                            help_text = f"Letzter Send-Versuch erfolgreich"
                            if last_attempt:
                                help_text += f" ({last_attempt[:19]})"
                            st.caption("🔗 n8n: ✅", help=help_text)
                        elif n8n_status == 'error':
                            help_text = f"Letzter Send-Versuch fehlgeschlagen"
                            if last_error:
                                help_text += f": {last_error[:50]}"
                            if last_attempt:
                                help_text += f" ({last_attempt[:19]})"
                            st.caption("🔗 n8n: ❌", help=help_text)
                        elif n8n_status == 'no_url':
                            st.caption("🔗 n8n: ⚪", help="Keine n8n URL konfiguriert")
                        else:
                            help_text = "Noch kein Send-Versuch"
                            if last_attempt:
                                help_text += f" (letzter Versuch: {last_attempt[:19]})"
                            st.caption("🔗 n8n: ❓", help=help_text)
                    else:
                        st.caption("🔗 n8n: ❓", help="n8n Status konnte nicht geladen werden")
            
            # Metriken kompakt
            stats = model.get('stats') or {}  # Sicherstellen dass stats ein Dict ist
            positive_preds = stats.get('positive_predictions', 0) if stats else 0
            negative_preds = stats.get('negative_predictions', 0) if stats else 0
            alerts_count = stats.get('alerts_count', 0) if stats else 0
            alert_threshold = model.get('alert_threshold', 0.7)
            
            metric_col1, metric_col2, metric_col3, metric_col4 = st.columns(4)
            with metric_col1:
                st.metric("✅ Positiv", positive_preds, help="Anzahl positiver Vorhersagen (prediction = 1)")
            with metric_col2:
                st.metric("❌ Negativ", negative_preds, help="Anzahl negativer Vorhersagen (prediction = 0)")
            with metric_col3:
                st.metric("🚨 Alerts", alerts_count, help=f"Anzahl Alerts (positive Vorhersagen mit Wahrscheinlichkeit >= {alert_threshold:.0%})")
            with metric_col4:
                if model.get("price_change_percent"):
                    st.metric("Min. Änderung", f"{model.get('price_change_percent')}%", help="Mindest-Prozentuale Änderung")
                elif model.get("future_minutes"):
                    st.metric("Zeitbasiert", f"{model.get('future_minutes')} Min", help="Vorhersage für die nächsten X Minuten")
                else:
                    st.metric("Klassisch", "—", help="Klassisches Modell (keine zeitbasierte Vorhersage)")
            
            # Kompakte Info-Zeile mit Alert-Threshold
            info_line_col1, info_line_col2 = st.columns([3, 1])
            with info_line_col1:
                st.caption("")  # Spacer
            with info_line_col2:
                st.caption(f"🚨 Alert: {alert_threshold:.0%}", help=f"Alert-Threshold: {alert_threshold:.0%} (zum Ändern: ✏️ Button)")
            
            # Zusätzliche Infos
            info_row1, info_row2 = st.columns(2)
            
            with info_row1:
                # Features
                features_list = model.get('features', [])
                if features_list:
                    num_features = len(features_list)
                    st.caption(f"📊 {num_features} Features")
                
                # Zeitbasierte Vorhersage Info
                future_minutes = model.get('future_minutes')
                price_change = model.get('price_change_percent')
                direction = model.get('target_direction')
                
                if future_minutes and price_change:
                    direction_emoji = "📈" if direction == "up" else "📉" if direction == "down" else ""
                    direction_text = "steigt" if direction == "up" else "fällt" if direction == "down" else ""
                    st.markdown(f"**⏰ Zeitbasierte Vorhersage:** {future_minutes}min, {price_change}% {direction_text} {direction_emoji}")
                else:
                    target_var = model.get('target_variable', 'N/A')
                    target_operator = model.get('target_operator')
                    target_value = model.get('target_value')
                    if target_operator and target_value is not None:
                        st.markdown(f"**🎯 Ziel:** {target_var} {target_operator} {target_value}")
                    else:
                        st.caption("🎯 Ziel: Nicht konfiguriert")
            
            with info_row2:
                # Letzte Vorhersage
                if last_prediction:
                    try:
                        if isinstance(last_prediction, str):
                            last_pred_dt = datetime.fromisoformat(last_prediction.replace('Z', '+00:00'))
                        else:
                            last_pred_dt = last_prediction
                        last_pred_str = last_pred_dt.strftime("%d.%m.%Y %H:%M")
                        st.caption(f"🕐 Letzte Vorhersage: {last_pred_str}")
                    except:
                        st.caption(f"🕐 Letzte Vorhersage: {str(last_prediction)[:19] if len(str(last_prediction)) > 19 else str(last_prediction)}")
                else:
                    st.caption("🕐 Letzte Vorhersage: Nie")
                
                # Importiert-Datum
                if downloaded_at:
                    try:
                        if isinstance(downloaded_at, str):
                            downloaded_dt = datetime.fromisoformat(downloaded_at.replace('Z', '+00:00'))
                        else:
                            downloaded_dt = downloaded_at
                        downloaded_str = downloaded_dt.strftime("%d.%m.%Y %H:%M")
                        st.caption(f"📥 Importiert: {downloaded_str}")
                    except:
                        st.caption(f"📥 Importiert: {str(downloaded_at)[:19] if len(str(downloaded_at)) > 19 else str(downloaded_at)}")
                else:
                    st.caption("📥 Importiert: N/A")
            
            # Dünne graue Linie zur Trennung
            if idx < len(models) - 1:
                st.markdown("<hr style='margin: 10px 0; border: none; border-top: 1px solid #e0e0e0;'>", unsafe_allow_html=True)
    
    # Zeige ausgewählte Modelle
    selected_model_ids = st.session_state.get('selected_model_ids', [])
    selected_model_ids = [mid for mid in selected_model_ids if any(m.get('id') == mid for m in models)]
    if len(selected_model_ids) != len(st.session_state.get('selected_model_ids', [])):
        st.session_state['selected_model_ids'] = selected_model_ids
    
    selected_count = len(selected_model_ids)
    if selected_count > 0:
        st.divider()
        st.subheader(f"🔧 Aktionen ({selected_count} Modell(e) ausgewählt)")
        
        selected_models = [m for m in models if m.get('id') in selected_model_ids]
        
        # Zeige ausgewählte Modelle
        if selected_count <= 3:
            selected_names = [f"{m.get('custom_name') or m.get('name')} (ID: {m.get('id')})" for m in selected_models]
            st.info(f"📌 Ausgewählt: {', '.join(selected_names)}")
        
        # Aktionen basierend auf Anzahl
        if selected_count == 1:
            # 1 Modell: Aktivieren/Deaktivieren, Details, Löschen
            model_id = selected_model_ids[0]
            selected_model = selected_models[0]
            
            col1, col2, col3, col4 = st.columns(4)
            
            with col1:
                if selected_model.get("is_active"):
                    if st.button("🔴 Deaktivieren", key="btn_deactivate", use_container_width=True):
                        result = api_post(f"/models/{model_id}/deactivate", {})
                        if result:
                            st.success("✅ Modell deaktiviert")
                            st.rerun()
                else:
                    if st.button("🟢 Aktivieren", key="btn_activate", use_container_width=True, type="primary"):
                        result = api_post(f"/models/{model_id}/activate", {})
                        if result:
                            st.success("✅ Modell aktiviert")
                            st.rerun()
            
            with col2:
                if st.button("📋 Details", key="btn_details", use_container_width=True):
                    st.session_state['details_model_id'] = model_id
                    st.session_state['page'] = 'details'
                    st.rerun()
            
            with col3:
                if st.button("✏️ Umbenennen", key="btn_rename", use_container_width=True):
                    st.session_state[f'renaming_{model_id}'] = True
                    st.rerun()
            
            with col4:
                if st.button("🗑️ Löschen", key="btn_delete", use_container_width=True, type="secondary"):
                    with st.spinner("🗑️ Lösche Modell..."):
                        if api_delete(f"/models/{model_id}"):
                            st.success("✅ Modell gelöscht")
                            # Lösche aus Selection
                            if model_id in st.session_state.get('selected_model_ids', []):
                                st.session_state['selected_model_ids'].remove(model_id)
                            # Warte kurz, damit DB-Update durch ist
                            import time
                            time.sleep(0.5)
                            st.rerun()
                        else:
                            st.error("❌ Fehler beim Löschen des Modells")
        
        elif selected_count >= 2:
            # Mehrere Modelle: Nur Löschen
            if st.button("🗑️ Alle ausgewählten löschen", key="btn_delete_all", use_container_width=True, type="secondary"):
                with st.spinner("🗑️ Lösche Modelle..."):
                    deleted_count = 0
                    failed_count = 0
                    ids_to_delete = list(st.session_state.get('selected_model_ids', []))
                    for model_id in ids_to_delete:
                        if api_delete(f"/models/{model_id}"):
                            deleted_count += 1
                            if model_id in st.session_state.get('selected_model_ids', []):
                                st.session_state['selected_model_ids'].remove(model_id)
                        else:
                            failed_count += 1
                    
                    if deleted_count > 0 or failed_count > 0:
                        if deleted_count > 0:
                            if failed_count > 0:
                                st.warning(f"⚠️ {deleted_count} Modell(e) gelöscht, {failed_count} Fehler")
                            else:
                                st.success(f"✅ {deleted_count} Modell(e) gelöscht")
                        if failed_count > 0 and deleted_count == 0:
                            st.error(f"❌ Fehler beim Löschen von {failed_count} Modell(en)")
                        # Warte kurz, damit DB-Updates durch sind
                        import time
                        time.sleep(0.5)
                        st.rerun()
    else:
        st.info("💡 Wähle ein oder mehrere Modelle aus, um Aktionen auszuführen")

def page_import():
    """Modell importieren"""
    st.title("📥 Modell importieren")
    
    # Info-Box am Anfang
    st.info("""
    **📖 Anleitung:** 
    Diese Seite importiert ein Modell vom Training Service in den Prediction Service.
    Das Modell wird heruntergeladen und lokal gespeichert, damit es für Vorhersagen verwendet werden kann.
    """)
    
    # Lade verfügbare Modelle
    data = api_get("/models/available")
    if not data:
        st.warning("⚠️ Konnte verfügbare Modelle nicht laden")
        return
    
    models = data.get("models", [])
    total = data.get("total", 0)
    
    st.metric("Verfügbare Modelle", total)
    
    if total == 0:
        st.info("ℹ️ Keine Modelle verfügbar. Erstelle zuerst ein Modell im Training Service!")
        return
    
    # Modell-Auswahl
    model_options = {f"{m.get('name')} (ID: {m.get('id')})": m.get('id') for m in models}
    selected_name = st.selectbox("Modell auswählen", list(model_options.keys()))
    selected_model_id = model_options[selected_name]
    
    selected_model = next((m for m in models if m.get('id') == selected_model_id), None)
    
    if selected_model:
        st.markdown("### 📊 Modell-Details")
        
        # Kompakte Karten-Ansicht (wie Training Service)
        col1, col2 = st.columns(2)
        
        with col1:
            st.markdown("**📝 Basis-Informationen:**")
            st.write(f"**Typ:** {selected_model.get('model_type', 'N/A')}")
            st.write(f"**Target:** {selected_model.get('target_variable', 'N/A')}")
            if selected_model.get('future_minutes'):
                direction_emoji = "📈" if selected_model.get('target_direction') == "up" else "📉"
                st.write(f"**Zeitbasiert:** {selected_model.get('future_minutes')} Min, {selected_model.get('price_change_percent', 0)}% {direction_emoji}")
            st.write(f"**Features:** {len(selected_model.get('features', []))}")
            st.write(f"**Phasen:** {selected_model.get('phases', [])}")
        
        with col2:
            st.markdown("**📊 Performance:**")
            accuracy = selected_model.get('training_accuracy')
            if accuracy:
                st.metric("Training Accuracy", f"{accuracy:.4f}", help="Accuracy auf Trainingsdaten")
            f1 = selected_model.get('training_f1')
            if f1:
                st.metric("Training F1-Score", f"{f1:.4f}", help="F1-Score auf Trainingsdaten")
            roc_auc = selected_model.get('roc_auc')
            if roc_auc:
                st.metric("ROC-AUC", f"{roc_auc:.4f}", help="Area Under ROC Curve")
        
        # Import-Button
        if st.button("📥 Modell importieren", type="primary", use_container_width=True):
            with st.spinner("⏳ Importiere Modell..."):
                result = api_post("/models/import", {"model_id": selected_model_id})
                if result:
                    st.success(f"✅ Modell erfolgreich importiert! (Active Model ID: {result.get('active_model_id')})")
                    st.balloons()
                    # Warte kurz, damit DB-Update durch ist
                    import time
                    time.sleep(0.5)
                    st.rerun()
                else:
                    st.error("❌ Fehler beim Importieren des Modells")

def page_predict():
    """Manuelle Vorhersage"""
    st.title("🔮 Manuelle Vorhersage")
    
    # Info-Box am Anfang
    st.info("""
    **📖 Anleitung:** 
    Diese Seite macht eine manuelle Vorhersage für einen Coin mit allen aktiven Modellen.
    Du kannst wählen, welche Modelle verwendet werden sollen, oder alle aktiven Modelle nutzen.
    """)
    
    # Lade aktive Modelle
    data = api_get("/models/active")
    if not data:
        st.warning("⚠️ Konnte aktive Modelle nicht laden")
        return
    
    models = data.get("models", [])
    active_models = [m for m in models if m.get("is_active", False)]
    
    if len(active_models) == 0:
        st.warning("⚠️ Keine aktiven Modelle! Aktiviere zuerst ein Modell.")
        return
    
    st.metric("Aktive Modelle", len(active_models))
    
    # Formular
    with st.form("predict_form"):
        coin_id = st.text_input("Coin-ID (mint) *", placeholder="ABC123...")
        
        # Modell-Auswahl (optional)
        model_options = {f"{m.get('custom_name') or m.get('name')} (ID: {m.get('id')})": m.get('id') for m in active_models}
        selected_models = st.multiselect(
            "Modelle (optional - wenn leer: alle aktiven)",
            list(model_options.keys())
        )
        selected_model_ids = [model_options[name] for name in selected_models] if selected_models else None
        
        # Timestamp (optional)
        use_custom_timestamp = st.checkbox("Spezifischen Zeitpunkt verwenden (optional)")
        timestamp = None
        if use_custom_timestamp:
            date = st.date_input("Datum", value=None, help="Datum für die Vorhersage")
            time = st.time_input("Uhrzeit", value=None, help="Uhrzeit für die Vorhersage")
            if date and time:
                timestamp = datetime.combine(date, time)
        
        if st.form_submit_button("🔮 Vorhersage machen", type="primary", use_container_width=True):
            if not coin_id:
                st.error("❌ Bitte Coin-ID eingeben!")
            else:
                with st.spinner("⏳ Berechne Vorhersage..."):
                    request_data = {"coin_id": coin_id}
                    if selected_model_ids:
                        request_data["model_ids"] = selected_model_ids
                    if timestamp:
                        request_data["timestamp"] = timestamp.isoformat()
                    
                    result = api_post("/predict", request_data)
                    if result:
                        st.success("✅ Vorhersage erfolgreich!")
                        
                        predictions = result.get("predictions", [])
                        alerts_count = result.get("alerts_count", 0)
                        
                        st.metric("Vorhersagen", len(predictions))
                        if alerts_count > 0:
                            st.metric("🚨 Alerts", alerts_count, delta=f"{alerts_count} Warnungen")
                        
                        # Zeige Ergebnisse
                        for pred in predictions:
                            with st.container():
                                col1, col2, col3 = st.columns([2, 1, 1])
                                
                                with col1:
                                    st.markdown(f"**{pred.get('model_name')}**")
                                    st.caption(f"Typ: {pred.get('model_type', 'N/A')}")
                                
                                with col2:
                                    pred_value = pred.get("prediction", 0)
                                    prob = pred.get("probability", 0)
                                    st.markdown(f"**Vorhersage:** {'✅ Ja' if pred_value == 1 else '❌ Nein'}")
                                    st.markdown(f"**Wahrscheinlichkeit:** {prob:.2%}")
                                
                                with col3:
                                    is_alert = pred.get("is_alert", False)
                                    if is_alert:
                                        st.markdown("🚨 **ALERT**")
                                    st.caption(f"Dauer: {pred.get('prediction_duration_ms', 0)}ms")
                                
                                st.divider()

def page_predictions():
    """Vorhersagen-Liste"""
    st.title("📋 Vorhersagen")
    
    # Info-Box
    st.info("""
    **📖 Anleitung:** 
    Diese Seite zeigt alle Vorhersagen, die vom System erstellt wurden.
    Nutze die Filter, um gezielt nach bestimmten Vorhersagen zu suchen.
    """)
    
    # Filter-Sektion
    with st.expander("🔍 Filter", expanded=True):
        col1, col2, col3 = st.columns(3)
        
        with col1:
            coin_id_filter = st.text_input("🪙 Coin-ID", placeholder="Optional", key="coin_filter", help="Filter nach Coin-ID (mint)")
            
            model_id_filter = st.number_input("📊 Modell-ID (Training)", min_value=0, value=0, step=1, key="model_id_filter", help="Filter nach Modell-ID aus ml_models (0 = alle)")
            if model_id_filter == 0:
                model_id_filter = None
        
        with col2:
            # Lade aktive Modelle für Dropdown
            active_models_data = api_get("/models/active")
            active_models = active_models_data.get("models", []) if active_models_data else []
            active_model_options = ["Alle"] + [f"{m.get('custom_name') or m.get('name')} (ID: {m.get('id')})" for m in active_models]
            
            active_model_selected = st.selectbox(
                "🔮 Aktives Modell",
                options=active_model_options,
                key="active_model_filter",
                help="Filter nach aktivem Modell (aus prediction_active_models)"
            )
            active_model_id_filter = None
            if active_model_selected != "Alle" and active_models:
                # Extrahiere ID aus Auswahl
                selected_name = active_model_selected.split("(ID: ")[1].rstrip(")") if "(ID: " in active_model_selected else None
                if selected_name:
                    try:
                        active_model_id_filter = int(selected_name)
                    except:
                        pass
            
            prediction_filter = st.selectbox(
                "🎯 Vorhersage",
                options=["Alle", "✅ Positiv (1)", "❌ Negativ (0)"],
                key="prediction_filter",
                help="Filter nach Vorhersage-Wert"
            )
            prediction_value = None
            if prediction_filter == "✅ Positiv (1)":
                prediction_value = 1
            elif prediction_filter == "❌ Negativ (0)":
                prediction_value = 0
        
        with col3:
            min_prob = st.slider(
                "📈 Min. Wahrscheinlichkeit",
                min_value=0.0,
                max_value=1.0,
                value=0.0,
                step=0.01,
                key="min_prob_filter",
                help="Minimale Wahrscheinlichkeit (0.0 = alle)"
            )
            if min_prob == 0.0:
                min_prob = None
            
            max_prob = st.slider(
                "📉 Max. Wahrscheinlichkeit",
                min_value=0.0,
                max_value=1.0,
                value=1.0,
                step=0.01,
                key="max_prob_filter",
                help="Maximale Wahrscheinlichkeit (1.0 = alle)"
            )
            if max_prob == 1.0:
                max_prob = None
        
        # Zeitraum-Filter
        st.markdown("**⏰ Zeitraum**")
        col_date1, col_date2 = st.columns(2)
        
        with col_date1:
            date_from = st.date_input(
                "Von",
                value=None,
                key="date_from_filter",
                help="Filter ab diesem Datum (optional)"
            )
            time_from = st.time_input(
                "Uhrzeit (von)",
                value=None,
                key="time_from_filter",
                help="Filter ab dieser Uhrzeit (optional)"
            )
        
        with col_date2:
            date_to = st.date_input(
                "Bis",
                value=None,
                key="date_to_filter",
                help="Filter bis zu diesem Datum (optional)"
            )
            time_to = st.time_input(
                "Uhrzeit (bis)",
                value=None,
                key="time_to_filter",
                help="Filter bis zu dieser Uhrzeit (optional)"
            )
        
        # Phase-Filter
        phase_filter = st.number_input(
            "📊 Phase",
            min_value=0,
            value=0,
            step=1,
            key="phase_filter",
            help="Filter nach Phase (0 = alle)"
        )
        phase_id_filter = None if phase_filter == 0 else phase_filter
        
        # Limit
        limit = st.number_input("📄 Limit", min_value=1, max_value=1000, value=100, step=10, key="limit_filter", help="Anzahl der angezeigten Vorhersagen")
    
    # Konvertiere Datum/Zeit zu datetime
    date_from_dt = None
    if date_from:
        if time_from:
            date_from_dt = datetime.combine(date_from, time_from).replace(tzinfo=timezone.utc)
        else:
            date_from_dt = datetime.combine(date_from, datetime.min.time()).replace(tzinfo=timezone.utc)
    
    date_to_dt = None
    if date_to:
        if time_to:
            date_to_dt = datetime.combine(date_to, time_to).replace(tzinfo=timezone.utc)
        else:
            # Ende des Tages
            date_to_dt = datetime.combine(date_to, datetime.max.time().replace(microsecond=0)).replace(tzinfo=timezone.utc)
    
    # Lade Vorhersagen
    params = {"limit": limit}
    if coin_id_filter:
        params["coin_id"] = coin_id_filter
    if model_id_filter:
        params["model_id"] = model_id_filter
    if active_model_id_filter:
        params["active_model_id"] = active_model_id_filter
    if prediction_value is not None:
        params["prediction"] = prediction_value
    if min_prob is not None:
        params["min_probability"] = min_prob
    if max_prob is not None:
        params["max_probability"] = max_prob
    if phase_id_filter:
        params["phase_id"] = phase_id_filter
    if date_from_dt:
        params["date_from"] = date_from_dt.isoformat()
    if date_to_dt:
        params["date_to"] = date_to_dt.isoformat()
    
    query_string = "&".join([f"{k}={v}" for k, v in params.items()])
    data = api_get(f"/predictions?{query_string}")
    
    if not data:
        st.warning("⚠️ Konnte Vorhersagen nicht laden")
        return
    
    predictions = data.get("predictions", [])
    total = data.get("total", 0)
    
    st.metric("Gesamt", total)
    st.metric("Angezeigt", len(predictions))
    
    if len(predictions) == 0:
        st.info("ℹ️ Keine Vorhersagen gefunden")
        return
    
    # Kompakte Karten-Ansicht (wie Training Service)
    st.subheader("📋 Vorhersagen")
    
    # Erstelle Karten in einem Grid (2 Spalten)
    cols = st.columns(2)
    
    for idx, pred in enumerate(predictions):
        pred_id = pred.get("id")
        coin_id = pred.get("coin_id", "N/A")
        data_timestamp = pred.get("data_timestamp", "N/A")
        model_id = pred.get("model_id", "N/A")
        prediction = pred.get("prediction", 0)
        probability = pred.get("probability", 0)
        phase_id = pred.get("phase_id_at_time", "N/A")
        duration_ms = pred.get("prediction_duration_ms", "N/A")
        
        # Wähle Spalte (abwechselnd)
        col = cols[idx % 2]
        
        with col:
            # Karte mit Border
            card_style = """
            <style>
            .prediction-card {
                border: 2px solid #e0e0e0;
                border-radius: 8px;
                padding: 12px;
                margin-bottom: 12px;
                background: white;
            }
            </style>
            """
            st.markdown(card_style, unsafe_allow_html=True)
            
            # Header
            header_col1, header_col2 = st.columns([3, 1])
            with header_col1:
                st.markdown(f"**Vorhersage #{pred_id}**")
            with header_col2:
                st.caption(f"Modell: #{model_id}")
            
            # Metriken
            metric_col1, metric_col2, metric_col3 = st.columns(3)
            with metric_col1:
                pred_emoji = "✅" if prediction == 1 else "❌"
                pred_text = "Ja" if prediction == 1 else "Nein"
                st.metric("Vorhersage", f"{pred_emoji} {pred_text}", help="Vorhergesagter Wert (1 = Positiv, 0 = Negativ)")
            with metric_col2:
                st.metric("Wahrscheinlichkeit", f"{probability:.2%}", help="Konfidenz der Vorhersage (0-100%)")
            with metric_col3:
                if duration_ms != "N/A":
                    st.metric("Dauer", f"{duration_ms} ms", help="Zeit für die Vorhersage in Millisekunden")
                else:
                    st.caption("Dauer: N/A")
            
            # Zusätzliche Infos
            info_row1, info_row2 = st.columns(2)
            with info_row1:
                coin_display = coin_id[:20] + "..." if len(coin_id) > 20 else coin_id
                st.caption(f"🪙 Coin: {coin_display}")
                if phase_id != "N/A":
                    st.caption(f"📊 Phase: {phase_id}")
            with info_row2:
                if data_timestamp != "N/A":
                    try:
                        if isinstance(data_timestamp, str):
                            timestamp_dt = datetime.fromisoformat(data_timestamp.replace('Z', '+00:00'))
                        else:
                            timestamp_dt = data_timestamp
                        timestamp_str = timestamp_dt.strftime("%d.%m.%Y %H:%M")
                        st.caption(f"🕐 {timestamp_str}")
                    except:
                        st.caption(f"🕐 {str(data_timestamp)[:19] if len(str(data_timestamp)) > 19 else str(data_timestamp)}")
            
            # Dünne graue Linie zur Trennung
            if idx < len(predictions) - 1:
                st.markdown("<hr style='margin: 10px 0; border: none; border-top: 1px solid #e0e0e0;'>", unsafe_allow_html=True)

def page_stats():
    """Statistiken - Aufgewertet mit mehr Informationen"""
    st.title("📊 Statistiken & Übersicht")
    
    # Info-Box
    with st.expander("📖 Anleitung & Erklärungen", expanded=False):
        st.markdown("""
        **Diese Seite zeigt alle wichtigen Statistiken und Metriken des Prediction Service:**
        
        - **Vorhersagen-Statistiken:** Gesamtanzahl, Zeiträume, Verteilung
        - **Modell-Performance:** Statistiken pro Modell
        - **n8n Integration:** Webhook-Statistiken und Erfolgsraten
        - **System-Status:** Health, Performance, Uptime
        - **Zeitbasierte Analysen:** Trends über verschiedene Zeiträume
        """)
    
    # Stats laden
    stats = api_get("/stats")
    if not stats:
        st.warning("⚠️ Konnte Statistiken nicht laden")
        return
    
    # ============================================================
    # Haupt-Metriken (4 Spalten)
    # ============================================================
    st.subheader("🎯 Haupt-Metriken")
    main_col1, main_col2, main_col3, main_col4 = st.columns(4)
    
    with main_col1:
        total_preds = stats.get("total_predictions", 0)
        st.metric(
            "📊 Gesamt Predictions", 
            f"{total_preds:,}".replace(",", "."),
            help="Gesamtanzahl aller Vorhersagen seit Start des Services"
        )
    
    with main_col2:
        active_models = stats.get("active_models", 0)
        st.metric(
            "🤖 Aktive Modelle", 
            active_models,
            help="Anzahl der aktuell aktiven Modelle"
        )
    
    with main_col3:
        coins_tracked = stats.get("coins_tracked", 0)
        st.metric(
            "🪙 Coins getrackt", 
            coins_tracked,
            help="Anzahl der verschiedenen Coins, für die Vorhersagen gemacht wurden"
        )
    
    with main_col4:
        avg_time = stats.get("avg_prediction_time_ms", 0)
        if avg_time:
            st.metric(
                "⏱️ Ø Dauer", 
                f"{avg_time:.1f} ms",
                help="Durchschnittliche Zeit pro Vorhersage in Millisekunden"
            )
        else:
            st.metric("⏱️ Ø Dauer", "N/A")
    
    st.divider()
    
    # ============================================================
    # Zeitbasierte Statistiken
    # ============================================================
    st.subheader("⏰ Zeitbasierte Statistiken")
    time_col1, time_col2, time_col3, time_col4 = st.columns(4)
    
    with time_col1:
        last_hour = stats.get("predictions_last_hour", 0)
        st.metric(
            "🕐 Letzte Stunde", 
            f"{last_hour:,}".replace(",", "."),
            help="Anzahl der Vorhersagen in der letzten Stunde"
        )
    
    with time_col2:
        last_24h = stats.get("predictions_last_24h", 0)
        st.metric(
            "📅 Letzte 24h", 
            f"{last_24h:,}".replace(",", "."),
            help="Anzahl der Vorhersagen in den letzten 24 Stunden"
        )
    
    with time_col3:
        last_7d = stats.get("predictions_last_7d", 0)
        st.metric(
            "📆 Letzte 7 Tage", 
            f"{last_7d:,}".replace(",", "."),
            help="Anzahl der Vorhersagen in den letzten 7 Tagen"
        )
    
    with time_col4:
        # Berechne Predictions pro Minute (letzte Stunde)
        if last_hour > 0:
            per_minute = last_hour / 60
            st.metric(
                "⚡ Pro Minute", 
                f"{per_minute:.1f}",
                help="Durchschnittliche Vorhersagen pro Minute (letzte Stunde)"
            )
        else:
            st.metric("⚡ Pro Minute", "0.0")
    
    st.divider()
    
    # ============================================================
    # Modell-spezifische Statistiken
    # ============================================================
    st.subheader("🤖 Modell-Performance")
    
    # Lade aktive Modelle für detaillierte Statistiken
    models_data = api_get("/models/active")
    if models_data and models_data.get("models"):
        models = models_data.get("models", [])
        
        # Erstelle Tabelle mit Modell-Statistiken
        model_stats_data = []
        for model in models:
            model_id = model.get("id")
            model_name = model.get("custom_name") or model.get("name", f"ID: {model_id}")
            model_stats = model.get("stats", {})
            
            total = model_stats.get("total_predictions", 0)
            positive = model_stats.get("positive_predictions", 0)
            negative = model_stats.get("negative_predictions", 0)
            alerts = model_stats.get("alerts_count", 0)
            
            positive_pct = (positive / total * 100) if total > 0 else 0
            alert_pct = (alerts / total * 100) if total > 0 else 0
            
            model_stats_data.append({
                "Modell": model_name,
                "ID": model_id,
                "Gesamt": total,
                "✅ Positiv": f"{positive} ({positive_pct:.1f}%)",
                "❌ Negativ": negative,
                "🚨 Alerts": f"{alerts} ({alert_pct:.1f}%)",
                "Typ": model.get("model_type", "N/A")
            })
        
        if model_stats_data:
            import pandas as pd
            df = pd.DataFrame(model_stats_data)
            st.dataframe(
                df,
                use_container_width=True,
                hide_index=True,
                column_config={
                    "Modell": st.column_config.TextColumn("Modell", width="medium"),
                    "ID": st.column_config.NumberColumn("ID", width="small"),
                    "Gesamt": st.column_config.NumberColumn("Gesamt", width="small"),
                    "✅ Positiv": st.column_config.TextColumn("✅ Positiv", width="medium"),
                    "❌ Negativ": st.column_config.NumberColumn("❌ Negativ", width="small"),
                    "🚨 Alerts": st.column_config.TextColumn("🚨 Alerts", width="medium"),
                    "Typ": st.column_config.TextColumn("Typ", width="small")
                }
            )
        else:
            st.info("ℹ️ Keine Modell-Statistiken verfügbar")
    else:
        st.info("ℹ️ Keine aktiven Modelle gefunden")
    
    st.divider()
    
    # ============================================================
    # n8n Integration Statistiken
    # ============================================================
    st.subheader("🔗 n8n Integration")
    
    # Lade Webhook-Logs Statistiken
    webhook_total = stats.get("webhook_total", 0)
    webhook_success = stats.get("webhook_success", 0)
    webhook_failed = stats.get("webhook_failed", 0)
    
    if webhook_total > 0:
        webhook_col1, webhook_col2, webhook_col3, webhook_col4 = st.columns(4)
        
        with webhook_col1:
            st.metric(
                "📤 Gesamt Sends", 
                f"{webhook_total:,}".replace(",", "."),
                help="Gesamtanzahl der n8n Webhook-Aufrufe"
            )
        
        with webhook_col2:
            success_rate = (webhook_success / webhook_total * 100) if webhook_total > 0 else 0
            st.metric(
                "✅ Erfolgreich", 
                f"{webhook_success:,} ({success_rate:.1f}%)".replace(",", "."),
                help="Anzahl erfolgreicher Webhook-Aufrufe"
            )
        
        with webhook_col3:
            fail_rate = (webhook_failed / webhook_total * 100) if webhook_total > 0 else 0
            st.metric(
                "❌ Fehlgeschlagen", 
                f"{webhook_failed:,} ({fail_rate:.1f}%)".replace(",", "."),
                help="Anzahl fehlgeschlagener Webhook-Aufrufe"
            )
        
        with webhook_col4:
            # Erfolgsrate Visualisierung
            if success_rate >= 95:
                status_emoji = "🟢"
                status_text = "Exzellent"
            elif success_rate >= 80:
                status_emoji = "🟡"
                status_text = "Gut"
            else:
                status_emoji = "🔴"
                status_text = "Verbesserung nötig"
            
            st.metric(
                "📊 Status", 
                f"{status_emoji} {status_text}",
                help=f"n8n Verbindungsstatus basierend auf Erfolgsrate ({success_rate:.1f}%)"
            )
        
        # Erfolgsrate Chart
        if webhook_total > 0:
            chart_col1, chart_col2 = st.columns([2, 1])
            with chart_col1:
                import pandas as pd
                webhook_df = pd.DataFrame({
                    "Status": ["Erfolgreich", "Fehlgeschlagen"],
                    "Anzahl": [webhook_success, webhook_failed]
                })
                st.bar_chart(webhook_df.set_index("Status"), use_container_width=True)
    else:
        st.info("ℹ️ Noch keine n8n Webhook-Aufrufe registriert")
    
    st.divider()
    
    # ============================================================
    # System-Status & Health
    # ============================================================
    st.subheader("🏥 System-Status")
    
    health = api_get("/health")
    if health:
        health_col1, health_col2, health_col3, health_col4 = st.columns(4)
        
        with health_col1:
            status = health.get("status", "unknown")
            if status == "healthy":
                status_emoji = "✅"
                status_color = "green"
            else:
                status_emoji = "⚠️"
                status_color = "orange"
            st.metric(
                "Status", 
                f"{status_emoji} {status.capitalize()}",
                help="Gesamt-Status des Services (healthy = alles OK, degraded = Probleme)"
            )
        
        with health_col2:
            db_connected = health.get("db_connected", False)
            db_status = "✅ Verbunden" if db_connected else "❌ Getrennt"
            st.metric(
                "Datenbank", 
                db_status,
                help="Verbindungsstatus zur PostgreSQL-Datenbank"
            )
        
        with health_col3:
            uptime = health.get("uptime_seconds", 0)
            if uptime:
                uptime_hours = uptime / 3600
                uptime_days = uptime_hours / 24
                if uptime_days >= 1:
                    uptime_str = f"{uptime_days:.1f} Tage"
                else:
                    uptime_str = f"{uptime_hours:.1f} Stunden"
            else:
                uptime_str = "N/A"
            st.metric(
                "⏱️ Uptime", 
                uptime_str,
                help="Zeit seit dem letzten Start des Services"
            )
        
        with health_col4:
            health_active_models = health.get("active_models", 0)
            st.metric(
                "🤖 Aktive Modelle", 
                health_active_models,
                help="Anzahl der aktiven Modelle (aus Health Check)"
            )
        
        # Zusätzliche Health-Details
        health_details_col1, health_details_col2 = st.columns(2)
        
        with health_details_col1:
            health_predictions = health.get("predictions_last_hour", 0)
            st.metric(
                "📊 Predictions (1h)", 
                f"{health_predictions:,}".replace(",", "."),
                help="Anzahl der Vorhersagen in der letzten Stunde (aus Health Check)"
            )
        
        with health_details_col2:
            # Versions-Info (falls verfügbar)
            version = health.get("version", "N/A")
            st.metric(
                "📦 Version", 
                version,
                help="Service-Version"
            )
    
    else:
        st.warning("⚠️ Konnte Health-Status nicht laden")
    
    st.divider()
    
    # ============================================================
    # Performance-Metriken (falls verfügbar)
    # ============================================================
    st.subheader("⚡ Performance-Metriken")
    
    perf_col1, perf_col2, perf_col3, perf_col4 = st.columns(4)
    
    with perf_col1:
        if avg_time:
            if avg_time < 50:
                perf_status = "🟢 Sehr schnell"
            elif avg_time < 100:
                perf_status = "🟡 Schnell"
            elif avg_time < 200:
                perf_status = "🟠 Normal"
            else:
                perf_status = "🔴 Langsam"
            st.metric(
                "⏱️ Ø Vorhersage-Dauer", 
                f"{avg_time:.1f} ms",
                delta=perf_status,
                help="Durchschnittliche Zeit pro Vorhersage"
            )
        else:
            st.metric("⏱️ Ø Vorhersage-Dauer", "N/A")
    
    with perf_col2:
        # Berechne Durchsatz (Predictions pro Sekunde)
        if last_hour > 0:
            throughput = last_hour / 3600
            st.metric(
                "📈 Durchsatz", 
                f"{throughput:.2f}/s",
                help="Durchschnittliche Vorhersagen pro Sekunde (letzte Stunde)"
            )
        else:
            st.metric("📈 Durchsatz", "0.00/s")
    
    with perf_col3:
        # Berechne Effizienz (Predictions pro Modell)
        if active_models > 0 and total_preds > 0:
            per_model = total_preds / active_models
            st.metric(
                "🎯 Pro Modell", 
                f"{per_model:,.0f}".replace(",", "."),
                help="Durchschnittliche Vorhersagen pro Modell"
            )
        else:
            st.metric("🎯 Pro Modell", "N/A")
    
    with perf_col4:
        # Berechne Coin-Abdeckung (Predictions pro Coin)
        if coins_tracked > 0 and total_preds > 0:
            per_coin = total_preds / coins_tracked
            st.metric(
                "🪙 Pro Coin", 
                f"{per_coin:.1f}",
                help="Durchschnittliche Vorhersagen pro Coin"
            )
        else:
            st.metric("🪙 Pro Coin", "N/A")
    
    st.divider()
    
    # ============================================================
    # Zusammenfassung & Quick Stats
    # ============================================================
    st.subheader("📋 Zusammenfassung")
    
    summary_col1, summary_col2 = st.columns(2)
    
    with summary_col1:
        st.markdown("**🎯 Top Metriken:**")
        summary_data = {
            "Metrik": [
                "Gesamt Predictions",
                "Aktive Modelle",
                "Coins getrackt",
                "Letzte Stunde",
                "Ø Dauer"
            ],
            "Wert": [
                f"{total_preds:,}".replace(",", "."),
                str(active_models),
                str(coins_tracked),
                f"{last_hour:,}".replace(",", "."),
                f"{avg_time:.1f} ms" if avg_time else "N/A"
            ]
        }
        summary_df = pd.DataFrame(summary_data)
        st.dataframe(summary_df, use_container_width=True, hide_index=True)
    
    with summary_col2:
        st.markdown("**📊 Aktivitäts-Übersicht:**")
        if total_preds > 0:
            # Erstelle einfaches Aktivitäts-Diagramm
            activity_data = {
                "Zeitraum": ["Letzte Stunde", "Letzte 24h", "Letzte 7 Tage"],
                "Predictions": [
                    last_hour,
                    last_24h if last_24h else 0,
                    last_7d if last_7d else 0
                ]
            }
            activity_df = pd.DataFrame(activity_data)
            st.bar_chart(activity_df.set_index("Zeitraum"), use_container_width=True)
        else:
            st.info("ℹ️ Noch keine Aktivitätsdaten verfügbar")
    
    # ============================================================
    # Vollständige Statistiken (erweiterbar)
    # ============================================================
    with st.expander("📋 Vollständige Statistiken (JSON)", expanded=False):
        st.json(stats)
        if health:
            st.json(health)
        col1, col2, col3 = st.columns(3)
        
        with col1:
            status = health.get("status", "unknown")
            status_emoji = "✅" if status == "healthy" else "⚠️"
            st.metric("Status", f"{status_emoji} {status}", help="Gesamt-Status des Services (healthy = alles OK, degraded = Probleme)")
        
        with col2:
            db_connected = health.get("db_connected", False)
            db_status = "✅ Verbunden" if db_connected else "❌ Getrennt"
            st.metric("Datenbank", db_status, help="Verbindungsstatus zur PostgreSQL-Datenbank")
        
        with col3:
            uptime = health.get("uptime_seconds", 0)
            uptime_hours = uptime / 3600
            st.metric("Uptime", f"{uptime_hours:.2f} Stunden", help="Zeit seit dem letzten Start des Services")
        
        # Zusätzliche Health-Infos
        col4, col5 = st.columns(2)
        with col4:
            active_models = health.get("active_models", 0)
            st.metric("Aktive Modelle", active_models, help="Anzahl der aktiven Modelle")
        with col5:
            predictions_last_hour = health.get("predictions_last_hour", 0)
            st.metric("Predictions (1h)", predictions_last_hour, help="Anzahl der Vorhersagen in der letzten Stunde")

def page_metrics():
    """Prometheus Metrics - Übersichtliche Darstellung"""
    st.title("📈 Prometheus Metrics")
    
    # Info-Box
    with st.expander("📖 Anleitung & Erklärungen", expanded=False):
        st.markdown("""
        **Diese Seite zeigt alle Prometheus-Metriken des Prediction Service:**
        
        - **Prediction Metrics:** Anzahl Vorhersagen, Alerts, Fehler
        - **Model Metrics:** Aktive Modelle, geladene Modelle, getrackte Coins
        - **Performance Metrics:** Dauer von Vorhersagen, Feature-Processing, Modell-Laden
        - **Service Metrics:** Uptime, Datenbank-Status
        
        **Verwendung:**
        - Metriken können von Prometheus/Grafana abgerufen werden
        - Endpoint: `/api/metrics` (Prometheus-Format)
        - Diese Seite zeigt eine benutzerfreundliche Visualisierung
        """)
    
    # Lade Metrics (als Text)
    try:
        with st.spinner("📥 Lade Metrics..."):
            response = requests.get(f"{API_BASE_URL}/metrics", timeout=10)
        
        if response.status_code != 200:
            st.warning(f"⚠️ Konnte Metrics nicht laden (Status: {response.status_code})")
            return
        
        metrics_text = response.text
        
        # Parse Prometheus Metrics (verbessert)
        metrics_dict = {}
        
        for line in metrics_text.split('\n'):
            line = line.strip()
            # Überspringe Kommentare und leere Zeilen
            if not line or line.startswith('#'):
                continue
            
            # Parse Metric-Zeile
            # Format: metric_name{label1="value1",label2="value2"} value
            # oder: metric_name value
            
            try:
                if '{' in line and '}' in line:
                    # Mit Labels
                    metric_part = line.split('{', 1)[0].strip()
                    labels_part = line.split('{', 1)[1].split('}', 1)[0]
                    value_part = line.split('}', 1)[1].strip()
                    
                    # Parse Labels
                    labels = {}
                    if labels_part:
                        for label_pair in labels_part.split(','):
                            if '=' in label_pair:
                                key, val = label_pair.split('=', 1)
                                labels[key.strip()] = val.strip().strip('"').strip("'")
                    
                    # Parse Value
                    try:
                        value = float(value_part)
                        if metric_part not in metrics_dict:
                            metrics_dict[metric_part] = []
                        metrics_dict[metric_part].append({
                            'labels': labels,
                            'value': value
                        })
                    except ValueError:
                        pass
                else:
                    # Ohne Labels
                    parts = line.split(' ', 1)
                    if len(parts) == 2:
                        metric_name = parts[0].strip()
                        try:
                            value = float(parts[1].strip())
                            if metric_name not in metrics_dict:
                                metrics_dict[metric_name] = []
                            metrics_dict[metric_name].append({
                                'labels': {},
                                'value': value
                            })
                        except ValueError:
                            pass
            except Exception:
                continue
        
        if not metrics_dict:
            st.warning("⚠️ Keine Metriken gefunden")
            with st.expander("📋 Raw Metrics anzeigen"):
                st.code(metrics_text, language="text")
            return
        
        # ============================================================
        # Prediction Metrics
        # ============================================================
        st.subheader("🎯 Prediction Metrics")
        
        pred_col1, pred_col2, pred_col3, pred_col4 = st.columns(4)
        
        # Gesamt Predictions
        total_preds = 0
        if 'ml_predictions_total' in metrics_dict:
            total_preds = sum(item['value'] for item in metrics_dict['ml_predictions_total'])
        
        with pred_col1:
            st.metric(
                "📊 Gesamt Predictions",
                f"{int(total_preds):,}".replace(",", "."),
                help="Gesamtanzahl aller Vorhersagen (Counter)"
            )
        
        # Alerts
        total_alerts = 0
        if 'ml_alerts_triggered_total' in metrics_dict:
            total_alerts = sum(item['value'] for item in metrics_dict['ml_alerts_triggered_total'])
        
        with pred_col2:
            st.metric(
                "🚨 Gesamt Alerts",
                f"{int(total_alerts):,}".replace(",", "."),
                help="Gesamtanzahl aller ausgelösten Alerts"
            )
        
        # Errors
        total_errors = 0
        if 'ml_errors_total' in metrics_dict:
            total_errors = sum(item['value'] for item in metrics_dict['ml_errors_total'])
        
        with pred_col3:
            st.metric(
                "❌ Gesamt Fehler",
                f"{int(total_errors):,}".replace(",", "."),
                help="Gesamtanzahl aller Fehler (nach Typ)"
            )
        
        # Predictions by Model
        with pred_col4:
            if 'ml_predictions_by_model_total' in metrics_dict:
                model_preds = metrics_dict['ml_predictions_by_model_total']
                model_count = len(set(
                    item['labels'].get('model_id', 'unknown') 
                    for item in model_preds
                ))
                st.metric(
                    "🤖 Modelle mit Predictions",
                    model_count,
                    help="Anzahl verschiedener Modelle mit Vorhersagen"
                )
            else:
                st.metric("🤖 Modelle mit Predictions", "0")
        
        # Predictions by Model (Details)
        if 'ml_predictions_by_model_total' in metrics_dict:
            model_preds = metrics_dict['ml_predictions_by_model_total']
            if len(model_preds) > 0:
                st.markdown("**📊 Predictions pro Modell:**")
                model_data = []
                for item in model_preds:
                    labels = item.get('labels', {})
                    model_id = labels.get('model_id', 'N/A')
                    model_name = labels.get('model_name', 'N/A')
                    value = item.get('value', 0)
                    model_data.append({
                        'Modell-ID': model_id,
                        'Modell-Name': model_name,
                        'Predictions': int(value)
                    })
                
                if model_data:
                    model_df = pd.DataFrame(model_data)
                    model_df = model_df.sort_values('Predictions', ascending=False)
                    st.dataframe(model_df, use_container_width=True, hide_index=True)
        
        st.divider()
        
        # ============================================================
        # Model Metrics
        # ============================================================
        st.subheader("🤖 Model Metrics")
        
        model_col1, model_col2, model_col3 = st.columns(3)
        
        # Aktive Modelle
        active_models = 0
        if 'ml_active_models' in metrics_dict:
            items = metrics_dict['ml_active_models']
            if len(items) > 0:
                active_models = items[0].get('value', 0)
        
        with model_col1:
            st.metric(
                "🟢 Aktive Modelle",
                int(active_models),
                help="Anzahl der aktuell aktiven Modelle (Gauge)"
            )
        
        # Geladene Modelle
        models_loaded = 0
        if 'ml_models_loaded' in metrics_dict:
            items = metrics_dict['ml_models_loaded']
            if len(items) > 0:
                models_loaded = items[0].get('value', 0)
        
        with model_col2:
            st.metric(
                "💾 Geladene Modelle",
                int(models_loaded),
                help="Anzahl der Modelle im Cache (Gauge)"
            )
        
        # Getrackte Coins
        coins_tracked = 0
        if 'ml_coins_tracked' in metrics_dict:
            items = metrics_dict['ml_coins_tracked']
            if len(items) > 0:
                coins_tracked = items[0].get('value', 0)
        
        with model_col3:
            st.metric(
                "🪙 Getrackte Coins",
                int(coins_tracked),
                help="Anzahl der getrackten Coins (Gauge)"
            )
        
        st.divider()
        
        # ============================================================
        # Performance Metrics
        # ============================================================
        st.subheader("⚡ Performance Metrics")
        
        perf_col1, perf_col2, perf_col3 = st.columns(3)
        
        # Prediction Duration (Histogram)
        with perf_col1:
            st.markdown("**⏱️ Vorhersage-Dauer**")
            if 'ml_prediction_duration_seconds' in metrics_dict:
                pred_durations = metrics_dict['ml_prediction_duration_seconds']
                # Histogram hat _sum, _count, _bucket
                sum_value = next((item['value'] for item in pred_durations if item['labels'].get('le') is None and '_sum' in str(item)), None)
                count_value = next((item['value'] for item in pred_durations if item['labels'].get('le') is None and '_count' in str(item)), None)
                
                if sum_value is not None and count_value and count_value > 0:
                    avg_duration = sum_value / count_value
                    st.metric("Durchschnitt", f"{avg_duration*1000:.2f} ms", help="Durchschnittliche Vorhersage-Dauer")
                else:
                    # Fallback: Summe aller Werte
                    total_sum = sum(item['value'] for item in pred_durations if '_sum' in str(item))
                    total_count = sum(item['value'] for item in pred_durations if '_count' in str(item))
                    if total_count > 0:
                        avg_duration = total_sum / total_count
                        st.metric("Durchschnitt", f"{avg_duration*1000:.2f} ms")
                    else:
                        st.info("Noch keine Daten")
            else:
                st.info("Noch keine Daten")
        
        # Feature Processing Duration
        with perf_col2:
            st.markdown("**🔧 Feature-Processing**")
            if 'ml_feature_processing_duration_seconds' in metrics_dict:
                feature_durations = metrics_dict['ml_feature_processing_duration_seconds']
                total_sum = sum(item['value'] for item in feature_durations if '_sum' in str(item))
                total_count = sum(item['value'] for item in feature_durations if '_count' in str(item))
                if total_count > 0:
                    avg_duration = total_sum / total_count
                    st.metric("Durchschnitt", f"{avg_duration*1000:.2f} ms", help="Durchschnittliche Feature-Processing-Dauer")
                else:
                    st.info("Noch keine Daten")
            else:
                st.info("Noch keine Daten")
        
        # Model Load Duration
        with perf_col3:
            st.markdown("**📦 Modell-Laden**")
            if 'ml_model_load_duration_seconds' in metrics_dict:
                load_durations = metrics_dict['ml_model_load_duration_seconds']
                total_sum = sum(item['value'] for item in load_durations if '_sum' in str(item))
                total_count = sum(item['value'] for item in load_durations if '_count' in str(item))
                if total_count > 0:
                    avg_duration = total_sum / total_count
                    st.metric("Durchschnitt", f"{avg_duration*1000:.2f} ms", help="Durchschnittliche Modell-Lade-Dauer")
                else:
                    st.info("Noch keine Daten")
            else:
                st.info("Noch keine Daten")
        
        st.divider()
        
        # ============================================================
        # Service Metrics
        # ============================================================
        st.subheader("🏥 Service Metrics")
        
        service_col1, service_col2, service_col3 = st.columns(3)
        
        # Uptime
        uptime_seconds = 0
        if 'ml_service_uptime_seconds' in metrics_dict:
            items = metrics_dict['ml_service_uptime_seconds']
            if len(items) > 0:
                uptime_seconds = items[0].get('value', 0)
        
        with service_col1:
            if uptime_seconds > 0:
                uptime_hours = uptime_seconds / 3600
                uptime_days = uptime_hours / 24
                if uptime_days >= 1:
                    uptime_str = f"{uptime_days:.1f} Tage"
                else:
                    uptime_str = f"{uptime_hours:.1f} Stunden"
                st.metric(
                    "⏱️ Uptime",
                    uptime_str,
                    help="Service-Uptime in Sekunden (Gauge)"
                )
            else:
                st.metric("⏱️ Uptime", "N/A")
        
        # DB Status
        db_connected = 0
        if 'ml_db_connected' in metrics_dict:
            items = metrics_dict['ml_db_connected']
            if len(items) > 0:
                db_connected = items[0].get('value', 0)
        
        with service_col2:
            db_status = "✅ Verbunden" if db_connected == 1 else "❌ Getrennt"
            st.metric(
                "💾 Datenbank",
                db_status,
                help="Datenbank-Verbindungsstatus (1=verbunden, 0=getrennt)"
            )
        
        # Error Types
        with service_col3:
            st.markdown("**❌ Fehler nach Typ:**")
            if 'ml_errors_total' in metrics_dict:
                errors = metrics_dict['ml_errors_total']
                if len(errors) > 0:
                    error_data = {}
                    for item in errors:
                        error_type = item.get('labels', {}).get('type', 'unknown')
                        error_value = item.get('value', 0)
                        error_data[error_type] = int(error_value)
                    
                    if error_data:
                        error_df = pd.DataFrame({
                            'Typ': list(error_data.keys()),
                            'Anzahl': list(error_data.values())
                        })
                        st.dataframe(error_df, use_container_width=True, hide_index=True)
                    else:
                        st.info("Keine Fehler")
                else:
                    st.info("Keine Fehler")
            else:
                st.info("Keine Fehler")
        
        st.divider()
        
        # ============================================================
        # Raw Metrics (erweiterbar)
        # ============================================================
        with st.expander("📋 Raw Metrics (Prometheus-Format)", expanded=False):
            st.code(metrics_text, language="text")
            st.download_button(
                "💾 Metrics herunterladen",
                metrics_text,
                file_name=f"metrics_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt",
                mime="text/plain"
            )
        
    except requests.exceptions.RequestException as e:
        st.error(f"❌ Verbindungsfehler: {e}")
        st.info("💡 Tipp: Stelle sicher, dass der Service läuft und erreichbar ist")
    except Exception as e:
        st.error(f"❌ Fehler beim Laden der Metrics: {e}")
        st.info("💡 Tipp: Metrics können auch direkt mit `curl http://localhost:8000/api/metrics` abgerufen werden")

def page_logs():
    """Logs anzeigen"""
    st.title("📜 Logs")
    
    # Info-Box
    st.info("""
    **📖 Anleitung:** 
    Diese Seite zeigt die Live-Logs vom Docker Container des ML Prediction Service.
    Die Logs werden automatisch aktualisiert, wenn du die Seite neu lädst.
    """)
    
    # Log-Optionen
    col1, col2 = st.columns(2)
    
    with col1:
        log_lines = st.number_input("Anzahl Zeilen", min_value=10, max_value=1000, value=100, step=10, key="log_lines_input", help="Anzahl der letzten Log-Zeilen, die angezeigt werden sollen")
    
    with col2:
        auto_refresh = st.checkbox("🔄 Auto-Refresh (alle 5 Sekunden)", value=False, key="auto_refresh_checkbox", help="Automatische Aktualisierung der Logs")
    
    # Refresh-Button
    refresh_button = st.button("🔄 Logs aktualisieren", use_container_width=True, key="refresh_logs_button")
    
    # Auto-Refresh Logic
    if auto_refresh:
        import time
        time.sleep(5)
        st.rerun()
    
    # Logs anzeigen (via API) - IMMER laden (auch bei Button-Click)
    try:
        with st.spinner("📥 Lade Logs..."):
            response = requests.get(f"{API_BASE_URL}/logs", params={"tail": log_lines}, timeout=10)
        
        if response.status_code == 200:
            logs = response.text
            if logs and logs.strip():
                # Zeige Logs in einem Scroll-Container
                st.code(logs, language="text")
                
                # Zeige Info über Anzahl Zeilen
                log_count = len(logs.split('\n'))
                st.caption(f"📊 {log_count} Log-Zeilen angezeigt (letzte {log_lines} Zeilen)")
            else:
                st.info("ℹ️ Keine Logs verfügbar")
        else:
            st.warning(f"⚠️ Konnte Logs nicht laden (Status: {response.status_code})")
            if response.text:
                st.code(response.text, language="text")
    except requests.exceptions.RequestException as e:
        st.error(f"❌ Verbindungsfehler: {e}")
        st.info("💡 Tipp: Stelle sicher, dass der Service läuft und erreichbar ist")
    except Exception as e:
        st.error(f"❌ Fehler beim Laden der Logs: {e}")
        st.info("💡 Tipp: Logs können auch direkt mit `docker logs ml-prediction-service` angezeigt werden")

def page_details():
    """Modell-Details"""
    model_id = st.session_state.get("details_model_id")
    if not model_id:
        st.warning("⚠️ Kein Modell ausgewählt")
        return
    
    # Lade Modell-Details
    data = api_get("/models/active")
    if not data:
        st.warning("⚠️ Konnte Modell-Details nicht laden")
        return
    
    models = data.get("models", [])
    model = next((m for m in models if m.get("id") == model_id), None)
    
    if not model:
        st.error("❌ Modell nicht gefunden")
        return
    
    model_name = model.get('custom_name') or model.get('name', f"ID: {model_id}")
    st.title(f"📋 Modell-Details: {model_name}")
    
    # Info-Box am Anfang
    st.info("""
    **📖 Anleitung:** 
    Diese Seite zeigt alle Details und Statistiken des Modells. Nutze die ℹ️-Icons für Erklärungen zu jedem Wert.
    """)
    
    # Basis-Informationen
    st.subheader("📝 Basis-Informationen")
    info_col1, info_col2, info_col3, info_col4 = st.columns(4)
    with info_col1:
        st.markdown("**Modell-ID**")
        st.write(f"#{model_id}")
    with info_col2:
        st.markdown("**Model-ID (Training)**")
        st.write(f"#{model.get('model_id', 'N/A')}")
    with info_col3:
        st.markdown("**Modell-Typ**")
        model_type = model.get('model_type', 'N/A')
        type_emoji = "🌲" if model_type == "random_forest" else "🚀" if model_type == "xgboost" else "🤖"
        st.write(f"{type_emoji} {model_type}")
    with info_col4:
        st.markdown("**Status**")
        is_active = model.get('is_active', False)
        if is_active:
            st.success("🟢 Aktiv")
        else:
            st.error("🔴 Inaktiv")
    
    st.divider()
    
    # Target-Konfiguration
    st.subheader("🎯 Target-Konfiguration")
    st.markdown("""
    **Was ist die Target-Konfiguration?**
    
    Die Target-Konfiguration definiert, was das Modell vorhersagen soll:
    - **Zeitbasiert:** Steigt/Fällt die Variable in X Minuten um X%?
    - **Klassisch:** Erfüllt die Variable eine bestimmte Bedingung (z.B. price_close > 50000)?
    """)
    
    config_col1, config_col2 = st.columns(2)
    
    with config_col1:
        if model.get("future_minutes"):
            st.markdown("**Typ:** ⏰ Zeitbasierte Vorhersage")
            st.write(f"**Variable:** {model.get('target_variable', 'N/A')}")
            st.write(f"**Zeitraum:** {model.get('future_minutes')} Minuten")
            st.write(f"**Min. Änderung:** {model.get('price_change_percent', 0)}%")
            direction = model.get('target_direction', 'N/A')
            direction_text = "📈 Steigt" if direction == "up" else "📉 Fällt" if direction == "down" else "N/A"
            st.write(f"**Richtung:** {direction_text}")
            st.write(f"**Ziel:** {model.get('target_variable', 'N/A')} {direction_text.lower()} in {model.get('future_minutes')} Minuten um mindestens {model.get('price_change_percent', 0)}%")
        else:
            st.markdown("**Typ:** 🎯 Klassische Vorhersage")
            st.write(f"**Variable:** {model.get('target_variable', 'N/A')}")
            st.write(f"**Operator:** {model.get('target_operator', 'N/A')}")
            st.write(f"**Wert:** {model.get('target_value', 'N/A')}")
            if model.get('target_operator') and model.get('target_value') is not None:
                st.write(f"**Bedingung:** {model.get('target_variable', 'N/A')} {model.get('target_operator')} {model.get('target_value')}")
    
    with config_col2:
        st.markdown("**Features:**")
        features = model.get("features", [])
        st.write(f"**Anzahl:** {len(features)}")
        if features:
            with st.expander("Alle Features anzeigen"):
                for feature in features:
                    st.write(f"- {feature}")
        
        st.markdown("**Phasen:**")
        phases = model.get("phases", [])
        if phases:
            st.write(f"**Phasen:** {phases}")
        else:
            st.write("**Alle Phasen**")
    
    st.divider()
    
    # Statistiken
    st.subheader("📈 Statistiken")
    st.markdown("""
    **Was bedeuten diese Statistiken?**
    
    - **Gesamt Predictions:** Anzahl aller Vorhersagen, die mit diesem Modell gemacht wurden
    - **Letzte Vorhersage:** Zeitpunkt der letzten Vorhersage
    - **Importiert:** Zeitpunkt, wann das Modell importiert wurde
    """)
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.metric("Gesamt Predictions", model.get("total_predictions", 0), help="Anzahl aller Vorhersagen mit diesem Modell")
    
    with col2:
        last_pred = model.get("last_prediction_at")
        if last_pred:
            try:
                if isinstance(last_pred, str):
                    last_pred_dt = datetime.fromisoformat(last_pred.replace('Z', '+00:00'))
                else:
                    last_pred_dt = last_pred
                last_pred_str = last_pred_dt.strftime("%d.%m.%Y %H:%M")
                st.metric("Letzte Vorhersage", last_pred_str, help="Zeitpunkt der letzten Vorhersage")
            except:
                st.metric("Letzte Vorhersage", str(last_pred)[:19] if len(str(last_pred)) > 19 else str(last_pred))
        else:
            st.metric("Letzte Vorhersage", "Nie", help="Noch keine Vorhersage gemacht")
    
    with col3:
        downloaded = model.get("downloaded_at")
        if downloaded:
            try:
                if isinstance(downloaded, str):
                    downloaded_dt = datetime.fromisoformat(downloaded.replace('Z', '+00:00'))
                else:
                    downloaded_dt = downloaded
                downloaded_str = downloaded_dt.strftime("%d.%m.%Y %H:%M")
                st.metric("Importiert", downloaded_str, help="Zeitpunkt, wann das Modell importiert wurde")
            except:
                st.metric("Importiert", str(downloaded)[:19] if len(str(downloaded)) > 19 else str(downloaded))
        else:
            st.metric("Importiert", "N/A")
    
    st.divider()
    
    # Detaillierte Auswertung
    st.subheader("📊 Detaillierte Auswertung")
    
    # Lade Statistiken
    stats = api_get(f"/models/{model_id}/statistics")
    
    if stats and stats.get("total_predictions", 0) > 0:
        # Vorhersagen-Übersicht
        st.markdown("**🎯 Vorhersagen-Statistiken**")
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            st.metric("Gesamt", stats.get("total_predictions", 0), help="Gesamtanzahl aller Vorhersagen")
        with col2:
            positive = stats.get("positive_predictions", 0)
            total = stats.get("total_predictions", 1)
            positive_pct = (positive / total * 100) if total > 0 else 0
            st.metric("✅ Positiv", f"{positive} ({positive_pct:.1f}%)", help="Anzahl positiver Vorhersagen (prediction = 1)")
        with col3:
            negative = stats.get("negative_predictions", 0)
            negative_pct = (negative / total * 100) if total > 0 else 0
            st.metric("❌ Negativ", f"{negative} ({negative_pct:.1f}%)", help="Anzahl negativer Vorhersagen (prediction = 0)")
        with col4:
            st.metric("🪙 Coins", stats.get("unique_coins", 0), help="Anzahl verschiedener Coins")
        
        # Wahrscheinlichkeits-Statistiken
        st.markdown("**📈 Wahrscheinlichkeits-Statistiken**")
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            avg_prob = stats.get("avg_probability")
            if avg_prob is not None:
                st.metric("Durchschnitt", f"{avg_prob:.2%}", help="Durchschnittliche Wahrscheinlichkeit aller Vorhersagen")
            else:
                st.metric("Durchschnitt", "N/A")
        with col2:
            avg_prob_pos = stats.get("avg_probability_positive")
            if avg_prob_pos is not None:
                st.metric("Durchschnitt (Positiv)", f"{avg_prob_pos:.2%}", help="Durchschnittliche Wahrscheinlichkeit bei positiven Vorhersagen")
            else:
                st.metric("Durchschnitt (Positiv)", "N/A")
        with col3:
            min_prob = stats.get("min_probability")
            max_prob = stats.get("max_probability")
            if min_prob is not None and max_prob is not None:
                st.metric("Min / Max", f"{min_prob:.2%} / {max_prob:.2%}", help="Minimale und maximale Wahrscheinlichkeit")
            else:
                st.metric("Min / Max", "N/A")
        with col4:
            avg_duration = stats.get("avg_duration_ms")
            if avg_duration is not None:
                st.metric("⏱️ Dauer", f"{avg_duration:.1f} ms", help="Durchschnittliche Vorhersage-Dauer")
            else:
                st.metric("⏱️ Dauer", "N/A")
        
        # Alerts
        st.markdown("**🚨 Alerts**")
        col1, col2 = st.columns(2)
        
        with col1:
            alerts_count = stats.get("alerts_count", 0)
            alert_threshold = stats.get("alert_threshold", 0.7)
            st.metric("Alerts gesendet", alerts_count, help=f"Anzahl Alerts (positive Vorhersagen mit Wahrscheinlichkeit >= {alert_threshold:.0%})")
        with col2:
            if total > 0:
                alert_rate = (alerts_count / total * 100) if total > 0 else 0
                st.metric("Alert-Rate", f"{alert_rate:.2f}%", help="Prozentualer Anteil der Alerts an allen Vorhersagen")
        
        # Webhook-Statistiken
        webhook_total = stats.get("webhook_total", 0)
        if webhook_total > 0:
            st.markdown("**📤 Webhook-Statistiken**")
            col1, col2, col3 = st.columns(3)
            
            with col1:
                webhook_success = stats.get("webhook_success", 0)
                webhook_failed = stats.get("webhook_failed", 0)
                st.metric("Erfolgreich", f"{webhook_success} / {webhook_total}", help="Anzahl erfolgreicher Webhook-Aufrufe")
            with col2:
                webhook_success_rate = stats.get("webhook_success_rate")
                if webhook_success_rate is not None:
                    st.metric("Erfolgsrate", f"{webhook_success_rate:.1f}%", help="Prozentuale Erfolgsrate der Webhook-Aufrufe")
                else:
                    st.metric("Erfolgsrate", "N/A")
            with col3:
                st.metric("Fehlgeschlagen", webhook_failed, help="Anzahl fehlgeschlagener Webhook-Aufrufe")
        
        # Zeitraum
        st.markdown("**⏰ Zeitraum**")
        col1, col2 = st.columns(2)
        
        with col1:
            first_pred = stats.get("first_prediction")
            if first_pred:
                try:
                    if isinstance(first_pred, str):
                        first_dt = datetime.fromisoformat(first_pred.replace('Z', '+00:00'))
                    else:
                        first_dt = first_pred
                    first_str = first_dt.strftime("%d.%m.%Y %H:%M:%S")
                    st.metric("Erste Vorhersage", first_str, help="Zeitpunkt der ersten Vorhersage")
                except:
                    st.metric("Erste Vorhersage", str(first_pred)[:19])
            else:
                st.metric("Erste Vorhersage", "N/A")
        
        with col2:
            last_pred = stats.get("last_prediction")
            if last_pred:
                try:
                    if isinstance(last_pred, str):
                        last_dt = datetime.fromisoformat(last_pred.replace('Z', '+00:00'))
                    else:
                        last_dt = last_pred
                    last_str = last_dt.strftime("%d.%m.%Y %H:%M:%S")
                    st.metric("Letzte Vorhersage", last_str, help="Zeitpunkt der letzten Vorhersage")
                except:
                    st.metric("Letzte Vorhersage", str(last_pred)[:19])
            else:
                st.metric("Letzte Vorhersage", "N/A")
        
        # Wahrscheinlichkeits-Verteilung (Histogramm)
        prob_dist = stats.get("probability_distribution", {})
        if prob_dist:
            st.markdown("**📊 Wahrscheinlichkeits-Verteilung**")
            st.caption("Verteilung der Vorhersage-Wahrscheinlichkeiten in verschiedenen Bereichen")
            
            # Erstelle DataFrame für Histogramm
            import pandas as pd
            dist_df = pd.DataFrame([
                {"Bereich": k, "Anzahl": v}
                for k, v in sorted(prob_dist.items())
            ])
            
            if not dist_df.empty:
                st.bar_chart(dist_df.set_index("Bereich"))
    
    else:
        st.info("ℹ️ Noch keine Vorhersagen für dieses Modell vorhanden. Statistiken werden angezeigt, sobald das Modell Vorhersagen gemacht hat.")
    
    st.divider()
    
    # Vollständige Details
    with st.expander("📋 Vollständige Details (JSON)", expanded=False):
        st.json(model)
    
    # Zurück-Button
    col1, col2 = st.columns([1, 3])
    with col1:
        if st.button("← Zurück zur Übersicht", use_container_width=True):
            st.session_state.pop("details_model_id", None)
            st.session_state["page"] = "overview"
            st.rerun()

# ============================================================
# Main App
# ============================================================

def main():
    """Hauptfunktion"""
    # Sidebar Navigation
    st.sidebar.title("🔮 ML Prediction Service")
    
    # Seiten-Auswahl
    pages = {
        "🏠 Übersicht": "overview",
        "📥 Modell importieren": "import",
        "🔮 Vorhersage": "predict",
        "📋 Vorhersagen": "predictions",
        "📊 Statistiken": "stats",
        "📈 Metrics": "metrics",
        "📜 Logs": "logs"
    }
    
    # Initialisiere Session State
    if 'page' not in st.session_state:
        st.session_state['page'] = 'overview'
    
    # Bestimme aktuelle page
    current_page_value = st.session_state.get('page', 'overview')
    
    # Wenn page nicht in Sidebar ist (z.B. 'details'), zeige entsprechende Seite in Sidebar
    sidebar_page_value = current_page_value
    if current_page_value == 'details':
        sidebar_page_value = 'overview'
    elif current_page_value not in pages.values():
        sidebar_page_value = 'overview'
    
    # Navigation mit Buttons (wie Training Service)
    st.sidebar.markdown("**Navigation**")
    for page_key, page_value in pages.items():
        is_active = (page_value == sidebar_page_value)
        button_type = "primary" if is_active else "secondary"
        
        if st.sidebar.button(page_key, key=f"nav_{page_value}", use_container_width=True, type=button_type):
            if page_value != current_page_value:
                st.session_state['page'] = page_value
                st.rerun()
    
    # Details-Seite Indikator (wenn aktiv)
    if current_page_value == 'details':
        model_id = st.session_state.get('details_model_id')
        if model_id:
            st.sidebar.markdown("---")
            st.sidebar.markdown("**📋 Modell-Details**")
            st.sidebar.caption(f"Modell ID: {model_id}")
            if st.sidebar.button("← Zurück zur Übersicht", key="back_to_overview", use_container_width=True):
                st.session_state['page'] = 'overview'
                st.session_state.pop('details_model_id', None)
                st.rerun()
    
    # Health Check
    health = api_get("/health")
    if health:
        status_emoji = "✅" if health.get('status') == 'healthy' else "⚠️"
        st.sidebar.markdown(f"**Status:** {status_emoji} {health.get('status', 'unknown')}")
        st.sidebar.markdown(f"**DB:** {'✅' if health.get('db_connected') else '❌'}")
        st.sidebar.markdown(f"**Aktive Modelle:** {health.get('active_models', 0)}")
    
    # Seiten rendern
    if st.session_state['page'] == 'overview':
        page_overview()
    elif st.session_state['page'] == 'import':
        page_import()
    elif st.session_state['page'] == 'predict':
        page_predict()
    elif st.session_state['page'] == 'predictions':
        page_predictions()
    elif st.session_state['page'] == 'stats':
        page_stats()
    elif st.session_state['page'] == 'metrics':
        page_metrics()
    elif st.session_state['page'] == 'logs':
        page_logs()
    elif st.session_state['page'] == 'details':
        page_details()
    else:
        page_overview()

if __name__ == "__main__":
    main()

