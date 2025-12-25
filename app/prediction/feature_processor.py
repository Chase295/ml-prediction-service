"""
Feature-Processing für ML Prediction Service

Bereitet Features für Vorhersagen auf - GLEICHE Logik wie Training Service!
⚠️ WICHTIG: Feature-Engineering muss IDENTISCH sein!
"""
import pandas as pd
import numpy as np
from typing import List, Optional, Dict, Any
import asyncpg
from app.database.connection import get_pool
from app.utils.config import FEATURE_HISTORY_SIZE
from app.utils.logging_config import get_logger

logger = get_logger(__name__)


def create_pump_detection_features(
    data: pd.DataFrame,
    window_sizes: list = [5, 10, 15]
) -> pd.DataFrame:
    """
    Erstellt zusätzliche Features für Pump-Detection.
    
    ⚠️ WICHTIG: IDENTISCHE Implementierung wie Training Service!
    
    Features:
    - Price Momentum (Preisänderungen über verschiedene Zeitfenster)
    - Volume Patterns (Volumen-Anomalien, Spikes)
    - Buy/Sell Pressure (Order-Book-Imbalance)
    - Whale Activity (Große Transaktionen)
    - Price Volatility (Preis-Schwankungen)
    - Market Cap Velocity (Market Cap Änderungsrate)
    
    Args:
        data: DataFrame mit coin_metrics Daten (MUSS nach timestamp sortiert sein!)
        window_sizes: Fenstergrößen für Rolling-Berechnungen (in Anzahl Zeilen)
    
    Returns:
        DataFrame mit zusätzlichen Features (ursprüngliche Features bleiben erhalten)
    """
    df = data.copy()
    
    # ⚠️ WICHTIG: Daten müssen nach timestamp sortiert sein!
    if 'timestamp' in df.columns:
        df = df.set_index('timestamp')
    
    if not df.index.is_monotonic_increasing:
        df = df.sort_index()
        logger.warning("⚠️ Daten wurden nach timestamp sortiert für Feature-Engineering")
    
    # ⚠️ WICHTIG: Konvertiere alle numerischen Spalten zu float (decimal.Decimal → float)
    # PostgreSQL gibt NUMERIC als decimal.Decimal zurück, aber pandas benötigt float
    numeric_cols = df.select_dtypes(include=[np.number, 'object']).columns
    for col in numeric_cols:
        if col != 'phase_id_at_time':  # Phase-ID als Integer behalten
            try:
                # Konvertiere zu float (funktioniert für decimal.Decimal, int, float)
                df[col] = pd.to_numeric(df[col], errors='ignore', downcast='float')
            except:
                pass
    
    # Prüfe ob benötigte Spalten vorhanden sind
    # ⚠️ ANPASSUNG: coin_metrics hat volume_sol statt volume_usd!
    # Wir verwenden volume_sol für Volume-Patterns
    required_cols = ['price_close', 'volume_sol', 'buy_volume_sol', 'sell_volume_sol',
                     'price_high', 'price_low', 'market_cap_close']
    missing_cols = [col for col in required_cols if col not in df.columns]
    if missing_cols:
        logger.warning(f"⚠️ Fehlende Spalten für Feature-Engineering: {missing_cols}. Überspringe diese Features.")
    
    # 1. PRICE MOMENTUM (Preisänderungen über verschiedene Zeitfenster)
    if 'price_close' in df.columns:
        for window in window_sizes:
            # Prozentuale Preisänderung
            df[f'price_change_{window}'] = df['price_close'].pct_change(periods=window) * 100
            
            # Rate of Change (ROC)
            df[f'price_roc_{window}'] = ((df['price_close'] - df['price_close'].shift(window)) / 
                                          df['price_close'].shift(window).replace(0, np.nan)) * 100
    
    # 2. VOLUME PATTERNS (Volumen-Anomalien)
    # ⚠️ ANPASSUNG: Verwende volume_sol statt volume_usd
    if 'volume_sol' in df.columns:
        for window in window_sizes:
            # Volumen-Änderung vs. Rolling Average
            rolling_avg = df['volume_sol'].rolling(window=window, min_periods=1).mean()
            df[f'volume_ratio_{window}'] = df['volume_sol'] / rolling_avg.replace(0, np.nan)
            
            # Volumen-Spike (Standard Deviation)
            rolling_std = df['volume_sol'].rolling(window=window, min_periods=1).std()
            df[f'volume_spike_{window}'] = (df['volume_sol'] - rolling_avg) / rolling_std.replace(0, np.nan)
    
    # 3. BUY/SELL PRESSURE
    # ⚠️ ANPASSUNG: Verwende buy_volume_sol und sell_volume_sol
    if 'buy_volume_sol' in df.columns and 'sell_volume_sol' in df.columns:
        # Buy-Sell Ratio
        df['buy_sell_ratio'] = df['buy_volume_sol'] / (df['sell_volume_sol'] + 1e-10)
        
        # Buy-Sell Pressure (Normalized)
        total_volume = df['buy_volume_sol'] + df['sell_volume_sol']
        df['buy_pressure'] = df['buy_volume_sol'] / (total_volume + 1e-10)
        df['sell_pressure'] = df['sell_volume_sol'] / (total_volume + 1e-10)
    
    # 4. WHALE ACTIVITY (nur wenn verfügbar - optional)
    # ⚠️ ANPASSUNG: whale_* Spalten existieren möglicherweise nicht in coin_metrics
    # Überspringen wenn nicht verfügbar
    if 'whale_buy_volume' in df.columns and 'whale_sell_volume' in df.columns:
        # Whale Buy/Sell Ratio
        df['whale_buy_sell_ratio'] = df['whale_buy_volume'] / (df['whale_sell_volume'] + 1e-10)
        
        # Whale Activity Spike
        for window in window_sizes:
            whale_total = df['whale_buy_volume'] + df['whale_sell_volume']
            rolling_avg = whale_total.rolling(window=window, min_periods=1).mean()
            df[f'whale_activity_spike_{window}'] = whale_total / (rolling_avg + 1e-10)
    
    # 5. PRICE VOLATILITY
    if 'price_close' in df.columns and 'price_high' in df.columns and 'price_low' in df.columns:
        for window in window_sizes:
            # Rolling Standard Deviation
            df[f'price_volatility_{window}'] = df['price_close'].rolling(window=window, min_periods=1).std()
            
            # High-Low Range
            df[f'price_range_{window}'] = (df['price_high'] - df['price_low']).rolling(window=window, min_periods=1).mean()
    
    # 6. MARKET CAP VELOCITY (Rate of Change)
    if 'market_cap_close' in df.columns:
        for window in window_sizes:
            df[f'mcap_velocity_{window}'] = ((df['market_cap_close'] - df['market_cap_close'].shift(window)) / 
                                              df['market_cap_close'].shift(window).replace(0, np.nan)) * 100
    
    # 7. ORDER BOOK IMBALANCE (nur wenn verfügbar - optional)
    if 'num_buys' in df.columns and 'num_sells' in df.columns:
        # Buy-Orders vs. Sell-Orders
        total_orders = df['num_buys'] + df['num_sells']
        df['order_imbalance'] = (df['num_buys'] - df['num_sells']) / (total_orders + 1e-10)
    
    # NaN-Werte durch 0 ersetzen (entstehen durch Rolling/Shift)
    df.fillna(0, inplace=True)
    
    # Infinite Werte durch 0 ersetzen
    df.replace([np.inf, -np.inf], 0, inplace=True)
    
    logger.info(f"✅ Feature-Engineering abgeschlossen: {len(df.columns)} Spalten")
    
    return df


async def get_coin_history(
    coin_id: str,
    limit: int,
    phases: Optional[List[int]],
    columns: Optional[List[str]] = None,
    pool: Optional[asyncpg.Pool] = None
) -> pd.DataFrame:
    """
    Holt Historie für einen Coin.
    
    ⚠️ WICHTIG: columns Parameter - nur benötigte Spalten laden!
    Wenn Modell mit bestimmten Features trainiert wurde, müssen diese verfügbar sein!
    
    Args:
        coin_id: Coin-ID (mint)
        limit: Maximale Anzahl Zeilen
        phases: Liste der Phasen (optional)
        columns: Liste der benötigten Spalten (optional, wenn None: alle)
        pool: Datenbank-Pool (optional, wird erstellt wenn None)
        
    Returns:
        DataFrame mit Historie (chronologisch sortiert, älteste zuerst)
    """
    if pool is None:
        pool = await get_pool()
    
    # Verfügbare Spalten in coin_metrics (tatsächlich existierende!)
    available_columns = [
        'price_open', 'price_high', 'price_low', 'price_close',
        'volume_sol',
        'market_cap_close',  # ⚠️ Nur market_cap_close existiert!
        'buy_volume_sol', 'sell_volume_sol',
        'num_buys', 'num_sells',
        'bonding_curve_pct', 'virtual_sol_reserves',
        'unique_wallets', 'is_koth',
        'timestamp', 'phase_id_at_time'  # Immer benötigt
    ]
    
    # Spalten-String für SQL
    if columns:
        # Füge timestamp und phase_id_at_time hinzu (immer benötigt)
        required_cols = set(columns) | {'timestamp', 'phase_id_at_time'}
        
        # Prüfe ob alle Spalten verfügbar sind
        missing = [c for c in required_cols if c not in available_columns]
        if missing:
            raise ValueError(
                f"Features nicht verfügbar in coin_metrics: {missing}\n"
                f"Verfügbare Features: {available_columns}"
            )
        columns_str = ", ".join(sorted(required_cols))
    else:
        columns_str = "*"
    
    if phases:
        query = f"""
            SELECT {columns_str} FROM coin_metrics
            WHERE mint = $1 AND phase_id_at_time = ANY($2::int[])
            ORDER BY timestamp DESC
            LIMIT $3
        """
        rows = await pool.fetch(query, coin_id, phases, limit)
    else:
        query = f"""
            SELECT {columns_str} FROM coin_metrics
            WHERE mint = $1
            ORDER BY timestamp DESC
            LIMIT $2
        """
        rows = await pool.fetch(query, coin_id, limit)
    
    if not rows:
        phase_info = f" in Phasen {phases}" if phases else ""
        raise ValueError(f"Keine Historie für Coin {coin_id}{phase_info}. Mögliche Ursachen: Coin existiert nicht, keine Daten in den gefilterten Phasen, oder zu wenig Historie.")
    
    df = pd.DataFrame([dict(row) for row in rows])
    
    # ⚠️ WICHTIG: Konvertiere decimal.Decimal zu float (PostgreSQL NUMERIC → Python decimal.Decimal)
    # Pandas kann nicht direkt mit decimal.Decimal rechnen
    for col in df.columns:
        if df[col].dtype == 'object':
            # Prüfe ob es decimal.Decimal Werte sind
            try:
                # Versuche zu float zu konvertieren (funktioniert für decimal.Decimal)
                df[col] = pd.to_numeric(df[col], errors='ignore')
            except:
                pass
    
    # Umkehren für chronologische Reihenfolge (älteste zuerst)
    if 'timestamp' in df.columns:
        df = df.sort_values('timestamp').reset_index(drop=True)
        # Setze timestamp als Index für Feature-Engineering
        df = df.set_index('timestamp')
    
    return df


async def prepare_features(
    coin_id: str,
    model_config: Dict[str, Any],
    pool: Optional[asyncpg.Pool] = None
) -> pd.DataFrame:
    """
    Bereitet Features für einen Coin auf.
    GLEICHE Logik wie beim Training!
    
    Args:
        coin_id: Coin-ID (mint)
        model_config: Modell-Konfiguration (aus prediction_active_models)
        pool: Datenbank-Pool (optional)
        
    Returns:
        DataFrame mit Features (nur letzte Zeile wird für Vorhersage verwendet)
        
    Raises:
        ValueError: Wenn Features fehlen oder nicht verfügbar sind
    """
    if pool is None:
        pool = await get_pool()
    
    # 1. Bestimme welche Basis-Features geladen werden müssen
    required_features = model_config['features']
    
    # Basis-Features die immer verfügbar sind (aus coin_metrics)
    available_columns = [
        'price_open', 'price_high', 'price_low', 'price_close',
        'volume_sol',
        'market_cap_close',  # ⚠️ Nur market_cap_close existiert!
        'buy_volume_sol', 'sell_volume_sol',
        'num_buys', 'num_sells',
        'bonding_curve_pct', 'virtual_sol_reserves',
        'unique_wallets', 'is_koth'
    ]
    
    # Prüfe ob Feature-Engineering aktiviert ist
    params = model_config.get('params') or {}
    use_engineered_features = params.get('use_engineered_features', False)
    
    # Bestimme welche Basis-Features geladen werden müssen
    if use_engineered_features:
        # Feature-Engineering benötigt bestimmte Basis-Features
        required_for_engineering = ['price_close', 'volume_sol', 'market_cap_close']
        # Füge alle benötigten Basis-Features hinzu (die in required_features sind)
        base_features_to_load = [f for f in required_features if f in available_columns]
        # Füge Basis-Features für Engineering hinzu (falls noch nicht vorhanden)
        for feat in required_for_engineering:
            if feat not in base_features_to_load:
                base_features_to_load.append(feat)
    else:
        # Kein Feature-Engineering - nur Basis-Features laden
        base_features_to_load = [f for f in required_features if f in available_columns]
    
    # Hole Historie (nur Basis-Spalten, nicht Feature-Engineering Features!)
    history = await get_coin_history(
        coin_id=coin_id,
        limit=FEATURE_HISTORY_SIZE,
        phases=model_config.get('phases'),
        columns=base_features_to_load if base_features_to_load else None,  # None = alle Spalten
        pool=pool
    )
    
    # 2. Feature-Engineering (wenn aktiviert)
    if use_engineered_features:
        window_sizes = params.get('feature_engineering_windows', [5, 10, 15])
        
        # ⚠️ WICHTIG: Feature-Engineering benötigt bestimmte Basis-Features!
        # z.B. price_close für price_roc, volume_sol für volume_ratio, etc.
        # Prüfe ob alle benötigten Basis-Features vorhanden sind
        required_for_engineering = ['price_close', 'volume_sol', 'market_cap_close']
        missing_for_engineering = [f for f in required_for_engineering if f not in history.columns]
        
        if missing_for_engineering:
            raise ValueError(
                f"Feature-Engineering benötigt folgende Features: {missing_for_engineering}\n"
                f"Verfügbar: {list(history.columns)}"
            )
        
        history = create_pump_detection_features(
            history,
            window_sizes=window_sizes
        )
    
    # 3. Features auswählen (in korrekter Reihenfolge!)
    features = model_config['features'].copy()
    
    # Bei zeitbasierter Vorhersage: target_variable entfernen
    if model_config.get('target_operator') is None:
        # Zeitbasierte Vorhersage - target_variable nicht als Feature verwenden
        features = [f for f in features if f != model_config.get('target_variable')]
    
    # 4. Validierung
    missing = [f for f in features if f not in history.columns]
    if missing:
        raise ValueError(f"Features fehlen: {missing}\nVerfügbar: {list(history.columns)}")
    
    # 5. Reihenfolge prüfen
    if list(history[features].columns) != features:
        raise ValueError(f"Feature-Reihenfolge stimmt nicht! Erwartet: {features}, Gefunden: {list(history[features].columns)}")
    
    # 6. Nur letzte Zeile zurückgeben (neueste Daten)
    result = history[features].iloc[-1:].copy()
    
    logger.debug(f"✅ Features aufbereitet: {len(features)} Features, 1 Zeile")
    
    return result

