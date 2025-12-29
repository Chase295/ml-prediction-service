"""
Overview Page Module
Extrahierte Seite aus streamlit_app.py
"""
import streamlit as st
import pandas as pd
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional

# Import aus streamlit_utils
from streamlit_utils import (
    api_get, api_post, api_delete, api_patch,
    get_models, get_model_details,
    delete_model, update_model,
    format_datetime,
    AVAILABLE_FEATURES, FEATURE_CATEGORIES, CRITICAL_FEATURES
)

# Caching für bessere Performance
@st.cache_data(ttl=30)  # Cache für 30 Sekunden
def get_models_cached():
    """Cached version of get_models"""
    return get_models()

@st.cache_data(ttl=10)  # Cache für 10 Sekunden
def get_active_models_cached():
    """Cached version of active models API call"""
    return api_get("/models")

# Hilfsfunktion für kompakte Vorhersagen
def make_quick_prediction(model_id, model_name, features):
    """Kompakte Vorhersage-Form für Modell-Karten"""
    expander_key = f"predict_expander_{model_id}"

    with st.expander("🔮 Schnellvorhersage", expanded=False):
        st.caption(f"Modell: {model_name}")

        # Kompakte Feature-Eingabe (nur kritische Features)
        quick_features = CRITICAL_FEATURES[:6]  # Nur die wichtigsten 6 Features

        feature_values = {}
        cols = st.columns(2)

        for idx, feature in enumerate(quick_features):
            col = cols[idx % 2]
            with col:
                # Intelligente Defaults
                default_value = 0.0
                if "ratio" in feature.lower():
                    default_value = 0.5
                elif "pct" in feature.lower():
                    default_value = 0.1
                elif "price" in feature.lower():
                    default_value = 100.0
                elif "volume" in feature.lower():
                    default_value = 1000.0
                elif "amount" in feature.lower():
                    default_value = 10.0

                feature_values[feature] = st.number_input(
                    feature.replace("_", " ").title(),
                    min_value=0.0,
                    value=default_value,
                    step=0.01,
                    key=f"quick_{feature}_{model_id}",
                    help=f"Feature: {feature}"
                )

        # Vorhersage-Button
        if st.button("🔮 Vorhersage treffen", key=f"predict_btn_{model_id}", use_container_width=True, type="primary"):
            try:
                # API Call für Vorhersage
                result = api_post(f"/models/{model_id}/predict", {"features": feature_values})

                if result:
                    prediction = result.get('prediction')
                    probability = result.get('probability', prediction)
                    confidence = result.get('confidence')

                    # Ergebnis anzeigen
                    st.success("✅ Vorhersage erfolgreich!")

                    col1, col2, col3 = st.columns(3)

                    with col1:
                        if prediction is not None:
                            if prediction > 0.5:
                                st.metric("🎯 Vorhersage", "POSITIVE", delta="+")
                            else:
                                st.metric("🎯 Vorhersage", "NEGATIVE", delta="-")
                        else:
                            st.metric("🎯 Vorhersage", "N/A")

                    with col2:
                        if probability is not None:
                            st.metric("📊 Wahrscheinlichkeit", f"{probability:.2%}")
                        else:
                            st.metric("📊 Wahrscheinlichkeit", "N/A")

                    with col3:
                        if confidence is not None:
                            st.metric("🎚️ Konfidenz", f"{confidence:.2f}")
                        else:
                            st.metric("🎚️ Konfidenz", "N/A")

                else:
                    st.error("❌ Fehler bei der Vorhersage")

            except Exception as e:
                st.error(f"❌ Fehler: {str(e)}")

        # Hinweis für erweiterte Features
        if len(features) > len(quick_features):
            st.caption(f"💡 Nur {len(quick_features)} von {len(features)} Features. Für alle Features zur Detail-Seite gehen.")


def page_overview():
    """Übersicht: Liste aller Modelle"""
    st.title("🏠 Übersicht - ML Modelle")

    # Performance: Nur einmal pro Session initialisieren
    if 'selected_models' not in st.session_state:
        st.session_state['selected_models'] = []

    # Performance: Cache-Invalidierung bei Bedarf
    if st.button("🔄 Aktualisieren", help="Daten neu laden"):
        get_models_cached.clear()
        get_active_models_cached.clear()
        st.rerun()

    # Lade Modelle gecached für bessere Performance
    models = get_models_cached()
    if not models:
        st.warning("⚠️ Keine Modelle gefunden oder API-Fehler")
        return

    # Filter
    col1, col2, col3 = st.columns(3)
    with col1:
        status_filter = st.selectbox(
            "Status Filter",
            ["Alle", "active", "inactive"],
            key="status_filter"
        )
    with col2:
        model_type_filter = st.selectbox(
            "Modell-Typ Filter",
            ["Alle", "random_forest", "xgboost"],
            key="model_type_filter"
        )

    # Filter anwenden
    filtered_models = models
    if status_filter != "Alle":
        if status_filter == "active":
            filtered_models = [m for m in filtered_models if m.get('is_active', True)]
        elif status_filter == "inactive":
            filtered_models = [m for m in filtered_models if not m.get('is_active', True)]
    if model_type_filter != "Alle":
        filtered_models = [m for m in filtered_models if m.get('model_type') == model_type_filter]

    st.info(f"📊 {len(filtered_models)} Modell(e) gefunden")

    # Kompakte Karten-Ansicht
    if filtered_models:
        st.subheader("📋 Modelle")

        # Erstelle Karten in einem Grid (2 Spalten)
        cols = st.columns(2)

        for idx, model in enumerate(filtered_models):
            model_id = model.get('id')
            model_name = model.get('name', f"ID: {model_id}")
            model_type = model.get('model_type', 'N/A')
            is_active = model.get('is_active', True)
            status = 'active' if is_active else 'inactive'
            accuracy = model.get('accuracy')
            f1 = model.get('f1_score')
            created_raw = model.get('created_at', '')
            updated_at = model.get('updated_at', '')

            # Checkbox
            is_selected = model_id in st.session_state.get('selected_models', [])
            checkbox_key = f"checkbox_{model_id}"

            # Wähle Spalte (abwechselnd)
            col = cols[idx % 2]

            with col:
                # Karte mit Border
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

                st.markdown('<div class="model-card">', unsafe_allow_html=True)

                # Header mit Checkbox und Name
                header_col1, header_col2, header_col3, header_col4 = st.columns([0.3, 4, 0.6, 0.6])
                with header_col1:
                    checked = st.checkbox("", value=is_selected, key=checkbox_key, label_visibility="collapsed")
                    # Session-State wird automatisch aktualisiert
                    if checked and model_id not in st.session_state.get('selected_models', []):
                        if 'selected_models' not in st.session_state:
                            st.session_state['selected_models'] = []
                        st.session_state['selected_models'].append(model_id)
                    elif not checked and model_id in st.session_state.get('selected_models', []):
                        st.session_state['selected_models'].remove(model_id)

                with header_col2:
                    # Name mit Umbenennen
                    if st.session_state.get(f'renaming_{model_id}', False):
                        # Popup-ähnliches Verhalten mit Expander
                        with st.expander("✏️ Modell bearbeiten", expanded=True):
                            new_name = st.text_input("Name *", value=model_name, key=f"new_name_{model_id}")
                            new_desc = st.text_area("Beschreibung", value=model.get('description', '') or '', key=f"new_desc_{model_id}", height=80)

                            # Buttons nebeneinander ohne verschachtelte Spalten
                            # Verwende session_state um Button-Klicks zu verwalten
                            save_key = f"save_clicked_{model_id}"
                            if st.button("💾 Speichern", key=f"save_{model_id}", use_container_width=True, type="primary"):
                                if new_name and new_name.strip():
                                    # Verwende die korrekte API-Route für Umbenennen
                                    result = api_patch(f"/models/{model_id}/rename", {"name": new_name.strip()})
                                    if result:
                                        st.session_state[f'renaming_{model_id}'] = False
                                        st.session_state[save_key] = True
                                        st.success("✅ Modell erfolgreich umbenannt")
                                        st.info("💡 Aktualisiere die Seite (F5), um die Änderung zu sehen")
                                    else:
                                        st.error("❌ Fehler beim Umbenennen")
                                else:
                                    st.warning("⚠️ Name darf nicht leer sein")

                            # Zeige Erfolgsmeldung wenn gespeichert wurde
                            if st.session_state.get(save_key, False):
                                st.success("✅ Modell erfolgreich umbenannt!")
                                # Reset nach Anzeige
                                del st.session_state[save_key]

                            if st.button("❌ Abbrechen", key=f"cancel_{model_id}", use_container_width=True):
                                st.session_state[f'renaming_{model_id}'] = False
                                # Kein st.rerun() - Streamlit rendert automatisch neu
                    else:
                        # Verwende custom_name falls vorhanden, sonst den ursprünglichen Namen
                        display_name = model.get('custom_name') or model_name
                        st.markdown(f"**{display_name}**")

                with header_col3:
                    if st.button("📋", key=f"details_{model_id}", help="Details anzeigen", use_container_width=True):
                        st.experimental_set_query_params(page="details", model_id=str(model_id))
                        st.rerun()

                with header_col4:
                    if not st.session_state.get(f'renaming_{model_id}', False):
                        # Buttons sequentiell anordnen (keine verschachtelten Spalten)
                        if st.button("⚙️", key=f"alert_{model_id}", help="Alert-Einstellungen"):
                            st.experimental_set_query_params(page="alert_config", alert_model=str(model_id))
                            st.rerun()

                        if st.button("✏️", key=f"rename_{model_id}", help="Umbenennen"):
                            st.session_state[f'renaming_{model_id}'] = True
                            # Streamlit rendert automatisch neu

                # Kompakte Info-Zeile
                info_col1, info_col2, info_col3 = st.columns(3)

                with info_col1:
                    type_emoji = "🌲" if model_type == "random_forest" else "🚀" if model_type == "xgboost" else "🤖"
                    st.caption(f"{type_emoji} {model_type}")

                with info_col2:
                    if status == "active":
                        st.caption("✅ Active")
                    elif status == "inactive":
                        st.caption("🚫 Inactive")
                    else:
                        st.caption(f"❌ {status}")

                with info_col3:
                    st.caption(f"#{model_id}")

                # Metriken kompakt - Erweitert
                metric_col1, metric_col2, metric_col3, metric_col4 = st.columns(4)
                with metric_col1:
                    if accuracy:
                        st.metric("Accuracy", f"{accuracy:.3f}", label_visibility="visible")
                    else:
                        st.caption("Accuracy: N/A")
                with metric_col2:
                    if f1:
                        st.metric("F1-Score", f"{f1:.3f}", label_visibility="visible")
                    else:
                        st.caption("F1-Score: N/A")
                with metric_col3:
                    precision = model.get('precision')
                    if precision:
                        st.metric("Precision", f"{precision:.3f}", label_visibility="visible")
                    else:
                        st.caption("Precision: N/A")
                with metric_col4:
                    recall = model.get('recall')
                    if recall:
                        st.metric("Recall", f"{recall:.3f}", label_visibility="visible")
                    else:
                        st.caption("Recall: N/A")

                # Zusätzliche Infos
                info_row1, info_row2 = st.columns(2)

                with info_row1:
                    # Features
                    features_list = model.get('features', [])
                    if features_list:
                        num_features = len(features_list)
                        st.caption(f"📊 {num_features} Features")

                    # Vorhersagen heute (aus stats.total_predictions)
                    stats = model.get('stats', {})
                    predictions_today = stats.get('total_predictions', 0)
                    st.caption(f"🔮 {predictions_today} Vorhersagen heute")

                with info_row2:
                    # Erstellt
                    if created_raw:
                        try:
                            created_dt = datetime.fromisoformat(created_raw.replace('Z', '+00:00'))
                            created_str = created_dt.strftime("%d.%m.%Y")
                            st.caption(f"🕐 Erstellt: {created_str}")
                        except:
                            st.caption(f"🕐 Erstellt: {created_raw[:10]}")
                    else:
                        st.caption("🕐 Erstellt: N/A")

                    # Letzte Aktivität
                    if updated_at:
                        try:
                            updated_dt = datetime.fromisoformat(updated_at.replace('Z', '+00:00'))
                            updated_str = updated_dt.strftime("%d.%m.%Y %H:%M")
                            st.caption(f"🔄 Aktiv: {updated_str}")
                        except:
                            st.caption(f"🔄 Aktiv: {updated_at[:16]}")
                    else:
                        st.caption("🔄 Aktiv: N/A")

                # Schnellvorhersage für dieses Modell
                if model.get('status') == 'active':
                    make_quick_prediction(model_id, model_name, features)

                # Dünne graue Linie zur Trennung
                if idx < len(filtered_models) - 1:
                    st.markdown("<hr style='margin: 10px 0; border: none; border-top: 1px solid #e0e0e0;'>", unsafe_allow_html=True)

        # Zeige ausgewählte Modelle
        selected_models = st.session_state.get('selected_models', [])
        # Filtere nur existierende Modelle
        selected_models = [mid for mid in selected_models if any(m.get('id') == mid for m in filtered_models)]
        # Aktualisiere session_state falls Modelle entfernt wurden
        if len(selected_models) != len(st.session_state.get('selected_models', [])):
            st.session_state['selected_models'] = selected_models

        selected_count = len(selected_models)
        if selected_count > 0:
            st.divider()
            st.subheader(f"🔧 Aktionen ({selected_count} Modell(e) ausgewählt)")

            selected_models_data = [m for m in filtered_models if m.get('id') in selected_models]

            # Zeige ausgewählte Modelle
            if selected_count <= 3:
                selected_names = [f"{m.get('name')} (ID: {m.get('id')})" for m in selected_models_data]
                st.info(f"📌 Ausgewählt: {', '.join(selected_names)}")

            # Aktionen basierend auf Anzahl
            if selected_count == 1:
                # 1 Modell: Details, Download, Löschen
                model_id = selected_models[0]
                selected_model = selected_models_data[0]

                col1, col2, col3 = st.columns(3)

                with col1:
                    details_clicked = st.button("📋 Details", key="btn_details", use_container_width=True)
                    if details_clicked:
                        st.experimental_set_query_params(page="details", model_id=str(model_id))
                        st.rerun()

                with col2:
                    download_clicked = st.button("📥 Download", key="btn_download", use_container_width=True)
                    if download_clicked:
                        download_url = f"{API_BASE_URL}/api/models/{model_id}/download"
                        st.markdown(f"[⬇️ Modell herunterladen]({download_url})")

                with col3:
                    delete_clicked = st.button("🗑️ Löschen", key="btn_delete", use_container_width=True, type="secondary")
                    if delete_clicked:
                        if st.session_state.get('confirm_delete', False):
                            if delete_model(model_id):
                                st.success("✅ Modell gelöscht")
                                # Entferne aus session_state
                                if model_id in st.session_state.get('selected_models', []):
                                    st.session_state['selected_models'].remove(model_id)
                                st.rerun()
                            else:
                                st.error("❌ Fehler beim Löschen des Modells")
                        else:
                            st.session_state['confirm_delete'] = True
                            st.warning("⚠️ Klicke erneut zum Bestätigen")
                            st.rerun()

            elif selected_count == 2:
                # 2 Modelle: Vergleichen, Löschen
                model_a_id = selected_models[0]
                model_b_id = selected_models[1]

                col1, col2 = st.columns(2)

                with col1:
                    if st.button("⚖️ Vergleichen", key="btn_compare", use_container_width=True, type="primary"):
                        st.info("⚖️ Modell-Vergleich noch nicht implementiert")

                with col2:
                    if st.button("🗑️ Beide löschen", key="btn_delete_both", use_container_width=True, type="secondary"):
                        # Lösche beide Modelle
                        ids_to_delete = list(selected_models)
                        deleted_count = 0
                        failed_count = 0

                        for model_id in ids_to_delete:
                            if delete_model(model_id):
                                deleted_count += 1
                                if model_id in st.session_state.get('selected_models', []):
                                    st.session_state['selected_models'].remove(model_id)
                            else:
                                failed_count += 1

                        if deleted_count > 0:
                            st.success(f"✅ {deleted_count} Modell(e) gelöscht")
                        if failed_count > 0:
                            st.error(f"❌ {failed_count} Fehler")

                        if deleted_count > 0:
                            st.rerun()

            else:
                # Mehr als 2: Nur Löschen
                if st.button("🗑️ Alle ausgewählten löschen", key="btn_delete_all", use_container_width=True, type="secondary"):
                    deleted_count = 0
                    failed_count = 0
                    # Kopiere Liste um während Iteration zu ändern
                    ids_to_delete = list(st.session_state.get('selected_models', []))
                    for model_id in ids_to_delete:
                        if delete_model(model_id):
                            deleted_count += 1
                            # Entferne aus session_state
                            if model_id in st.session_state.get('selected_models', []):
                                st.session_state['selected_models'].remove(model_id)
                        else:
                            failed_count += 1

                    # Immer rerun wenn etwas passiert ist
                    if deleted_count > 0 or failed_count > 0:
                        if deleted_count > 0:
                            if failed_count > 0:
                                st.warning(f"⚠️ {deleted_count} Modell(e) gelöscht, {failed_count} Fehler")
                            else:
                                st.success(f"✅ {deleted_count} Modell(e) gelöscht")
                        if failed_count > 0 and deleted_count == 0:
                            st.error(f"❌ Fehler beim Löschen von {failed_count} Modell(en)")
                        st.rerun()
        else:
            st.info("💡 Wähle ein oder mehrere Modelle aus, um Aktionen auszuführen")
    else:
        st.info("ℹ️ Keine Modelle gefunden")
