"""
Datenbank-Modelle für ML Prediction Service

CRUD-Operationen für:
- prediction_active_models (aktive Modelle im Prediction Service)
- predictions (Vorhersagen)
- ml_models (nur lesen, vom Training Service)
"""
from typing import List, Dict, Optional, Any
from datetime import datetime
import asyncpg
import json
from app.database.connection import get_pool

# ============================================================
# prediction_active_models - CRUD Operationen
# ============================================================

async def get_available_models() -> List[Dict[str, Any]]:
    """
    Holt alle verfügbaren Modelle aus ml_models (für Import).
    
    Filter: 
    - status = 'READY' AND is_deleted = false
    - NICHT bereits in prediction_active_models (weder aktiv noch pausiert)
    
    Returns:
        Liste von Modellen mit Metadaten
    """
    pool = await get_pool()
    rows = await pool.fetch("""
        SELECT 
            m.id, m.name, m.model_type, m.model_file_path,
            m.target_variable, m.target_operator, m.target_value,
            m.future_minutes, m.price_change_percent, m.target_direction,
            m.features, m.phases, m.params,
            m.training_accuracy, m.training_f1,
            m.created_at
        FROM ml_models m
        WHERE m.status = 'READY' 
          AND m.is_deleted = false
          AND NOT EXISTS (
              SELECT 1 
              FROM prediction_active_models pam
              WHERE pam.model_id = m.id
          )
        ORDER BY m.created_at DESC
    """)
    
    import json
    models = []
    for row in rows:
        # JSONB-Felder konvertieren (asyncpg gibt manchmal Strings zurück)
        features = row['features']
        if isinstance(features, str):
            features = json.loads(features)
        
        phases = row['phases']
        if phases is not None and isinstance(phases, str):
            phases = json.loads(phases)
        
        params = row['params']
        if params is not None and isinstance(params, str):
            params = json.loads(params)
        
        models.append({
            'id': row['id'],
            'name': row['name'],
            'model_type': row['model_type'],
            'model_file_path': row['model_file_path'],
            'target_variable': row['target_variable'],
            'target_operator': row['target_operator'],
            'target_value': float(row['target_value']) if row['target_value'] else None,
            'future_minutes': row['future_minutes'],
            'price_change_percent': float(row['price_change_percent']) if row['price_change_percent'] else None,
            'target_direction': row['target_direction'],
            'features': features,  # JSONB Array → Python List
            'phases': phases,  # JSONB Array → Python List (kann None sein)
            'params': params,  # JSONB Object → Python Dict
            'training_accuracy': float(row['training_accuracy']) if row['training_accuracy'] else None,
            'training_f1': float(row['training_f1']) if row['training_f1'] else None,
            'created_at': row['created_at']
        })
    
    return models

async def get_model_from_training_service(model_id: int) -> Optional[Dict[str, Any]]:
    """
    Holt Modell-Metadaten aus ml_models (nur lesen!).
    
    Args:
        model_id: ID des Modells in ml_models
        
    Returns:
        Modell-Dict oder None wenn nicht gefunden
    """
    pool = await get_pool()
    row = await pool.fetchrow("""
        SELECT 
            id, name, model_type, model_file_path,
            target_variable, target_operator, target_value,
            future_minutes, price_change_percent, target_direction,
            features, phases, params,
            training_accuracy, training_f1,
            created_at
        FROM ml_models
        WHERE id = $1 AND status = 'READY' AND is_deleted = false
    """, model_id)
    
    if not row:
        return None
    
    import json
    # JSONB-Felder konvertieren
    features = row['features']
    if isinstance(features, str):
        features = json.loads(features)
    
    phases = row['phases']
    if phases is not None and isinstance(phases, str):
        phases = json.loads(phases)
    
    params = row['params']
    if params is not None and isinstance(params, str):
        params = json.loads(params)
    
    return {
        'id': row['id'],
        'name': row['name'],
        'model_type': row['model_type'],
        'model_file_path': row['model_file_path'],
        'target_variable': row['target_variable'],
        'target_operator': row['target_operator'],
        'target_value': float(row['target_value']) if row['target_value'] else None,
        'future_minutes': row['future_minutes'],
        'price_change_percent': float(row['price_change_percent']) if row['price_change_percent'] else None,
        'target_direction': row['target_direction'],
        'features': features,  # JSONB Array → Python List
        'phases': phases,  # JSONB Array → Python List (kann None sein)
        'params': params,  # JSONB Object → Python Dict
        'training_accuracy': float(row['training_accuracy']) if row['training_accuracy'] else None,
        'training_f1': float(row['training_f1']) if row['training_f1'] else None,
        'created_at': row['created_at']
    }

async def get_active_models(include_inactive: bool = False) -> List[Dict[str, Any]]:
    """
    Holt alle aktiven Modelle aus prediction_active_models.
    
    Args:
        include_inactive: Wenn True, werden auch inaktive Modelle zurückgegeben
    
    Returns:
        Liste von Modell-Konfigurationen mit Statistiken
    """
    pool = await get_pool()
    
    # WHERE-Klausel dynamisch bauen
    where_clause = "WHERE is_active = true" if not include_inactive else ""
    
    rows = await pool.fetch(f"""
        SELECT 
            id, model_id, model_name, model_type,
            target_variable, target_operator, target_value,
            future_minutes, price_change_percent, target_direction,
            features, phases, params,
            local_model_path, model_file_url,
            is_active, last_prediction_at, total_predictions,
            downloaded_at, activated_at, created_at, updated_at,
            custom_name, alert_threshold,
            n8n_webhook_url, n8n_send_mode, n8n_enabled
        FROM prediction_active_models
        {where_clause}
        ORDER BY is_active DESC, created_at DESC
    """)
    
    # Hole Statistiken für alle Modelle in einem Query (effizienter)
    if rows:
        active_model_ids = [row['id'] for row in rows]
        stats_rows = await pool.fetch("""
            SELECT 
                active_model_id,
                COUNT(*) as total_predictions,
                COUNT(*) FILTER (WHERE prediction = 1) as positive_predictions,
                COUNT(*) FILTER (WHERE prediction = 0) as negative_predictions
            FROM predictions
            WHERE active_model_id = ANY($1::bigint[])
            GROUP BY active_model_id
        """, active_model_ids)
        
        # Erstelle Dict für schnellen Zugriff
        stats_dict = {
            row['active_model_id']: {
                'total': row['total_predictions'],
                'positive': row['positive_predictions'],
                'negative': row['negative_predictions']
            }
            for row in stats_rows
        }
        
        # Hole Alert-Thresholds für Alert-Berechnung
        alert_stats_rows = await pool.fetch("""
            SELECT 
                pam.id as active_model_id,
                COUNT(*) FILTER (
                    WHERE p.prediction = 1 
                    AND p.probability >= COALESCE(pam.alert_threshold, 0.7)
                ) as alerts_count
            FROM prediction_active_models pam
            LEFT JOIN predictions p ON p.active_model_id = pam.id
            WHERE pam.id = ANY($1::bigint[])
            GROUP BY pam.id
        """, active_model_ids)
        
        alerts_dict = {
            row['active_model_id']: row['alerts_count']
            for row in alert_stats_rows
        }
    else:
        stats_dict = {}
        alerts_dict = {}
    
    import json
    models = []
    for row in rows:
        # JSONB-Felder konvertieren
        features = row['features']
        if isinstance(features, str):
            features = json.loads(features)
        
        phases = row['phases']
        if phases is not None and isinstance(phases, str):
            phases = json.loads(phases)
        
        params = row['params']
        if params is not None and isinstance(params, str):
            params = json.loads(params)
        
        # Statistiken für dieses Modell
        model_stats = stats_dict.get(row['id'], {})
        model_alerts = alerts_dict.get(row['id'], 0)
        
        models.append({
            'id': row['id'],
            'model_id': row['model_id'],
            'name': row['model_name'],
            'custom_name': row['custom_name'],  # Falls umbenannt
            'model_type': row['model_type'],
            'target_variable': row['target_variable'],
            'target_operator': row['target_operator'],
            'target_value': float(row['target_value']) if row['target_value'] else None,
            'future_minutes': row['future_minutes'],
            'price_change_percent': float(row['price_change_percent']) if row['price_change_percent'] else None,
            'target_direction': row['target_direction'],
            'features': features,  # JSONB Array → Python List
            'phases': phases,  # JSONB Array → Python List (kann None sein)
            'params': params,  # JSONB Object → Python Dict
            'local_model_path': row['local_model_path'],
            'model_file_url': row['model_file_url'],
            'is_active': row['is_active'],
            'last_prediction_at': row['last_prediction_at'],
            'total_predictions': row['total_predictions'],
            'downloaded_at': row['downloaded_at'],
            'activated_at': row['activated_at'],
            'created_at': row['created_at'],
            'updated_at': row['updated_at'],
            'alert_threshold': float(row['alert_threshold']) if row.get('alert_threshold') is not None else 0.7,
            'n8n_webhook_url': row.get('n8n_webhook_url'),
            'n8n_send_mode': row.get('n8n_send_mode', 'all'),
            'n8n_enabled': row['n8n_enabled'] if row['n8n_enabled'] is not None else True,
            # Statistiken
            'stats': {
                'total_predictions': model_stats.get('total', 0),
                'positive_predictions': model_stats.get('positive', 0),
                'negative_predictions': model_stats.get('negative', 0),
                'alerts_count': model_alerts
            }
        })
    
    return models

async def import_model(
    model_id: int,
    local_model_path: str,
    model_file_url: Optional[str] = None
) -> int:
    """
    Importiert Modell in prediction_active_models.
    
    Args:
        model_id: ID des Modells in ml_models
        local_model_path: Lokaler Pfad zur .pkl Datei
        model_file_url: Optional: URL zum Download
        
    Returns:
        ID des neuen Eintrags in prediction_active_models
        
    Raises:
        ValueError: Wenn Modell nicht gefunden oder bereits importiert
    """
    pool = await get_pool()
    
    # 1. Prüfe ob Modell bereits importiert
    existing = await pool.fetchrow("""
        SELECT id FROM prediction_active_models WHERE model_id = $1
    """, model_id)
    
    if existing:
        raise ValueError(f"Modell {model_id} ist bereits importiert (active_model_id: {existing['id']})")
    
    # 2. Hole Metadaten aus ml_models
    model_data = await get_model_from_training_service(model_id)
    if not model_data:
        raise ValueError(f"Modell {model_id} nicht gefunden oder nicht READY")
    
    # 3. Konvertiere JSONB-Felder zu JSON-Strings (asyncpg benötigt explizite Konvertierung)
    import json
    from app.utils.logging_config import get_logger
    logger = get_logger(__name__)
    
    # asyncpg erwartet JSON-Strings für JSONB-Felder, nicht Python-Listen/Dicts
    features_data = model_data['features']
    if isinstance(features_data, list):
        features_json = json.dumps(features_data)
    elif isinstance(features_data, str):
        features_json = features_data
    else:
        features_json = json.dumps(features_data)
    
    phases_data = model_data['phases']
    if phases_data is None:
        phases_json = None
    elif isinstance(phases_data, list):
        phases_json = json.dumps(phases_data)
    elif isinstance(phases_data, str):
        phases_json = phases_data
    else:
        phases_json = json.dumps(phases_data)
    
    params_data = model_data['params']
    if params_data is None:
        params_json = None
    elif isinstance(params_data, dict):
        params_json = json.dumps(params_data)
    elif isinstance(params_data, str):
        params_json = params_data
    else:
        params_json = json.dumps(params_data)
    
    logger.debug(f"Features JSON Type: {type(features_json)}, Value: {features_json[:50] if isinstance(features_json, str) else features_json}")
    
    # 4. Erstelle Eintrag in prediction_active_models
    # Nutze jsonb() Funktion in PostgreSQL für explizite Konvertierung
    active_model_id = await pool.fetchval("""
        INSERT INTO prediction_active_models (
            model_id, model_name, model_type,
            target_variable, target_operator, target_value,
            future_minutes, price_change_percent, target_direction,
            features, phases, params,
            local_model_path, model_file_url,
            is_active, activated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb, $12::jsonb, $13, $14, $15, NOW())
        RETURNING id
    """,
        model_id,
        model_data['name'],
        model_data['model_type'],
        model_data['target_variable'],
        model_data['target_operator'],
        model_data['target_value'],
        model_data['future_minutes'],
        model_data['price_change_percent'],
        model_data['target_direction'],
        features_json,  # JSONB (als JSON-String)
        phases_json,  # JSONB (als JSON-String oder NULL)
        params_json,  # JSONB (als JSON-String oder NULL)
        local_model_path,
        model_file_url,
        True  # is_active
    )
    
    return active_model_id

async def activate_model(active_model_id: int) -> bool:
    """
    Aktiviert Modell (setzt is_active = true).
    
    Args:
        active_model_id: ID in prediction_active_models
        
    Returns:
        True wenn erfolgreich, False wenn nicht gefunden
    """
    pool = await get_pool()
    result = await pool.execute("""
        UPDATE prediction_active_models
        SET is_active = true,
            activated_at = COALESCE(activated_at, NOW()),
            updated_at = NOW()
        WHERE id = $1
    """, active_model_id)
    
    return result == "UPDATE 1"

async def deactivate_model(active_model_id: int) -> bool:
    """
    Deaktiviert Modell (setzt is_active = false).
    
    Args:
        active_model_id: ID in prediction_active_models
        
    Returns:
        True wenn erfolgreich, False wenn nicht gefunden
    """
    pool = await get_pool()
    result = await pool.execute("""
        UPDATE prediction_active_models
        SET is_active = false,
            updated_at = NOW()
        WHERE id = $1
    """, active_model_id)
    
    return result == "UPDATE 1"

async def delete_active_model(active_model_id: int) -> bool:
    """
    Löscht Modell aus prediction_active_models.
    
    ⚠️ WICHTIG: Lokale Datei muss separat gelöscht werden!
    
    Args:
        active_model_id: ID in prediction_active_models
        
    Returns:
        True wenn erfolgreich, False wenn nicht gefunden
    """
    pool = await get_pool()
    result = await pool.execute("""
        DELETE FROM prediction_active_models WHERE id = $1
    """, active_model_id)
    
    return result == "DELETE 1"

async def update_alert_threshold(active_model_id: int, alert_threshold: float) -> bool:
    """
    Aktualisiert Alert-Threshold für ein aktives Modell.
    
    Args:
        active_model_id: ID des aktiven Modells
        alert_threshold: Neuer Threshold (0.0-1.0)
        
    Returns:
        True wenn erfolgreich, False wenn Modell nicht gefunden
    """
    pool = await get_pool()
    result = await pool.execute("""
        UPDATE prediction_active_models
        SET alert_threshold = $1, updated_at = NOW()
        WHERE id = $2
    """, alert_threshold, active_model_id)
    
    return result == "UPDATE 1"


async def rename_active_model(active_model_id: int, new_name: str) -> bool:
    """
    Benennt Modell um (setzt custom_name).
    
    Args:
        active_model_id: ID in prediction_active_models
        new_name: Neuer Name
        
    Returns:
        True wenn erfolgreich, False wenn nicht gefunden
    """
    pool = await get_pool()
    result = await pool.execute("""
        UPDATE prediction_active_models
        SET custom_name = $1,
            updated_at = NOW()
        WHERE id = $2
    """, new_name, active_model_id)
    
    return result == "UPDATE 1"

async def update_n8n_settings(active_model_id: int, n8n_webhook_url: Optional[str] = None, n8n_send_mode: Optional[str] = None, n8n_enabled: Optional[bool] = None) -> bool:
    """
    Aktualisiert n8n Einstellungen für ein aktives Modell.
    
    Args:
        active_model_id: ID des aktiven Modells
        n8n_webhook_url: n8n Webhook URL (optional, None = löschen)
        n8n_send_mode: Send-Mode ('all' oder 'alerts_only', optional)
        n8n_enabled: n8n aktiviert/deaktiviert (optional)
    """
    pool = await get_pool()
    
    update_fields = ["updated_at = NOW()"]
    params = []
    param_count = 0
    
    if n8n_webhook_url is not None:
        param_count += 1
        if n8n_webhook_url.strip() == "":
            # Leerer String = NULL setzen
            update_fields.append(f"n8n_webhook_url = NULL")
        else:
            update_fields.append(f"n8n_webhook_url = ${param_count}")
            params.append(n8n_webhook_url.strip())
    
    if n8n_send_mode is not None:
        if n8n_send_mode not in ['all', 'alerts_only']:
            raise ValueError(f"Ungültiger n8n_send_mode: {n8n_send_mode}. Erlaubt: 'all', 'alerts_only'")
        param_count += 1
        update_fields.append(f"n8n_send_mode = ${param_count}")
        params.append(n8n_send_mode)
    
    if n8n_enabled is not None:
        param_count += 1
        update_fields.append(f"n8n_enabled = ${param_count}")
        params.append(n8n_enabled)
    
    if not params and len(update_fields) == 1:
        return True  # Nichts zu aktualisieren
    
    param_count += 1
    params.append(active_model_id)
    
    query = f"""
        UPDATE prediction_active_models
        SET {', '.join(update_fields)}
        WHERE id = ${param_count}
    """
    result = await pool.execute(query, *params)
    return result == "UPDATE 1"

# ============================================================
# predictions - CRUD Operationen
# ============================================================

async def save_prediction(
    coin_id: str,
    data_timestamp: datetime,
    model_id: int,
    active_model_id: Optional[int],
    prediction: int,
    probability: float,
    phase_id_at_time: Optional[int] = None,
    features: Optional[Dict[str, Any]] = None,
    prediction_duration_ms: Optional[int] = None
) -> int:
    """
    Speichert Vorhersage in predictions Tabelle.
    
    Args:
        coin_id: Coin-ID (mint)
        data_timestamp: Zeitstempel der Daten
        model_id: ID in ml_models
        active_model_id: ID in prediction_active_models (kann None sein)
        prediction: 0 oder 1
        probability: Wahrscheinlichkeit (0.0 - 1.0)
        phase_id_at_time: Phase zum Zeitpunkt (optional)
        features: Features als Dict (optional, für Debugging)
        prediction_duration_ms: Dauer in Millisekunden (optional)
        
    Returns:
        ID des neuen Eintrags
    """
    pool = await get_pool()
    
    # ⚠️ WICHTIG: Konvertiere Dict zu JSON-String für JSONB-Feld
    features_json = None
    if features is not None:
        if isinstance(features, dict):
            features_json = json.dumps(features)
        elif isinstance(features, str):
            features_json = features
        else:
            features_json = json.dumps(features)
    
    prediction_id = await pool.fetchval("""
        INSERT INTO predictions (
            coin_id, data_timestamp, model_id, active_model_id,
            prediction, probability, phase_id_at_time,
            features, prediction_duration_ms
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)
        RETURNING id
    """,
        coin_id,
        data_timestamp,
        model_id,
        active_model_id,
        prediction,
        probability,
        phase_id_at_time,
        features_json,  # JSONB (als JSON-String oder NULL)
        prediction_duration_ms
    )
    
    # Update total_predictions Counter
    if active_model_id:
        await pool.execute("""
            UPDATE prediction_active_models
            SET total_predictions = total_predictions + 1,
                last_prediction_at = NOW(),
                updated_at = NOW()
            WHERE id = $1
        """, active_model_id)
    
    return prediction_id

async def get_predictions(
    coin_id: Optional[str] = None,
    model_id: Optional[int] = None,
    active_model_id: Optional[int] = None,
    prediction: Optional[int] = None,  # 0 oder 1
    min_probability: Optional[float] = None,  # 0.0 - 1.0
    max_probability: Optional[float] = None,  # 0.0 - 1.0
    phase_id: Optional[int] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    limit: int = 100,
    offset: int = 0
) -> List[Dict[str, Any]]:
    """
    Holt Vorhersagen mit Filtern.
    
    Args:
        coin_id: Filter nach Coin-ID (optional)
        model_id: Filter nach Modell-ID (optional)
        active_model_id: Filter nach aktivem Modell (optional)
        prediction: Filter nach Vorhersage (0 oder 1, optional)
        min_probability: Minimale Wahrscheinlichkeit (optional)
        max_probability: Maximale Wahrscheinlichkeit (optional)
        phase_id: Filter nach Phase (optional)
        date_from: Filter ab Datum (optional)
        date_to: Filter bis Datum (optional)
        limit: Maximale Anzahl
        offset: Offset für Pagination
        
    Returns:
        Liste von Vorhersagen
    """
    pool = await get_pool()
    
    # Baue WHERE-Klausel dynamisch
    conditions = []
    params = []
    param_count = 0
    
    if coin_id:
        param_count += 1
        conditions.append(f"coin_id = ${param_count}")
        params.append(coin_id)
    
    if model_id:
        param_count += 1
        conditions.append(f"model_id = ${param_count}")
        params.append(model_id)
    
    if active_model_id:
        param_count += 1
        conditions.append(f"active_model_id = ${param_count}")
        params.append(active_model_id)
    
    if prediction is not None:
        param_count += 1
        conditions.append(f"prediction = ${param_count}")
        params.append(prediction)
    
    if min_probability is not None:
        param_count += 1
        conditions.append(f"probability >= ${param_count}")
        params.append(min_probability)
    
    if max_probability is not None:
        param_count += 1
        conditions.append(f"probability <= ${param_count}")
        params.append(max_probability)
    
    if phase_id is not None:
        param_count += 1
        conditions.append(f"phase_id_at_time = ${param_count}")
        params.append(phase_id)
    
    if date_from:
        param_count += 1
        conditions.append(f"created_at >= ${param_count}")
        params.append(date_from)
    
    if date_to:
        param_count += 1
        conditions.append(f"created_at <= ${param_count}")
        params.append(date_to)
    
    where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""
    
    param_count += 1
    params.append(limit)
    param_count += 1
    params.append(offset)
    
    query = f"""
        SELECT 
            id, coin_id, data_timestamp, model_id, active_model_id,
            prediction, probability, phase_id_at_time,
            features, prediction_duration_ms, created_at
        FROM predictions
        {where_clause}
        ORDER BY created_at DESC
        LIMIT ${param_count - 1} OFFSET ${param_count}
    """
    
    rows = await pool.fetch(query, *params)
    
    import json
    predictions = []
    for row in rows:
        # JSONB-Felder konvertieren
        features = row['features']
        if features is not None and isinstance(features, str):
            features = json.loads(features)
        
        predictions.append({
            'id': row['id'],
            'coin_id': row['coin_id'],
            'data_timestamp': row['data_timestamp'],
            'model_id': row['model_id'],
            'active_model_id': row['active_model_id'],
            'prediction': row['prediction'],
            'probability': float(row['probability']),
            'phase_id_at_time': row['phase_id_at_time'],
            'features': features,  # JSONB → Python Dict
            'prediction_duration_ms': row['prediction_duration_ms'],
            'created_at': row['created_at']
        })
    
    return predictions

async def get_latest_prediction(coin_id: str, model_id: Optional[int] = None) -> Optional[Dict[str, Any]]:
    """
    Holt neueste Vorhersage für einen Coin.
    
    Args:
        coin_id: Coin-ID
        model_id: Optional: Filter nach Modell-ID
        
    Returns:
        Neueste Vorhersage oder None
    """
    pool = await get_pool()
    
    if model_id:
        row = await pool.fetchrow("""
            SELECT 
                id, coin_id, data_timestamp, model_id, active_model_id,
                prediction, probability, phase_id_at_time,
                features, prediction_duration_ms, created_at
            FROM predictions
            WHERE coin_id = $1 AND model_id = $2
            ORDER BY created_at DESC
            LIMIT 1
        """, coin_id, model_id)
    else:
        row = await pool.fetchrow("""
            SELECT 
                id, coin_id, data_timestamp, model_id, active_model_id,
                prediction, probability, phase_id_at_time,
                features, prediction_duration_ms, created_at
            FROM predictions
            WHERE coin_id = $1
            ORDER BY created_at DESC
            LIMIT 1
        """, coin_id)
    
    if not row:
        return None
    
    import json
    # JSONB-Felder konvertieren
    features = row['features']
    if features is not None and isinstance(features, str):
        features = json.loads(features)
    
    return {
        'id': row['id'],
        'coin_id': row['coin_id'],
        'data_timestamp': row['data_timestamp'],
        'model_id': row['model_id'],
        'active_model_id': row['active_model_id'],
        'prediction': row['prediction'],
        'probability': float(row['probability']),
        'phase_id_at_time': row['phase_id_at_time'],
        'features': features,  # JSONB → Python Dict
        'prediction_duration_ms': row['prediction_duration_ms'],
        'created_at': row['created_at']
    }

# ============================================================
# prediction_webhook_log - CRUD Operationen
# ============================================================

async def save_webhook_log(
    coin_id: str,
    data_timestamp: datetime,
    webhook_url: str,
    payload: Dict[str, Any],
    response_status: Optional[int] = None,
    response_body: Optional[str] = None,
    error_message: Optional[str] = None
) -> int:
    """
    Speichert Webhook-Log in prediction_webhook_log.
    
    Args:
        coin_id: Coin-ID
        data_timestamp: Zeitstempel der Daten
        webhook_url: n8n Webhook-URL
        payload: JSON-Payload (Dict)
        response_status: HTTP-Status-Code (optional)
        response_body: Response-Body (optional)
        error_message: Fehler-Message (optional)
        
    Returns:
        ID des neuen Eintrags
    """
    pool = await get_pool()
    
    # ⚠️ WICHTIG: Konvertiere Dict zu JSON-String für JSONB-Feld
    if payload is None:
        payload_json = None
    elif isinstance(payload, dict):
        payload_json = json.dumps(payload)
    elif isinstance(payload, str):
        payload_json = payload
    else:
        payload_json = json.dumps(payload)
    
    log_id = await pool.fetchval("""
        INSERT INTO prediction_webhook_log (
            coin_id, data_timestamp, webhook_url, payload,
            response_status, response_body, error_message
        ) VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7)
        RETURNING id
    """,
        coin_id,
        data_timestamp,
        webhook_url,
        payload_json,  # JSONB (als JSON-String)
        response_status,
        response_body,
        error_message
    )
    
    return log_id

async def get_model_statistics(active_model_id: int) -> Dict[str, Any]:
    """
    Holt detaillierte Statistiken für ein aktives Modell.
    
    Args:
        active_model_id: ID des aktiven Modells
        
    Returns:
        Dict mit Statistiken
    """
    pool = await get_pool()
    
    # Basis-Statistiken aus predictions
    stats_row = await pool.fetchrow("""
        SELECT 
            COUNT(*) as total_predictions,
            COUNT(*) FILTER (WHERE prediction = 1) as positive_predictions,
            COUNT(*) FILTER (WHERE prediction = 0) as negative_predictions,
            AVG(probability) as avg_probability,
            AVG(probability) FILTER (WHERE prediction = 1) as avg_probability_positive,
            AVG(probability) FILTER (WHERE prediction = 0) as avg_probability_negative,
            MIN(probability) as min_probability,
            MAX(probability) as max_probability,
            AVG(prediction_duration_ms) as avg_duration_ms,
            MIN(created_at) as first_prediction,
            MAX(created_at) as last_prediction,
            COUNT(DISTINCT coin_id) as unique_coins
        FROM predictions
        WHERE active_model_id = $1
    """, active_model_id)
    
    if not stats_row or stats_row['total_predictions'] == 0:
        return {
            'total_predictions': 0,
            'positive_predictions': 0,
            'negative_predictions': 0,
            'avg_probability': None,
            'avg_probability_positive': None,
            'avg_probability_negative': None,
            'min_probability': None,
            'max_probability': None,
            'avg_duration_ms': None,
            'first_prediction': None,
            'last_prediction': None,
            'unique_coins': 0,
            'alerts_count': 0,
            'webhook_success_rate': None,
            'webhook_total': 0,
            'webhook_success': 0,
            'webhook_failed': 0
        }
    
    # Alert-Threshold (Standard: 0.7, da Spalte nicht in Tabelle existiert)
    # TODO: Spalte alert_threshold zur Tabelle hinzufügen, wenn individueller Threshold pro Modell gewünscht
    from app.utils.config import DEFAULT_ALERT_THRESHOLD
    alert_threshold = DEFAULT_ALERT_THRESHOLD
    
    # Anzahl Alerts (positive predictions mit probability >= threshold)
    alerts_row = await pool.fetchrow("""
        SELECT COUNT(*) as alerts_count
        FROM predictions
        WHERE active_model_id = $1
          AND prediction = 1
          AND probability >= $2
    """, active_model_id, alert_threshold)
    
    alerts_count = alerts_row['alerts_count'] if alerts_row else 0
    
    # Webhook-Statistiken
    webhook_stats = await pool.fetchrow("""
        SELECT 
            COUNT(*) as total_webhooks,
            COUNT(*) FILTER (WHERE response_status >= 200 AND response_status < 300) as successful_webhooks,
            COUNT(*) FILTER (WHERE response_status IS NULL OR response_status < 200 OR response_status >= 300) as failed_webhooks
        FROM prediction_webhook_log
        WHERE coin_id IN (
            SELECT DISTINCT coin_id
            FROM predictions
            WHERE active_model_id = $1
        )
        AND data_timestamp >= (
            SELECT MIN(created_at)
            FROM predictions
            WHERE active_model_id = $1
        )
    """, active_model_id)
    
    webhook_total = webhook_stats['total_webhooks'] if webhook_stats else 0
    webhook_success = webhook_stats['successful_webhooks'] if webhook_stats else 0
    webhook_failed = webhook_stats['failed_webhooks'] if webhook_stats else 0
    webhook_success_rate = (webhook_success / webhook_total * 100) if webhook_total > 0 else None
    
    # Wahrscheinlichkeits-Verteilung (für Histogramm)
    prob_distribution = await pool.fetch("""
        SELECT 
            CASE 
                WHEN probability < 0.1 THEN '0.0-0.1'
                WHEN probability < 0.2 THEN '0.1-0.2'
                WHEN probability < 0.3 THEN '0.2-0.3'
                WHEN probability < 0.4 THEN '0.3-0.4'
                WHEN probability < 0.5 THEN '0.4-0.5'
                WHEN probability < 0.6 THEN '0.5-0.6'
                WHEN probability < 0.7 THEN '0.6-0.7'
                WHEN probability < 0.8 THEN '0.7-0.8'
                WHEN probability < 0.9 THEN '0.8-0.9'
                ELSE '0.9-1.0'
            END as prob_range,
            COUNT(*) as count
        FROM predictions
        WHERE active_model_id = $1
        GROUP BY prob_range
        ORDER BY prob_range
    """, active_model_id)
    
    prob_distribution_dict = {row['prob_range']: row['count'] for row in prob_distribution}
    
    return {
        'total_predictions': stats_row['total_predictions'],
        'positive_predictions': stats_row['positive_predictions'],
        'negative_predictions': stats_row['negative_predictions'],
        'avg_probability': float(stats_row['avg_probability']) if stats_row['avg_probability'] else None,
        'avg_probability_positive': float(stats_row['avg_probability_positive']) if stats_row['avg_probability_positive'] else None,
        'avg_probability_negative': float(stats_row['avg_probability_negative']) if stats_row['avg_probability_negative'] else None,
        'min_probability': float(stats_row['min_probability']) if stats_row['min_probability'] else None,
        'max_probability': float(stats_row['max_probability']) if stats_row['max_probability'] else None,
        'avg_duration_ms': float(stats_row['avg_duration_ms']) if stats_row['avg_duration_ms'] else None,
        'first_prediction': stats_row['first_prediction'],
        'last_prediction': stats_row['last_prediction'],
        'unique_coins': stats_row['unique_coins'],
        'alerts_count': alerts_count,
        'alert_threshold': alert_threshold,
        'webhook_success_rate': webhook_success_rate,
        'webhook_total': webhook_total,
        'webhook_success': webhook_success,
        'webhook_failed': webhook_failed,
        'probability_distribution': prob_distribution_dict
    }


    webhook_stats = await pool.fetchrow("""
        SELECT 
            COUNT(*) as total_webhooks,
            COUNT(*) FILTER (WHERE response_status >= 200 AND response_status < 300) as successful_webhooks,
            COUNT(*) FILTER (WHERE response_status IS NULL OR response_status < 200 OR response_status >= 300) as failed_webhooks
        FROM prediction_webhook_log
        WHERE coin_id IN (
            SELECT DISTINCT coin_id
            FROM predictions
            WHERE active_model_id = $1
        )
        AND data_timestamp >= (
            SELECT MIN(created_at)
            FROM predictions
            WHERE active_model_id = $1
        )
    """, active_model_id)
    
    webhook_total = webhook_stats['total_webhooks'] if webhook_stats else 0
    webhook_success = webhook_stats['successful_webhooks'] if webhook_stats else 0
    webhook_failed = webhook_stats['failed_webhooks'] if webhook_stats else 0
    webhook_success_rate = (webhook_success / webhook_total * 100) if webhook_total > 0 else None
    
    # Wahrscheinlichkeits-Verteilung (für Histogramm)
    prob_distribution = await pool.fetch("""
        SELECT 
            CASE 
                WHEN probability < 0.1 THEN '0.0-0.1'
                WHEN probability < 0.2 THEN '0.1-0.2'
                WHEN probability < 0.3 THEN '0.2-0.3'
                WHEN probability < 0.4 THEN '0.3-0.4'
                WHEN probability < 0.5 THEN '0.4-0.5'
                WHEN probability < 0.6 THEN '0.5-0.6'
                WHEN probability < 0.7 THEN '0.6-0.7'
                WHEN probability < 0.8 THEN '0.7-0.8'
                WHEN probability < 0.9 THEN '0.8-0.9'
                ELSE '0.9-1.0'
            END as prob_range,
            COUNT(*) as count
        FROM predictions
        WHERE active_model_id = $1
        GROUP BY prob_range
        ORDER BY prob_range
    """, active_model_id)
    
    prob_distribution_dict = {row['prob_range']: row['count'] for row in prob_distribution}
    
    return {
        'total_predictions': stats_row['total_predictions'],
        'positive_predictions': stats_row['positive_predictions'],
        'negative_predictions': stats_row['negative_predictions'],
        'avg_probability': float(stats_row['avg_probability']) if stats_row['avg_probability'] else None,
        'avg_probability_positive': float(stats_row['avg_probability_positive']) if stats_row['avg_probability_positive'] else None,
        'avg_probability_negative': float(stats_row['avg_probability_negative']) if stats_row['avg_probability_negative'] else None,
        'min_probability': float(stats_row['min_probability']) if stats_row['min_probability'] else None,
        'max_probability': float(stats_row['max_probability']) if stats_row['max_probability'] else None,
        'avg_duration_ms': float(stats_row['avg_duration_ms']) if stats_row['avg_duration_ms'] else None,
        'first_prediction': stats_row['first_prediction'],
        'last_prediction': stats_row['last_prediction'],
        'unique_coins': stats_row['unique_coins'],
        'alerts_count': alerts_count,
        'alert_threshold': alert_threshold,
        'webhook_success_rate': webhook_success_rate,
        'webhook_total': webhook_total,
        'webhook_success': webhook_success,
        'webhook_failed': webhook_failed,
        'probability_distribution': prob_distribution_dict
    }


async def get_n8n_status_for_model(active_model_id: int) -> Dict[str, Any]:
    """
    Prüft den n8n-Status für ein Modell basierend auf dem letzten Webhook-Log.
    
    Args:
        active_model_id: ID des aktiven Modells
        
    Returns:
        Dict mit Status-Informationen:
        - status: 'ok' (letzter Send erfolgreich), 'error' (letzter Send fehlgeschlagen), 'unknown' (kein Log), 'no_url' (keine URL)
        - last_attempt: Timestamp des letzten Versuchs (optional)
        - last_status: HTTP-Status-Code des letzten Versuchs (optional)
        - last_error: Fehlermeldung des letzten Versuchs (optional)
    """
    pool = await get_pool()
    
    # Hole Modell-Konfiguration
    model_row = await pool.fetchrow("""
        SELECT n8n_webhook_url
        FROM prediction_active_models
        WHERE id = $1
    """, active_model_id)
    
    if not model_row:
        return {'status': 'unknown', 'message': 'Modell nicht gefunden'}
    
    n8n_url = model_row.get('n8n_webhook_url')
    
    # Wenn keine URL konfiguriert, prüfe globale URL
    if not n8n_url:
        from app.utils.config import N8N_WEBHOOK_URL
        if not N8N_WEBHOOK_URL:
            return {'status': 'no_url', 'message': 'Keine n8n URL konfiguriert'}
        n8n_url = N8N_WEBHOOK_URL
    
    # Hole den letzten Webhook-Log für diese URL
    last_log = await pool.fetchrow("""
        SELECT 
            response_status,
            error_message,
            created_at
        FROM prediction_webhook_log
        WHERE webhook_url = $1
        ORDER BY created_at DESC
        LIMIT 1
    """, n8n_url)
    
    if not last_log:
        return {
            'status': 'unknown',
            'message': 'Noch kein Webhook-Versuch',
            'n8n_url': n8n_url[:50] + '...' if len(n8n_url) > 50 else n8n_url
        }
    
    # Status basierend auf letztem Versuch
    response_status = last_log.get('response_status')
    error_message = last_log.get('error_message')
    created_at = last_log.get('created_at')
    
    # Prüfe ob erfolgreich (200-299) oder Fehler
    if response_status and 200 <= response_status < 300:
        status = 'ok'
    elif error_message or (response_status and response_status >= 300):
        status = 'error'
    else:
        status = 'unknown'
    
    return {
        'status': status,
        'last_attempt': created_at.isoformat() if created_at else None,
        'last_status': response_status,
        'last_error': error_message,
        'n8n_url': n8n_url[:50] + '...' if len(n8n_url) > 50 else n8n_url
    }
