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


def format_number(value: Optional[float], decimals: int = 4) -> str:
    """Formatiert einen numerischen Wert"""
    if value is None:
        return "N/A"
    return f"{value:.{decimals}f}"


def page_details():
    """Moderne Detail-Seite eines Modells"""
    st.title("🔍 Modell-Detailansicht")

    # Model ID aus URL-Parametern
    query_params = st.experimental_get_query_params()
    model_id = query_params.get("model_id", [None])[0]
    if not model_id:
        st.error("❌ Kein Modell ausgewählt")
        if st.button("⬅️ Zurück zur Übersicht", key="back_to_overview_top", type="primary"):
            st.experimental_set_query_params()
            st.rerun()
        return

    model_id = int(model_id)

    # Modell laden
    with st.spinner("🔄 Modell-Details werden geladen..."):
        model = get_model_details_cached(model_id)

    if model is None:
        st.error("❌ Fehler beim Laden des Modells")
        return

    if not model:
        st.error("❌ Modell nicht gefunden")
        return

    # Hole zusätzliche Metriken aus dem Training-Service falls nicht verfügbar
    model_id_from_training = model.get('model_id')
    training_metrics = None
    if model_id_from_training and not any([model.get('accuracy'), model.get('f1_score'), model.get('precision'), model.get('recall')]):
        try:
            # Verwende requests statt api_get für externe URLs
            import requests
            # Verwende die konfigurierte TRAINING_SERVICE_API_URL
            import os
            training_service_url = os.getenv('TRAINING_SERVICE_API_URL', 'http://host.docker.internal:8012/api')
            if training_service_url.endswith('/api'):
                training_service_url = training_service_url[:-4]  # Entferne /api am Ende

            response = requests.get(f"{training_service_url}/api/models/{model_id_from_training}", timeout=5)
            if response.status_code == 200:
                training_model = response.json()
                training_metrics = {
                    'accuracy': training_model.get('training_accuracy'),
                    'f1_score': training_model.get('training_f1'),
                    'precision': training_model.get('training_precision'),
                    'recall': training_model.get('training_recall'),
                    'roc_auc': training_model.get('roc_auc'),
                    'mcc': training_model.get('mcc'),
                    'confusion_matrix': training_model.get('confusion_matrix'),
                    'simulated_profit_pct': training_model.get('simulated_profit_pct')
                }
                st.info(f"✅ Metriken aus Training-Service geladen für Modell {model_id_from_training}")
        except Exception as e:
            st.warning(f"⚠️ Training-Service nicht erreichbar: {str(e)}")
            pass  # Training-Service nicht verfügbar

    # ============================================================================
    # HEADER BEREICH - Übersicht und Status
    # ============================================================================

    # Modell-Name und Status Header
    model_name = model.get('custom_name') or model.get('name', f'Modell {model_id}')
    model_type = model.get('model_type', 'Unknown')
    is_active = model.get('is_active', True)

    # Header mit Status-Badge
    col_title, col_status = st.columns([3, 1])
    with col_title:
        st.header(f"🎯 {model_name}")
        st.caption(f"ID: {model_id} • Typ: {model_type}")
    with col_status:
        if is_active:
            st.success("🟢 AKTIV")
        else:
            st.error("🔴 INAKTIV")

    # Erstellungsdatum und letzte Aktivität
    created_at = model.get('created_at', '')
    last_prediction = model.get('last_prediction_at', '')
    total_predictions = model.get('total_predictions', 0)

    col1, col2, col3 = st.columns(3)
    with col1:
        if created_at:
            try:
                created_dt = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                st.info(f"📅 Erstellt: {created_dt.strftime('%d.%m.%Y %H:%M')}")
            except:
                st.info(f"📅 Erstellt: {created_at[:16]}")
    with col2:
        if last_prediction:
            try:
                last_dt = datetime.fromisoformat(last_prediction.replace('Z', '+00:00'))
                st.info(f"⚡ Letzte Vorhersage: {last_dt.strftime('%d.%m.%Y %H:%M')}")
            except:
                st.info(f"⚡ Letzte Vorhersage: {last_prediction[:16]}")
        else:
            st.info("⚡ Noch keine Vorhersagen")
    with col3:
        st.info(f"🔢 Gesamt-Vorhersagen: {total_predictions}")

    # ============================================================================
    # PERFORMANCE DASHBOARD
    # ============================================================================

    st.divider()
    st.header("📊 Performance-Metriken")

    # Hauptmetriken in großen Karten
    metrics_col1, metrics_col2, metrics_col3, metrics_col4 = st.columns(4)

    # Verwende lokale Metriken oder aus Training-Service
    accuracy = model.get('accuracy') or (training_metrics.get('accuracy') if training_metrics else None)
    f1_score = model.get('f1_score') or (training_metrics.get('f1_score') if training_metrics else None)
    precision = model.get('precision') or (training_metrics.get('precision') if training_metrics else None)
    recall = model.get('recall') or (training_metrics.get('recall') if training_metrics else None)

    with metrics_col1:
        if accuracy is not None:
            create_metric_card("Accuracy", format_percentage(accuracy * 100), color="good")
        else:
            st.metric("Accuracy", "N/A")

    with metrics_col2:
        if f1_score is not None:
            create_metric_card("F1-Score", format_percentage(f1_score * 100), color="good")
        else:
            st.metric("F1-Score", "N/A")

    with metrics_col3:
        if precision is not None:
            create_metric_card("Precision", format_percentage(precision * 100), color="good")
        else:
            st.metric("Precision", "N/A")

    with metrics_col4:
        if recall is not None:
            create_metric_card("Recall", format_percentage(recall * 100), color="good")
        else:
            st.metric("Recall", "N/A")

    # Zusätzliche Metriken in zwei Spalten
    st.subheader("📈 Erweiterte Metriken")

    ext_col1, ext_col2 = st.columns(2)

    with ext_col1:
        # Confusion Matrix (falls verfügbar)
        confusion_matrix = model.get('confusion_matrix', {})
        if confusion_matrix:
            st.subheader("Confusion Matrix")
            cm_col1, cm_col2 = st.columns(2)
            with cm_col1:
                st.metric("True Positive", confusion_matrix.get('tp', 'N/A'))
                st.metric("False Positive", confusion_matrix.get('fp', 'N/A'))
            with cm_col2:
                st.metric("True Negative", confusion_matrix.get('tn', 'N/A'))
                st.metric("False Negative", confusion_matrix.get('fn', 'N/A'))

        # ROC AUC
        roc_auc = model.get('roc_auc')
        if roc_auc is not None:
            st.metric("ROC AUC", format_number(roc_auc))

    with ext_col2:
        # MCC und weitere Metriken
        mcc = model.get('mcc')
        if mcc is not None:
            st.metric("Matthews Correlation", format_number(mcc))

        # Profitabilität (falls verfügbar)
        profit_pct = model.get('simulated_profit_pct')
        if profit_pct is not None:
            profit_color = "good" if profit_pct > 0 else "bad"
            create_metric_card("Simulierte Profitabilität", format_percentage(profit_pct * 100), color=profit_color)

    # ============================================================================
    # MODELL-KONFIGURATION
    # ============================================================================

    st.divider()
    st.header("⚙️ Modell-Konfiguration")

    # Tabs für verschiedene Konfigurationsbereiche
    tab1, tab2, tab3 = st.tabs(["🎯 Ziel & Parameter", "📊 Features", "🔧 Technische Details"])

    with tab1:
        st.subheader("Zielvariable & Vorhersage-Zeitfenster")

        config_col1, config_col2 = st.columns(2)

        with config_col1:
            target_var = model.get('target_variable', 'N/A')
            st.metric("🎯 Zielvariable", target_var)

            target_direction = model.get('target_direction', 'N/A')
            st.metric("📈 Richtung", target_direction.upper())

        with config_col2:
            future_minutes = model.get('future_minutes', 'N/A')
            st.metric("⏰ Vorhersage-Fenster", f"{future_minutes} Minuten")

            price_change = model.get('price_change_percent', 'N/A')
            if isinstance(price_change, (int, float)):
                st.metric("💰 Mindest-Änderung", f"{price_change}%")
            else:
                st.metric("💰 Mindest-Änderung", price_change)

    with tab2:
        st.subheader("Feature-Übersicht")

        features = model.get('features', [])
        if features:
            # Feature-Statistiken
            st.metric("📊 Anzahl Features", len(features))

            # Feature-Kategorien
            categories = {}
            for feature in features:
                category = feature.split('_')[0] if '_' in feature else 'other'
                categories[category] = categories.get(category, 0) + 1

            # Pie Chart für Feature-Kategorien
            if len(categories) > 1:
                fig = px.pie(
                    values=list(categories.values()),
                    names=list(categories.keys()),
                    title="Feature-Verteilung nach Kategorie"
                )
                st.plotly_chart(fig, use_container_width=True)

            # Feature-Liste
            with st.expander("📋 Alle Features anzeigen", expanded=False):
                for i, feature in enumerate(features, 1):
                    st.code(f"{i:2d}. {feature}")
        else:
            st.warning("⚠️ Keine Features definiert")

    with tab3:
        st.subheader("Technische Parameter")

        params = model.get('params', {})
        if params:
            st.json(params)
        else:
            st.info("ℹ️ Keine technischen Parameter verfügbar")

        # Modell-Größe (falls verfügbar)
        phases = model.get('phases', [])
        if phases:
            st.subheader("📅 Trainings-Phasen")
            st.metric("Anzahl Phasen", len(phases))
            st.write("Phasen:", ", ".join(map(str, phases)))

    # ============================================================================
    # FEATURE IMPORTANCE ANALYSE
    # ============================================================================

    feature_importance = model.get('feature_importance', {})
    if feature_importance:
        st.divider()
        st.header("🎯 Feature Importance Analyse")

        # In DataFrame konvertieren
        importance_df = pd.DataFrame([
            {"Feature": k, "Importance": v}
            for k, v in feature_importance.items()
        ]).sort_values("Importance", ascending=False)

        # Top 20 Features als horizontales Bar Chart
        top_features = importance_df.head(20)

        fig = px.bar(
            top_features,
            x="Importance",
            y="Feature",
            orientation='h',
            title="🎯 Top 20 wichtigste Features",
            color="Importance",
            color_continuous_scale="viridis"
        )
        fig.update_layout(
            height=max(400, len(top_features) * 20),
            xaxis_title="Wichtigkeit",
            yaxis_title="Feature"
        )
        st.plotly_chart(fig, use_container_width=True)

        # Feature-Statistiken
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("📊 Top Feature", f"{top_features.iloc[0]['Feature'][:20]}...", f"{top_features.iloc[0]['Importance']:.4f}")
        with col2:
            st.metric("📈 Durchschnitt", f"{importance_df['Importance'].mean():.4f}")
        with col3:
            st.metric("📉 Minimum", f"{importance_df['Importance'].min():.4f}")

        # Raw Data
        with st.expander("📄 Vollständige Feature Importance Daten"):
            st.dataframe(importance_df, use_container_width=True)

    # ============================================================================
    # VORHERSAGE-HISTORIE & ANALYSE
    # ============================================================================

    st.divider()
    st.header("🔮 Vorhersage-Analyse")

    # Vorhersagen laden
    with st.spinner("🔄 Vorhersage-Daten werden geladen..."):
        # Cache zurücksetzen für frische Daten
        get_predictions_cached.clear()
        predictions = get_predictions_cached(active_model_id=model_id, limit=100)

    if predictions:
        # In DataFrame konvertieren
        pred_df = pd.DataFrame(predictions)

        # Zeitliche Entwicklung der Vorhersagen
        if 'created_at' in pred_df.columns and 'prediction' in pred_df.columns:
            st.subheader("📈 Vorhersage-Entwicklung über Zeit")

            # Daten vorbereiten
            pred_df['created_at'] = pd.to_datetime(pred_df['created_at'])
            if 'probability' in pred_df.columns:
                pred_df['probability_percent'] = pred_df['probability'] * 100
            else:
                pred_df['probability_percent'] = pred_df['prediction'] * 100

            # Zeit-Chart
            fig = px.line(
                pred_df.sort_values('created_at'),
                x='created_at',
                y='probability_percent',
                title="Vorhersage-Wahrscheinlichkeit über Zeit",
                labels={'probability_percent': 'Vorhersage (%)', 'created_at': 'Zeitpunkt'}
            )
            fig.add_hline(y=50, line_dash="dash", line_color="red", annotation_text="50% Schwellenwert")
            st.plotly_chart(fig, use_container_width=True)

        # Vorhersage-Statistiken
        st.subheader("📊 Vorhersage-Statistiken")

        stats_col1, stats_col2, stats_col3, stats_col4 = st.columns(4)

        if 'prediction' in pred_df.columns and 'probability' in pred_df.columns:
            predictions_array = pred_df['prediction'].values
            probabilities_array = pred_df['probability'].values

            with stats_col1:
                positive_preds = (predictions_array == 1).sum()  # prediction ist 0 oder 1
                total_preds = len(predictions_array)
                st.metric("📈 Positive Vorhersagen", f"{positive_preds}/{total_preds}")

            with stats_col2:
                positive_rate = positive_preds / total_preds if total_preds > 0 else 0
                st.metric("🎯 Positive Rate", format_percentage(positive_rate * 100))

            with stats_col3:
                avg_probability = np.mean(probabilities_array)  # Verwende probability für Durchschnitt
                st.metric("📊 Ø Wahrscheinlichkeit", format_percentage(avg_probability * 100))

            with stats_col4:
                std_probability = np.std(probabilities_array)  # Verwende probability für Standardabweichung
                st.metric("📉 Standardabweichung", format_percentage(std_probability * 100))

        # Vorhersage-Verteilung
        st.subheader("📊 Vorhersage-Verteilung")

        if 'probability' in pred_df.columns:
            fig = px.histogram(
                pred_df,
                x='probability',
                nbins=20,
                title="Verteilung der Vorhersage-Wahrscheinlichkeiten",
                labels={'probability': 'Vorhersage-Wahrscheinlichkeit (%)'}
            )
            fig.add_vline(x=0.5, line_dash="dash", line_color="red", annotation_text="50% Schwellenwert")
            st.plotly_chart(fig, use_container_width=True)

        # Detail-Tabelle
        st.subheader("📋 Letzte Vorhersagen")
        with st.expander("📄 Detail-Tabelle anzeigen", expanded=False):
            # Spalten formatieren
            display_df = pred_df.copy()
            if 'created_at' in display_df.columns:
                display_df['created_at'] = display_df['created_at'].dt.strftime('%d.%m.%Y %H:%M:%S')
            if 'prediction' in display_df.columns:
                display_df['prediction'] = display_df['prediction'].round(4)

            st.dataframe(display_df, use_container_width=True)

    else:
        st.info("ℹ️ Noch keine Vorhersagen für dieses Modell vorhanden")

    # ============================================================================
    # AKTIONEN
    # ============================================================================

    st.divider()
    st.header("🔧 Modell-Aktionen")

    # Aktionen in einer schönen Layout
    action_col1, action_col2, action_col3, action_col4 = st.columns(4)

    with action_col1:
        if st.button("⬅️ Zurück zur Übersicht", key="back_to_overview_bottom", use_container_width=True, type="secondary"):
            st.experimental_set_query_params()
            st.rerun()

    with action_col2:
        if st.button("🔮 Neue Vorhersage", key="new_prediction", use_container_width=True, type="primary"):
            st.session_state['model_id'] = model_id
            st.session_state['page'] = 'prediction'
            st.rerun()

    with action_col3:
        # Status umschalten
        new_active_status = not is_active
        status_text = "Deaktivieren" if is_active else "Aktivieren"
        status_icon = "🔴" if is_active else "🟢"

        if st.button(f"{status_icon} {status_text}", key="toggle_status", use_container_width=True):
            if update_model(model_id, {"is_active": new_active_status}):
                st.success(f"✅ Modell {status_text.lower()}")
                st.rerun()
            else:
                st.error(f"❌ Fehler beim {status_text.lower()}")

    with action_col4:
        if st.button("🗑️ Löschen", key="delete_model", use_container_width=True, type="secondary"):
            if st.session_state.get('confirm_delete', False):
                if delete_model(model_id):
                    st.success("✅ Modell gelöscht")
                    st.session_state.pop('page', None)
                    st.session_state.pop('model_id', None)
                    st.session_state.pop('confirm_delete', None)
                    st.rerun()
                else:
                    st.error("❌ Fehler beim Löschen")
            else:
                st.session_state['confirm_delete'] = True
                st.warning("⚠️ Klicke erneut zum Bestätigen")
                st.rerun()
