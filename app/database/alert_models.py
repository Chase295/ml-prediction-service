"""
Alert-Evaluations Funktionen für ML Prediction Service

Erweiterte Funktionen für Alert-Management:
- Alert-Auswertung (Hintergrund-Job)
- Alert-Abfragen (Liste, Details, Statistiken)
"""
from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta, timezone
import asyncpg
from app.database.connection import get_pool
from app.database.models import get_coin_metrics_at_timestamp
from app.utils.logging_config import get_logger

logger = get_logger(__name__)

# ============================================================
# Alert-Auswertung
# ============================================================

async def evaluate_pending_alerts(batch_size: int = 100) -> Dict[str, int]:
    """
    Wertet alle ausstehenden Alerts aus (Hintergrund-Job).
    
    Args:
        batch_size: Maximale Anzahl Alerts pro Durchlauf
        
    Returns:
        Dict mit Statistiken (evaluated, success, failed, expired)
    """
    pool = await get_pool()
    stats = {'evaluated': 0, 'success': 0, 'failed': 0, 'expired': 0}
    
    # Finde auswertbare Alerts (zeitbasiert)
    time_based_alerts = await pool.fetch("""
        SELECT ae.*, COALESCE(ae.probability, p.probability) as probability FROM alert_evaluations ae LEFT JOIN predictions p ON p.id = ae.prediction_id
        WHERE ae.status = 'pending'
          AND ae.prediction_type = 'time_based'
          AND ae.evaluation_timestamp <= NOW()
        ORDER BY evaluation_timestamp ASC
        LIMIT $1
    """, batch_size)
    
    for alert in time_based_alerts:
        try:
            # Hole Metriken zum Auswertungs-Zeitpunkt (für finale Anzeige)
            metrics = await get_coin_metrics_at_timestamp(
                alert['coin_id'],
                alert['evaluation_timestamp'],
                pool
            )
            
            if not metrics or metrics.get('price_close') is None:
                # Keine Daten verfügbar → Status 'expired'
                await pool.execute("""
                    UPDATE alert_evaluations
                    SET status = 'expired',
                        evaluated_at = NOW(),
                        updated_at = NOW()
                    WHERE id = $1
                """, alert['id'])
                stats['expired'] += 1
                continue
            
            # Berechne Änderung zum finalen Zeitpunkt (für Anzeige)
            price_at_alert = float(alert['price_close_at_alert'])
            price_at_eval = metrics['price_close']
            actual_change = ((price_at_eval - price_at_alert) / price_at_alert) * 100
            
            # NEU: Prüfe ob Ziel INNERHALB des Zeitraums erreicht wurde
            target_change = float(alert['price_change_percent'])
            target_direction = alert['target_direction']
            
            # Hole alle Preise zwischen alert_timestamp und evaluation_timestamp
            alert_ts = alert['alert_timestamp']
            eval_ts = alert['evaluation_timestamp']
            
            price_history_rows = await pool.fetch("""
                SELECT price_close, price_high, price_low, timestamp
                FROM coin_metrics
                WHERE mint = $1
                  AND timestamp >= $2
                  AND timestamp <= $3
                ORDER BY timestamp ASC
            """, alert['coin_id'], alert_ts, eval_ts)
            
            # Prüfe ob Ziel INNERHALB des Zeitraums erreicht wurde
            success = False
            max_change_reached = None
            min_change_reached = None
            
            for row in price_history_rows:
                if row['price_close'] is None:
                    continue
                
                price = float(row['price_close'])
                change = ((price - price_at_alert) / price_at_alert) * 100
                
                # Track min/max Änderung für Debugging
                if max_change_reached is None or change > max_change_reached:
                    max_change_reached = change
                if min_change_reached is None or change < min_change_reached:
                    min_change_reached = change
                
                # Prüfe ob Ziel erreicht wurde
                if target_direction == 'up':
                    if change >= target_change:
                        success = True
                        break  # Ziel erreicht, keine weitere Prüfung nötig
                else:  # 'down'
                    if change <= -target_change:
                        success = True
                        break  # Ziel erreicht, keine weitere Prüfung nötig
            
            # Update Status mit ALLEN Metriken
            await pool.execute("""
                UPDATE alert_evaluations
                SET status = $1,
                    price_close_at_evaluation = $2,
                    price_open_at_evaluation = $3,
                    price_high_at_evaluation = $4,
                    price_low_at_evaluation = $5,
                    market_cap_close_at_evaluation = $6,
                    market_cap_open_at_evaluation = $7,
                    volume_sol_at_evaluation = $8,
                    volume_usd_at_evaluation = $9,
                    buy_volume_sol_at_evaluation = $10,
                    sell_volume_sol_at_evaluation = $11,
                    num_buys_at_evaluation = $12,
                    num_sells_at_evaluation = $13,
                    unique_wallets_at_evaluation = $14,
                    phase_id_at_evaluation = $15,
                    actual_price_change_pct = $16,
                    evaluated_at = NOW(),
                    updated_at = NOW()
                WHERE id = $17
            """,
                'success' if success else 'failed',
                price_at_eval,
                metrics.get('price_open'),
                metrics.get('price_high'),
                metrics.get('price_low'),
                metrics.get('market_cap_close'),
                metrics.get('market_cap_open'),
                metrics.get('volume_sol'),
                metrics.get('volume_usd'),
                metrics.get('buy_volume_sol'),
                metrics.get('sell_volume_sol'),
                metrics.get('num_buys'),
                metrics.get('num_sells'),
                metrics.get('unique_wallets'),
                metrics.get('phase_id'),
                actual_change,
                alert['id']
            )
            
            stats['evaluated'] += 1
            if success:
                stats['success'] += 1
            else:
                stats['failed'] += 1
                
        except Exception as e:
            logger.error(f"❌ Fehler bei Auswertung von Alert {alert['id']}: {e}", exc_info=True)
    
    # Finde auswertbare Alerts (klassisch)
    classic_alerts = await pool.fetch("""
        SELECT ae.*, COALESCE(ae.probability, p.probability) as probability FROM alert_evaluations ae LEFT JOIN predictions p ON p.id = ae.prediction_id
        WHERE ae.status = 'pending'
          AND ae.prediction_type = 'classic'
          AND ae.evaluation_timestamp <= NOW()
        ORDER BY evaluation_timestamp ASC
        LIMIT $1
    """, batch_size)
    
    for alert in classic_alerts:
        try:
            # Hole Wert der target_variable zum Auswertungs-Zeitpunkt
            target_var = alert['target_variable']
            metrics = await get_coin_metrics_at_timestamp(
                alert['coin_id'],
                alert['evaluation_timestamp'],
                pool
            )
            
            if not metrics:
                await pool.execute("""
                    UPDATE alert_evaluations
                    SET status = 'expired',
                        evaluated_at = NOW(),
                        updated_at = NOW()
                    WHERE id = $1
                """, alert['id'])
                stats['expired'] += 1
                continue
            
            # Hole Wert der target_variable
            actual_value = metrics.get(target_var)
            if actual_value is None:
                await pool.execute("""
                    UPDATE alert_evaluations
                    SET status = 'expired',
                        evaluated_at = NOW(),
                        updated_at = NOW()
                    WHERE id = $1
                """, alert['id'])
                stats['expired'] += 1
                continue
            
            # Vergleiche mit Ziel
            operator = alert['target_operator']
            target_value = float(alert['target_value'])
            
            if operator == '>':
                success = actual_value > target_value
            elif operator == '<':
                success = actual_value < target_value
            elif operator == '>=':
                success = actual_value >= target_value
            elif operator == '<=':
                success = actual_value <= target_value
            elif operator == '=':
                success = abs(actual_value - target_value) < 0.01  # Toleranz für Floats
            else:
                success = False
            
            # Update Status
            await pool.execute("""
                UPDATE alert_evaluations
                SET status = $1,
                    actual_value_at_evaluation = $2,
                    evaluated_at = NOW(),
                    updated_at = NOW()
                WHERE id = $3
            """,
                'success' if success else 'failed',
                actual_value,
                alert['id']
            )
            
            stats['evaluated'] += 1
            if success:
                stats['success'] += 1
            else:
                stats['failed'] += 1
                
        except Exception as e:
            logger.error(f"❌ Fehler bei Auswertung von Alert {alert['id']}: {e}", exc_info=True)
    
    return stats

# ============================================================
# Alert-Abfragen
# ============================================================

async def get_alerts(
    status: Optional[str] = None,
    model_id: Optional[int] = None,
    coin_id: Optional[str] = None,
    prediction_type: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    unique_coins: bool = True,  # Nur ältester Alert pro Coin
    limit: int = 100,
    offset: int = 0
) -> Dict[str, Any]:
    """
    Holt Alerts mit Filtern.
    
    Args:
        status: Filter nach Status ('pending', 'success', 'failed', 'expired')
        model_id: Filter nach Modell-ID
        coin_id: Filter nach Coin-ID
        prediction_type: Filter nach Typ ('time_based', 'classic')
        date_from: Filter ab Datum
        date_to: Filter bis Datum
        unique_coins: Wenn True, nur ältester Alert pro Coin
        limit: Maximale Anzahl
        offset: Offset für Pagination
        
    Returns:
        Dict mit 'alerts' (Liste) und 'total' (Anzahl)
    """
    pool = await get_pool()
    
    # WHERE-Klausel bauen
    conditions = []
    params = []
    param_idx = 1
    
    if status:
        conditions.append(f"ae.status = ${param_idx}")
        params.append(status)
        param_idx += 1
    
    if model_id:
        conditions.append(f"ae.model_id = ${param_idx}")
        params.append(model_id)
        param_idx += 1
    
    if coin_id:
        conditions.append(f"ae.coin_id = ${param_idx}")
        params.append(coin_id)
        param_idx += 1
    
    if prediction_type:
        conditions.append(f"ae.prediction_type = ${param_idx}")
        params.append(prediction_type)
        param_idx += 1
    
    if date_from:
        conditions.append(f"ae.alert_timestamp >= ${param_idx}")
        params.append(date_from)
        param_idx += 1
    
    if date_to:
        conditions.append(f"ae.alert_timestamp <= ${param_idx}")
        params.append(date_to)
        param_idx += 1
    
    where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""
    
    # Zähle Gesamtanzahl
    if unique_coins:
        # Für unique_coins: Zähle distinct coin_ids
        count_query = f"""
            SELECT COUNT(DISTINCT ae.coin_id) as total
            FROM alert_evaluations ae
            {where_clause}
        """
    else:
        count_query = f"""
            SELECT COUNT(*) as total
            FROM alert_evaluations ae
            {where_clause}
        """
    
    total_row = await pool.fetchrow(count_query, *params)
    total = total_row['total'] if total_row else 0
    
    # Hole Alerts (mit probability aus predictions falls nicht in alert_evaluations)
    # OPTIMIERT: Immer nach neuesten sortieren für bessere Performance
    if unique_coins:
        # Für unique_coins: Hole neuesten Alert pro Coin (optimiert)
        query = f"""
            SELECT DISTINCT ON (ae.coin_id) 
                ae.*,
                COALESCE(ae.probability, p.probability) as probability
            FROM alert_evaluations ae
            LEFT JOIN predictions p ON p.id = ae.prediction_id
            {where_clause}
            ORDER BY ae.coin_id, ae.alert_timestamp DESC
            LIMIT ${param_idx} OFFSET ${param_idx + 1}
        """
        params.extend([limit, offset])
    else:
        # OPTIMIERT: Index auf alert_timestamp nutzen, neueste zuerst
        query = f"""
            SELECT 
                ae.*,
                COALESCE(ae.probability, p.probability) as probability
            FROM alert_evaluations ae
            LEFT JOIN predictions p ON p.id = ae.prediction_id
            {where_clause}
            ORDER BY ae.alert_timestamp DESC, ae.id DESC
            LIMIT ${param_idx} OFFSET ${param_idx + 1}
        """
        params.extend([limit, offset])
    
    rows = await pool.fetch(query, *params)
    
    # OPTIMIERT: Hole alle Modell-Namen in einem Query (statt N+1 Queries)
    model_ids = list(set([row['model_id'] for row in rows if row.get('model_id')]))
    model_names_dict = {}
    if model_ids:
        model_rows = await pool.fetch("""
            SELECT id, model_name, custom_name
            FROM prediction_active_models
            WHERE id = ANY($1::bigint[])
        """, model_ids)
        model_names_dict = {
            row['id']: row.get('custom_name') or row.get('model_name', f"Modell {row['id']}")
            for row in model_rows
        }
    
    # Konvertiere zu Dicts
    alerts = []
    for row in rows:
        alert = dict(row)
        
        # Berechne verbleibende Zeit (bei pending)
        if alert['status'] == 'pending' and alert['evaluation_timestamp']:
            now = datetime.now(timezone.utc)
            eval_time = alert['evaluation_timestamp']
            if isinstance(eval_time, str):
                eval_time = datetime.fromisoformat(eval_time.replace('Z', '+00:00'))
            remaining = (eval_time - now).total_seconds()
            alert['remaining_seconds'] = max(0, int(remaining))
        else:
            alert['remaining_seconds'] = None
        
        # Hole Modell-Name aus Cache (optimiert)
        model_id = alert.get('model_id')
        if model_id and model_id in model_names_dict:
            alert['model_name'] = model_names_dict[model_id]
        else:
            # Fallback: Einzelner Query nur wenn nicht im Cache
            model_row = await pool.fetchrow("""
                SELECT model_name, custom_name
                FROM prediction_active_models
                WHERE model_id = $1
                LIMIT 1
            """, alert['model_id'])
            
            if model_row:
                alert['model_name'] = model_row.get('custom_name') or model_row.get('model_name', f"ID: {alert['model_id']}")
            else:
                alert['model_name'] = f"ID: {alert['model_id']}"
        
        # Zähle weitere Alerts für diesen Coin (wenn unique_coins)
        if unique_coins:
            other_count = await pool.fetchval("""
                SELECT COUNT(*) - 1
                FROM alert_evaluations
                WHERE coin_id = $1
            """, alert['coin_id'])
            alert['other_alerts_count'] = max(0, other_count)
        else:
            alert['other_alerts_count'] = 0
        
        # Stelle sicher, dass probability vorhanden ist
        if alert.get('probability') is None:
            # Hole aus predictions falls nicht vorhanden
            prob_row = await pool.fetchrow("""
                SELECT probability FROM predictions WHERE id = $1
            """, alert['prediction_id'])
            if prob_row:
                alert['probability'] = float(prob_row['probability'])
            else:
                alert['probability'] = 0.0
        
        alerts.append(alert)
    
    # Hole Statistiken
    stats_row = await pool.fetchrow("""
        SELECT 
            COUNT(*) FILTER (WHERE ae.status = 'pending') as pending,
            COUNT(*) FILTER (WHERE ae.status = 'success') as success,
            COUNT(*) FILTER (WHERE ae.status = 'failed') as failed,
            COUNT(*) FILTER (WHERE ae.status = 'expired') as expired
        FROM alert_evaluations ae
        {where_clause}
    """.format(where_clause=where_clause), *params[:len(params)-2])  # Ohne limit/offset
    
    stats = {
        'pending': stats_row['pending'] if stats_row else 0,
        'success': stats_row['success'] if stats_row else 0,
        'failed': stats_row['failed'] if stats_row else 0,
        'expired': stats_row['expired'] if stats_row else 0
    }
    
    return {
        'alerts': alerts,
        'total': total,
        **stats
    }

async def get_alert_details(
    alert_id: int,
    chart_before_minutes: int = 10,
    chart_after_minutes: int = 10
) -> Optional[Dict[str, Any]]:
    """
    Holt detaillierte Informationen zu einem Alert.
    
    Args:
        alert_id: Alert-ID
        chart_before_minutes: Minuten vor Alert für Chart
        chart_after_minutes: Minuten nach Auswertung für Chart
        
    Returns:
        Dict mit Alert-Details, Metriken, Historie, etc.
    """
    pool = await get_pool()
    
    # Hole Alert
    alert_row = await pool.fetchrow("""
        SELECT ae.*, COALESCE(ae.probability, p.probability) as probability FROM alert_evaluations ae LEFT JOIN predictions p ON p.id = ae.prediction_id
        WHERE ae.id = $1
    """, alert_id)
    
    if not alert_row:
        return None
    
    alert = dict(alert_row)
    
    # Hole Modell-Name
    model_row = await pool.fetchrow("""
        SELECT model_name, custom_name
        FROM prediction_active_models
        WHERE model_id = $1
        LIMIT 1
    """, alert['model_id'])
    
    if model_row:
        alert['model_name'] = model_row.get('custom_name') or model_row.get('model_name', f"ID: {alert['model_id']}")
    else:
        alert['model_name'] = f"ID: {alert['model_id']}"
    
    # Hole Metriken zum Zeitpunkt des Alerts (bereits in alert gespeichert)
    coin_values_at_alert = {
        'price_close': float(alert['price_close_at_alert']) if alert['price_close_at_alert'] else None,
        'price_open': float(alert['price_open_at_alert']) if alert['price_open_at_alert'] else None,
        'price_high': float(alert['price_high_at_alert']) if alert['price_high_at_alert'] else None,
        'price_low': float(alert['price_low_at_alert']) if alert['price_low_at_alert'] else None,
        'market_cap_close': float(alert['market_cap_close_at_alert']) if alert['market_cap_close_at_alert'] else None,
        'market_cap_open': float(alert['market_cap_open_at_alert']) if alert['market_cap_open_at_alert'] else None,
        'volume_sol': float(alert['volume_sol_at_alert']) if alert['volume_sol_at_alert'] else None,
        'volume_usd': float(alert['volume_usd_at_alert']) if alert['volume_usd_at_alert'] else None,
        'buy_volume_sol': float(alert['buy_volume_sol_at_alert']) if alert['buy_volume_sol_at_alert'] else None,
        'sell_volume_sol': float(alert['sell_volume_sol_at_alert']) if alert['sell_volume_sol_at_alert'] else None,
        'num_buys': int(alert['num_buys_at_alert']) if alert['num_buys_at_alert'] else None,
        'num_sells': int(alert['num_sells_at_alert']) if alert['num_sells_at_alert'] else None,
        'unique_wallets': int(alert['unique_wallets_at_alert']) if alert['unique_wallets_at_alert'] else None,
        'phase_id': int(alert['phase_id_at_alert']) if alert['phase_id_at_alert'] else None
    }
    
    # Hole Metriken zur Auswertung (wenn ausgewertet)
    coin_values_at_evaluation = None
    if alert['status'] in ('success', 'failed') and alert['evaluation_timestamp']:
        coin_values_at_evaluation = {
            'price_close': float(alert['price_close_at_evaluation']) if alert['price_close_at_evaluation'] else None,
            'price_open': float(alert['price_open_at_evaluation']) if alert['price_open_at_evaluation'] else None,
            'price_high': float(alert['price_high_at_evaluation']) if alert['price_high_at_evaluation'] else None,
            'price_low': float(alert['price_low_at_evaluation']) if alert['price_low_at_evaluation'] else None,
            'market_cap_close': float(alert['market_cap_close_at_evaluation']) if alert['market_cap_close_at_evaluation'] else None,
            'market_cap_open': float(alert['market_cap_open_at_evaluation']) if alert['market_cap_open_at_evaluation'] else None,
            'volume_sol': float(alert['volume_sol_at_evaluation']) if alert['volume_sol_at_evaluation'] else None,
            'volume_usd': float(alert['volume_usd_at_evaluation']) if alert['volume_usd_at_evaluation'] else None,
            'buy_volume_sol': float(alert['buy_volume_sol_at_evaluation']) if alert['buy_volume_sol_at_evaluation'] else None,
            'sell_volume_sol': float(alert['sell_volume_sol_at_evaluation']) if alert['sell_volume_sol_at_evaluation'] else None,
            'num_buys': int(alert['num_buys_at_evaluation']) if alert['num_buys_at_evaluation'] else None,
            'num_sells': int(alert['num_sells_at_evaluation']) if alert['num_sells_at_evaluation'] else None,
            'unique_wallets': int(alert['unique_wallets_at_evaluation']) if alert['unique_wallets_at_evaluation'] else None,
            'phase_id': int(alert['phase_id_at_evaluation']) if alert['phase_id_at_evaluation'] else None
        }
    
    # Hole Preis-Historie für Chart
    alert_timestamp = alert['alert_timestamp']
    if isinstance(alert_timestamp, str):
        alert_timestamp = datetime.fromisoformat(alert_timestamp.replace('Z', '+00:00'))
    
    eval_timestamp = alert['evaluation_timestamp']
    if eval_timestamp:
        if isinstance(eval_timestamp, str):
            eval_timestamp = datetime.fromisoformat(eval_timestamp.replace('Z', '+00:00'))
    else:
        eval_timestamp = datetime.now(timezone.utc)
    
    chart_start = alert_timestamp - timedelta(minutes=chart_before_minutes)
    chart_end = eval_timestamp + timedelta(minutes=chart_after_minutes)
    
    history_rows = await pool.fetch("""
        SELECT 
            timestamp,
            price_close, price_high, price_low,
            volume_sol,
            market_cap_close
        FROM coin_metrics
        WHERE mint = $1
          AND timestamp >= $2
          AND timestamp <= $3
        ORDER BY timestamp ASC
    """, alert['coin_id'], chart_start, chart_end)
    
    price_history = []
    volume_history = []
    market_cap_history = []
    
    for row in history_rows:
        ts = row['timestamp']
        if isinstance(ts, str):
            ts = datetime.fromisoformat(ts.replace('Z', '+00:00'))
        
        price_history.append({
            'timestamp': ts.isoformat(),
            'price_close': float(row['price_close']) if row['price_close'] else None,
            'price_high': float(row['price_high']) if row['price_high'] else None,
            'price_low': float(row['price_low']) if row['price_low'] else None
        })
        
        volume_history.append({
            'timestamp': ts.isoformat(),
            'volume_sol': float(row['volume_sol']) if row['volume_sol'] else None
        })
        
        market_cap_history.append({
            'timestamp': ts.isoformat(),
            'market_cap_close': float(row['market_cap_close']) if row['market_cap_close'] else None
        })
    
    # Hole alle weiteren Alerts für diesen Coin
    other_alerts = await pool.fetch("""
        SELECT ae.id, ae.alert_timestamp, ae.model_id, ae.status, COALESCE(ae.probability, p.probability) as probability
        FROM alert_evaluations ae LEFT JOIN predictions p ON p.id = ae.prediction_id
        WHERE ae.coin_id = $1
          AND ae.id != $2
        ORDER BY ae.alert_timestamp ASC
    """, alert['coin_id'], alert_id)
    
    other_alerts_list = []
    for row in other_alerts:
        model_row = await pool.fetchrow("""
            SELECT model_name, custom_name
            FROM prediction_active_models
            WHERE model_id = $1
            LIMIT 1
        """, row['model_id'])
        
        model_name = model_row.get('custom_name') or model_row.get('model_name', f"ID: {row['model_id']}") if model_row else f"ID: {row['model_id']}"
        
        other_alerts_list.append({
            'id': row['id'],
            'alert_timestamp': row['alert_timestamp'].isoformat() if isinstance(row['alert_timestamp'], datetime) else str(row['alert_timestamp']),
            'model_name': model_name,
            'status': row['status'],
            'probability': float(row['probability']) if row.get('probability') else None
        })
    
    # Hole Statistiken für dieses Modell
    stats_row = await pool.fetchrow("""
        SELECT 
            COUNT(*) as total_alerts,
            COUNT(*) FILTER (WHERE ae.status = 'success') as success_count,
            COUNT(*) FILTER (WHERE ae.status = 'failed') as failed_count,
            AVG(actual_price_change_pct) FILTER (WHERE ae.status = 'success' AND prediction_type = 'time_based') as avg_actual_change,
            AVG(price_change_percent) FILTER (WHERE ae.prediction_type = 'time_based') as avg_expected_change
        FROM alert_evaluations ae
        WHERE ae.model_id = $1
    """, alert['model_id'])
    
    statistics = {
        'model_total_alerts': stats_row['total_alerts'] if stats_row else 0,
        'model_success_count': stats_row['success_count'] if stats_row else 0,
        'model_failed_count': stats_row['failed_count'] if stats_row else 0,
        'model_success_rate': (stats_row['success_count'] / stats_row['total_alerts'] * 100) if stats_row and stats_row['total_alerts'] > 0 else 0,
        'model_avg_actual_change': float(stats_row['avg_actual_change']) if stats_row and stats_row['avg_actual_change'] else None,
        'model_avg_expected_change': float(stats_row['avg_expected_change']) if stats_row and stats_row['avg_expected_change'] else None
    }
    
    return {
        'alert': alert,
        'coin_values_at_alert': coin_values_at_alert,
        'coin_values_at_evaluation': coin_values_at_evaluation,
        'price_history': price_history,
        'volume_history': volume_history,
        'market_cap_history': market_cap_history,
        'other_alerts': other_alerts_list,
        'statistics': statistics
    }

async def get_alert_statistics(
    model_id: Optional[int] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None
) -> Dict[str, Any]:
    """
    Holt Alert-Statistiken.
    
    Args:
        model_id: Filter nach Modell-ID (optional)
        date_from: Filter ab Datum (optional)
        date_to: Filter bis Datum (optional)
        
    Returns:
        Dict mit Statistiken
    """
    pool = await get_pool()
    
    conditions = []
    params = []
    param_idx = 1
    
    if model_id:
        conditions.append(f"model_id = ${param_idx}")
        params.append(model_id)
        param_idx += 1
    
    if date_from:
        conditions.append(f"alert_timestamp >= ${param_idx}")
        params.append(date_from)
        param_idx += 1
    
    if date_to:
        conditions.append(f"alert_timestamp <= ${param_idx}")
        params.append(date_to)
        param_idx += 1
    
    where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""
    
    stats_row = await pool.fetchrow(f"""
        SELECT 
            COUNT(*) as total_alerts,
            COUNT(*) FILTER (WHERE ae.status = 'pending') as pending,
            COUNT(*) FILTER (WHERE ae.status = 'success') as success,
            COUNT(*) FILTER (WHERE ae.status = 'failed') as failed,
            COUNT(*) FILTER (WHERE ae.status = 'expired') as expired,
            CASE 
                WHEN COUNT(*) FILTER (WHERE ae.status IN ('success', 'failed')) > 0 
                THEN (COUNT(*) FILTER (WHERE ae.status = 'success')::float / 
                      COUNT(*) FILTER (WHERE ae.status IN ('success', 'failed'))::float * 100)
                ELSE 0
            END as success_rate
        FROM alert_evaluations ae
        {where_clause}
    """, *params)
    
    # Statistiken pro Modell
    by_model_rows = await pool.fetch(f"""
        SELECT 
            model_id,
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE ae.status = 'success') as success,
            COUNT(*) FILTER (WHERE ae.status = 'failed') as failed,
            COUNT(*) FILTER (WHERE ae.status = 'pending') as pending
        FROM alert_evaluations ae
        {where_clause}
        GROUP BY ae.model_id
        ORDER BY total DESC
    """, *params)
    
    by_model = []
    for row in by_model_rows:
        model_row = await pool.fetchrow("""
            SELECT model_name, custom_name
            FROM prediction_active_models
            WHERE model_id = $1
            LIMIT 1
        """, row['model_id'])
        
        model_name = model_row.get('custom_name') or model_row.get('model_name', f"ID: {row['model_id']}") if model_row else f"ID: {row['model_id']}"
        
        total_evaluated = row['success'] + row['failed']
        success_rate = (row['success'] / total_evaluated * 100) if total_evaluated > 0 else 0
        
        by_model.append({
            'model_id': row['model_id'],
            'model_name': model_name,
            'total': row['total'],
            'success': row['success'],
            'failed': row['failed'],
            'pending': row['pending'],
            'success_rate': success_rate
        })
    
    return {
        'total_alerts': stats_row['total_alerts'] if stats_row else 0,
        'pending': stats_row['pending'] if stats_row else 0,
        'success': stats_row['success'] if stats_row else 0,
        'failed': stats_row['failed'] if stats_row else 0,
        'expired': stats_row['expired'] if stats_row else 0,
        'success_rate': float(stats_row['success_rate']) if stats_row and stats_row['success_rate'] else 0,
        'by_model': by_model
    }

async def get_model_alert_statistics(active_model_ids: Optional[List[int]] = None) -> Dict[str, Any]:
    """
    OPTIMIERT: Holt Alert-Statistiken für mehrere aktive Modelle in einem Batch-Query.
    
    Args:
        active_model_ids: Liste von active_model_ids (optional, wenn None: alle aktiven)
        
    Returns:
        Dict mit active_model_id (als String für JSON-Kompatibilität) als Key und Dict mit Statistiken als Value
    """
    pool = await get_pool()
    
    # Wenn keine IDs gegeben, hole alle aktiven Modelle
    if active_model_ids is None:
        model_rows = await pool.fetch("""
            SELECT id, model_id FROM prediction_active_models WHERE is_active = true
        """)
        active_model_ids = [row['id'] for row in model_rows]
        model_id_map = {row['id']: row['model_id'] for row in model_rows}
    else:
        # Hole model_id für gegebene active_model_ids
        model_rows = await pool.fetch("""
            SELECT id, model_id FROM prediction_active_models WHERE id = ANY($1::bigint[])
        """, active_model_ids)
        model_id_map = {row['id']: row['model_id'] for row in model_rows}
    
    if not active_model_ids:
        return {}
    
    # OPTIMIERT: Ein Query für alle Modelle - Positive/Negative Vorhersagen
    predictions_stats = await pool.fetch("""
        SELECT 
            active_model_id,
            COUNT(*) as total_predictions,
            COUNT(*) FILTER (WHERE prediction = 1) as positive_predictions,
            COUNT(*) FILTER (WHERE prediction = 0) as negative_predictions
        FROM predictions
        WHERE active_model_id = ANY($1::bigint[])
        GROUP BY active_model_id
    """, active_model_ids)
    
    predictions_dict = {
        row['active_model_id']: {
            'total': row['total_predictions'],
            'positive': row['positive_predictions'],
            'negative': row['negative_predictions']
        }
        for row in predictions_stats
    }
    
    # OPTIMIERT: Ein Query für alle Modelle - Alert-Statistiken (über predictions join)
    # Alerts sind über prediction_id mit predictions verknüpft, predictions hat active_model_id
    # WICHTIG: Nur Alerts mit gültiger prediction_id und active_model_id zählen
    if active_model_ids:
        alert_stats = await pool.fetch("""
            SELECT 
                p.active_model_id,
                COUNT(*) FILTER (WHERE ae.status = 'success') as alerts_success,
                COUNT(*) FILTER (WHERE ae.status = 'failed') as alerts_failed,
                COUNT(*) FILTER (WHERE ae.status = 'pending') as alerts_pending,
                COUNT(*) FILTER (WHERE ae.status = 'expired') as alerts_expired,
                COUNT(*) as alerts_total
            FROM alert_evaluations ae
            INNER JOIN predictions p ON p.id = ae.prediction_id
            WHERE p.active_model_id = ANY($1::bigint[])
              AND p.active_model_id IS NOT NULL
            GROUP BY p.active_model_id
        """, active_model_ids)
        
        # Erstelle Mapping: active_model_id -> alert_stats
        alert_stats_dict = {
            row['active_model_id']: {
                'success': row['alerts_success'],
                'failed': row['alerts_failed'],
                'pending': row['alerts_pending'],
                'expired': row['alerts_expired'],
                'total': row['alerts_total']
            }
            for row in alert_stats
        }
    else:
        alert_stats_dict = {}
    
    # Kombiniere Daten pro active_model_id
    # WICHTIG: Keys als Strings für JSON-Kompatibilität
    result = {}
    for active_model_id in active_model_ids:
        pred_stats = predictions_dict.get(active_model_id, {'total': 0, 'positive': 0, 'negative': 0})
        alert_stats = alert_stats_dict.get(active_model_id, {'success': 0, 'failed': 0, 'pending': 0, 'expired': 0, 'total': 0})
        
        result[str(active_model_id)] = {
            'total_predictions': pred_stats['total'],
            'positive_predictions': pred_stats['positive'],
            'negative_predictions': pred_stats['negative'],
            'alerts_total': alert_stats['total'],
            'alerts_success': alert_stats['success'],
            'alerts_failed': alert_stats['failed'],
            'alerts_pending': alert_stats['pending'],
            'alerts_expired': alert_stats['expired']
        }
    
    return result

