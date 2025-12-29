"""
🚀 MODERNE DETAIL-SEITE FÜR ML-MODELLE
Komplett überarbeitet: Übersichtlich, informativ, mit JSON-Export
"""
import streamlit as st
import pandas as pd
import plotly.express as px
from datetime import datetime
from typing import Dict, Any, Optional
import numpy as np
import json

# Import aus streamlit_utils
from streamlit_utils import (
    api_get, api_post, api_delete, api_patch,
    get_model_details, delete_model, update_model,
    get_predictions
)

# Caching für bessere Performance
@st.cache_data(ttl=30)
def get_model_details_cached(model_id: int):
    """Cached version of get_model_details"""
    return get_model_details(model_id)

@st.cache_data(ttl=10)
def get_predictions_cached(active_model_id: int, limit: int = 100):
    """Cached version of get_predictions"""
    return get_predictions(active_model_id=active_model_id, limit=limit)


def format_percentage(value: Optional[float], decimals: int = 1) -> str:
    """Formatiert einen Wert als Prozent"""
    if value is None:
        return "N/A"
    return f"{value:.{decimals}f}%"


def load_training_metrics(model: Dict[str, Any]) -> Dict[str, Any]:
    """Lädt Metriken aus Training-Service falls nicht lokal verfügbar"""
    metrics = {
        'accuracy': model.get('accuracy') or model.get('training_accuracy'),
        'f1_score': model.get('f1_score') or model.get('training_f1'),
        'precision': model.get('precision') or model.get('training_precision'),
        'recall': model.get('recall') or model.get('training_recall'),
        'roc_auc': model.get('roc_auc'),
        'mcc': model.get('mcc'),
        'confusion_matrix': model.get('confusion_matrix'),
        'simulated_profit_pct': model.get('simulated_profit_pct')
    }

    # Lade aus Training-Service falls Metriken fehlen
    if not any(metrics.values()) and model.get('model_id'):
        try:
            import requests
            import os
            training_url = os.getenv('TRAINING_SERVICE_API_URL', 'http://host.docker.internal:8012/api')
            if training_url.endswith('/api'):
                training_url = training_url[:-4]

            response = requests.get(f"{training_url}/api/models/{model['model_id']}", timeout=5)
            if response.status_code == 200:
                training_data = response.json()
                metrics.update({
                    'accuracy': training_data.get('training_accuracy'),
                    'f1_score': training_data.get('training_f1'),
                    'precision': training_data.get('training_precision'),
                    'recall': training_data.get('training_recall'),
                    'roc_auc': training_data.get('roc_auc'),
                    'mcc': training_data.get('mcc'),
                    'confusion_matrix': training_data.get('confusion_matrix'),
                    'simulated_profit_pct': training_data.get('simulated_profit_pct')
                })
        except Exception as e:
            st.warning(f"⚠️ Training-Metriken konnten nicht geladen werden: {e}")

    return metrics


def display_confusion_matrix(confusion_matrix):
    """Zeigt Confusion Matrix schön formatiert an"""
    try:
        if isinstance(confusion_matrix, str):
            import ast
            cm_data = ast.literal_eval(confusion_matrix)
        else:
            cm_data = confusion_matrix

        if isinstance(cm_data, dict):
            cm_df = pd.DataFrame([
                [cm_data.get('tn', 0), cm_data.get('fp', 0)],
                [cm_data.get('fn', 0), cm_data.get('tp', 0)]
            ], columns=['Predicted Negative', 'Predicted Positive'],
                     index=['Actual Negative', 'Actual Positive'])

            st.dataframe(cm_df.style.background_gradient(cmap='Blues'))
        else:
            st.json(cm_data)
    except Exception as e:
        st.error(f"Fehler beim Anzeigen der Confusion Matrix: {e}")


def page_details():
    """🚀 MODERNE, ÜBERSICHTLICHE DETAIL-SEITE"""
    st.title("🔍 Modell-Detailansicht")

    # Model ID aus URL-Parametern
    query_params = st.experimental_get_query_params()
    model_id = query_params.get("model_id", [None])[0]
    if not model_id:
        st.error("❌ Kein Modell ausgewählt")
        if st.button("⬅️ Zurück zur Übersicht", type="primary"):
            st.experimental_set_query_params()
            st.rerun()
        return

    model_id = int(model_id)

    # Modell laden
    with st.spinner("🔄 Modell-Details werden geladen..."):
        model = get_model_details_cached(model_id)

    if not model:
        st.error("❌ Modell nicht gefunden")
        return

    # ============================================================================
    # 🎯 HEADER - Übersicht und Status
    # ============================================================================

    model_name = model.get('custom_name') or model.get('name', f'Modell {model_id}')
    model_type = model.get('model_type', 'Unknown')
    is_active = model.get('is_active', True)

    # Header mit Status
    col_title, col_status, col_actions = st.columns([2, 1, 1])
    with col_title:
        st.header(f"🎯 {model_name}")
        st.caption(f"ID: {model_id} • Typ: {model_type}")
    with col_status:
        if is_active:
            st.success("🟢 AKTIV")
        else:
            st.error("🔴 INAKTIV")
    with col_actions:
        if st.button("⬅️ Übersicht", key="back_overview"):
            st.experimental_set_query_params()
            st.rerun()

    # Quick-Stats
    total_predictions = model.get('total_predictions', 0)
    last_prediction = model.get('last_prediction_at', '')

    stats_cols = st.columns(4)
    with stats_cols[0]:
        st.metric("📊 Vorhersagen", f"{total_predictions:,}")
    with stats_cols[1]:
        if last_prediction:
            try:
                dt = datetime.fromisoformat(last_prediction.replace('Z', '+00:00'))
                st.metric("⚡ Letzte Aktivität", dt.strftime('%H:%M'))
            except:
                st.metric("⚡ Letzte Aktivität", "Unbekannt")
    with stats_cols[2]:
        accuracy = model.get('accuracy')
        if accuracy:
            st.metric("🎯 Accuracy", format_percentage(accuracy * 100))
    with stats_cols[3]:
        roc_auc = model.get('roc_auc')
        if roc_auc:
            st.metric("📈 ROC AUC", format_percentage(roc_auc * 100))

    st.divider()

    # ============================================================================
    # 📑 TABS - Organisierte Information
    # ============================================================================

    tabs = st.tabs([
        "📊 Übersicht",
        "🎯 Performance", 
        "🔮 Vorhersagen",
        "⚙️ Konfiguration",
        "📋 JSON Export"
    ])

    # TAB 1: Übersicht
    with tabs[0]:
        show_overview_tab(model)

    # TAB 2: Performance
    with tabs[1]:
        show_performance_tab(model)

    # TAB 3: Vorhersagen
    with tabs[2]:
        show_predictions_tab(model_id)

    # TAB 4: Konfiguration
    with tabs[3]:
        show_configuration_tab(model, model_id)

    # TAB 5: JSON Export
    with tabs[4]:
        show_json_export_tab(model, model_id)


def show_overview_tab(model):
    """📊 Übersicht-Tab"""
    st.header("📊 Modell-Übersicht")

    # Basis-Informationen
    col1, col2 = st.columns(2)

    with col1:
        st.subheader("🎯 Modell-Eigenschaften")
        st.info(f"**Name:** {model.get('name', 'N/A')}")
        st.info(f"**Typ:** {model.get('model_type', 'N/A')}")
        st.info(f"**Zielvariable:** {model.get('target_variable', 'N/A')}")
        st.info(f"**Richtung:** {model.get('target_direction', 'N/A').upper()}")

    with col2:
        st.subheader("⏱️ Timing")
        future_min = model.get('future_minutes')
        if future_min:
            st.info(f"**Vorhersage-Fenster:** {future_min} Minuten")

        price_change = model.get('price_change_percent')
        if price_change:
            st.info(f"**Mindest-Änderung:** {price_change}%")

        phases = model.get('phases', [])
        if phases:
            st.info(f"**Aktive Phasen:** {', '.join(map(str, phases))}")

    # Features-Übersicht
    st.subheader("📈 Feature-Informationen")
    features = model.get('features', [])
    if features:
        st.metric("📊 Anzahl Features", len(features))

        # Feature-Kategorien
        categories = {}
        for feature in features:
            category = feature.split('_')[0] if '_' in feature else 'other'
            categories[category] = categories.get(category, 0) + 1

        if len(categories) > 1:
            fig = px.pie(
                values=list(categories.values()),
                names=list(categories.keys()),
                title="Feature-Verteilung"
            )
            st.plotly_chart(fig, use_container_width=True)
    else:
        st.warning("⚠️ Keine Feature-Informationen verfügbar")


def show_performance_tab(model):
    """🎯 Performance-Tab"""
    st.header("🎯 Performance-Metriken")

    # Training-Metriken laden
    training_metrics = load_training_metrics(model)

    # Hauptmetriken
    st.subheader("📊 Kern-Metriken")
    metrics_cols = st.columns(4)

    metrics = [
        ("🎯 Accuracy", training_metrics.get('accuracy')),
        ("⚖️ F1-Score", training_metrics.get('f1_score')),
        ("🎯 Precision", training_metrics.get('precision')),
        ("🔍 Recall", training_metrics.get('recall'))
    ]

    for i, (label, value) in enumerate(metrics):
        with metrics_cols[i]:
            if value is not None:
                st.metric(label, format_percentage(value * 100))
            else:
                st.metric(label, "N/A")

    # Erweiterte Metriken
    st.subheader("🔬 Erweiterte Metriken")
    ext_cols = st.columns(3)

    with ext_cols[0]:
        roc_auc = training_metrics.get('roc_auc')
        st.metric("📈 ROC AUC", format_percentage(roc_auc * 100, 2) if roc_auc else "N/A")

    with ext_cols[1]:
        mcc = training_metrics.get('mcc')
        st.metric("🔗 MCC", format_percentage(mcc * 100, 2) if mcc else "N/A")

    with ext_cols[2]:
        profit = training_metrics.get('simulated_profit_pct')
        st.metric("💰 Sim. Profit", format_percentage(profit, 2) if profit else "N/A")

    # Confusion Matrix
    confusion_matrix = training_metrics.get('confusion_matrix')
    if confusion_matrix:
        st.subheader("📊 Confusion Matrix")
        display_confusion_matrix(confusion_matrix)


def show_predictions_tab(model_id):
    """🔮 Vorhersagen-Tab"""
    st.header("🔮 Vorhersage-Analyse")

    with st.spinner("🔄 Vorhersagen werden geladen..."):
        predictions = get_predictions_cached(active_model_id=model_id, limit=100)

    if not predictions:
        st.info("ℹ️ Noch keine Vorhersagen für dieses Modell vorhanden")
        return

    pred_df = pd.DataFrame(predictions)

    # Live-Statistiken
    st.subheader("📊 Live-Statistiken")
    if 'prediction' in pred_df.columns and 'probability' in pred_df.columns:
        stats_cols = st.columns(4)

        predictions_array = pred_df['prediction'].values
        probabilities_array = pred_df['probability'].values

        with stats_cols[0]:
            positive_preds = (predictions_array == 1).sum()
            total_preds = len(predictions_array)
            st.metric("📈 Positive", f"{positive_preds}/{total_preds}")

        with stats_cols[1]:
            positive_rate = positive_preds / total_preds if total_preds > 0 else 0
            st.metric("🎯 Pos. Rate", format_percentage(positive_rate * 100))

        with stats_cols[2]:
            avg_prob = np.mean(probabilities_array)
            st.metric("📊 Ø Prob.", format_percentage(avg_prob * 100))

        with stats_cols[3]:
            std_prob = np.std(probabilities_array)
            st.metric("📉 StdDev", format_percentage(std_prob * 100))

    # Zeitliche Entwicklung
    if 'created_at' in pred_df.columns and 'probability' in pred_df.columns:
        st.subheader("📈 Zeitliche Entwicklung")
        pred_df['created_at'] = pd.to_datetime(pred_df['created_at'])
        pred_df['probability_percent'] = pred_df['probability'] * 100

        fig = px.line(
            pred_df.sort_values('created_at'),
            x='created_at',
            y='probability_percent',
            title="Vorhersage-Wahrscheinlichkeit über Zeit"
        )
        fig.add_hline(y=50, line_dash="dash", line_color="red")
        st.plotly_chart(fig, use_container_width=True)

    # Wahrscheinlichkeitsverteilung
    if 'probability' in pred_df.columns:
        st.subheader("📊 Wahrscheinlichkeitsverteilung")
        fig = px.histogram(
            pred_df, x='probability', nbins=20,
            title="Verteilung der Vorhersage-Wahrscheinlichkeiten"
        )
        fig.add_vline(x=0.5, line_dash="dash", line_color="red")
        st.plotly_chart(fig, use_container_width=True)

    # Detail-Tabelle
    st.subheader("📋 Letzte Vorhersagen")
    with st.expander("📄 Detail-Tabelle anzeigen", expanded=False):
        display_df = pred_df.copy()
        if 'created_at' in display_df.columns:
            display_df['created_at'] = pd.to_datetime(display_df['created_at']).dt.strftime('%d.%m.%Y %H:%M')
        if 'probability' in display_df.columns:
            display_df['probability'] = (display_df['probability'] * 100).round(1).astype(str) + '%'

        st.dataframe(display_df[['created_at', 'coin_id', 'prediction', 'probability']].tail(20))


def show_configuration_tab(model, model_id):
    """⚙️ Konfiguration-Tab"""
    st.header("⚙️ Modell-Konfiguration")

    # Alert-Konfiguration
    st.subheader("🚨 Alert-Einstellungen")
    alert_cols = st.columns(2)

    with alert_cols[0]:
        alert_threshold = model.get('alert_threshold', 0.7)
        st.metric("🎯 Alert-Schwelle", format_percentage(alert_threshold * 100))

        n8n_enabled = model.get('n8n_enabled', True)
        st.metric("📡 n8n aktiviert", "Ja" if n8n_enabled else "Nein")

    with alert_cols[1]:
        n8n_send_mode = model.get('n8n_send_mode', 'all')
        st.metric("📤 Send-Modus", n8n_send_mode.replace('_', ' ').title())

        coin_filter_mode = model.get('coin_filter_mode', 'all')
        st.metric("🎯 Coin-Filter", coin_filter_mode.title())

    # Modell-Parameter
    st.subheader("🔧 Technische Parameter")
    params = model.get('params', {})
    if params:
        st.json(params)
    else:
        st.info("Keine Parameter-Informationen verfügbar")

    # Aktionen
    st.subheader("🎮 Aktionen")
    action_cols = st.columns(2)

    with action_cols[0]:
        # Rename-Funktionalität
        if f'renaming_{model_id}' not in st.session_state:
            st.session_state[f'renaming_{model_id}'] = False

        if st.session_state[f'renaming_{model_id}']:
            with st.form(key=f"rename_form_{model_id}"):
                new_name = st.text_input("Neuer Name", value=model.get('custom_name') or model.get('name'))
                col1, col2 = st.columns(2)
                with col1:
                    if st.form_submit_button("💾 Speichern", type="primary"):
                        if update_model(model_id, custom_name=new_name):
                            st.success(f"✅ Name geändert zu: {new_name}")
                            get_model_details_cached.clear()
                            st.rerun()
                        else:
                            st.error("❌ Fehler beim Speichern")
                with col2:
                    if st.form_submit_button("❌ Abbrechen"):
                        st.session_state[f'renaming_{model_id}'] = False
                        st.rerun()
        else:
            if st.button("✏️ Umbenennen"):
                st.session_state[f'renaming_{model_id}'] = True
                st.rerun()

    with action_cols[1]:
        if st.button("🗑️ Modell löschen", type="secondary"):
            if st.checkbox("⚠️ Wirklich löschen? Alle Vorhersagen gehen verloren!", key="confirm_delete"):
                if delete_model(model_id):
                    st.success("✅ Modell gelöscht")
                    st.balloons()
                    import time
                    time.sleep(2)
                    st.experimental_set_query_params()
                    st.rerun()
                else:
                    st.error("❌ Fehler beim Löschen")


def show_json_export_tab(model, model_id):
    """📋 JSON Export-Tab"""
    st.header("📋 JSON Export")

    # Vollständige Modelldaten sammeln
    export_data = {
        "model_info": model,
        "training_service_url": "http://100.76.209.59:8012/",
        "prediction_service_url": "http://localhost:8013/",
        "export_timestamp": datetime.now().isoformat(),
        "export_version": "2.0"
    }

    # Vorhersagen hinzufügen (letzte 50)
    try:
        predictions = get_predictions_cached(active_model_id=model_id, limit=50)
        export_data["recent_predictions"] = predictions if predictions else []
    except:
        export_data["recent_predictions"] = []

    # Training-Metriken hinzufügen
    training_metrics = load_training_metrics(model)
    export_data["training_metrics"] = training_metrics

    # JSON als String formatieren
    json_str = json.dumps(export_data, indent=2, default=str, ensure_ascii=False)

    # Anzeige
    st.subheader("📄 Vollständige Modelldaten (JSON)")

    # Code-Block mit Copy-Button
    st.code(json_str, language="json")

    # Download-Button
    st.download_button(
        label="💾 JSON herunterladen",
        data=json_str,
        file_name=f"model_{model_id}_export.json",
        mime="application/json",
        use_container_width=True,
        type="primary"
    )

    # Statistiken
    st.subheader("📊 Export-Statistiken")
    stats_cols = st.columns(4)
    with stats_cols[0]:
        st.metric("📏 JSON-Größe", f"{len(json_str):,} Zeichen")
    with stats_cols[1]:
        st.metric("🔮 Vorhersagen", len(export_data.get("recent_predictions", [])))
    with stats_cols[2]:
        metrics_count = len([k for k in training_metrics.keys() if training_metrics[k] is not None])
        st.metric("📊 Metriken", metrics_count)
    with stats_cols[3]:
        st.metric("🆔 Modell-ID", model_id)
