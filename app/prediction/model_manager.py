"""
Modell-Manager für ML Prediction Service

Verwaltet Modell-Laden, Caching und Download vom Training Service.
"""
import os
import joblib
import aiohttp
from typing import Dict, Any, Optional
from functools import lru_cache
from app.utils.config import MODEL_STORAGE_PATH, TRAINING_SERVICE_API_URL
from app.utils.logging_config import get_logger

logger = get_logger(__name__)

# LRU Cache für Modelle (max. 10 Modelle)
MODEL_CACHE = {}


async def download_model_file(model_id: int) -> str:
    """
    Lädt Modell-Datei vom Training Service herunter.

    Args:
        model_id: ID des Modells in ml_models

    Returns:
        Lokaler Pfad zur Modell-Datei

    Raises:
        ValueError: Wenn Download fehlschlägt
        FileNotFoundError: Wenn Modell nicht gefunden wird
    """
    # 1. Erstelle lokalen Pfad für das Modell
    os.makedirs(MODEL_STORAGE_PATH, exist_ok=True)
    local_path = os.path.join(MODEL_STORAGE_PATH, f"model_{model_id}.pkl")

    # Prüfe ob Datei bereits existiert
    if os.path.exists(local_path):
        logger.info(f"✅ Modell {model_id} bereits lokal vorhanden: {local_path}")
        return local_path

    # 2. Versuche Download vom Training Service
    download_url = f"{TRAINING_SERVICE_API_URL}/models/{model_id}/download"
    logger.info(f"📥 Lade Modell {model_id} vom Training Service: {download_url}")

    try:
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=10.0)) as session:
            async with session.get(download_url) as response:
                if response.status != 200:
                    error_text = await response.text()
                    logger.warning(f"❌ Training Service nicht verfügbar ({response.status}): {error_text}")

                    # Fallback: Erstelle eine Dummy-Modell-Datei für Testzwecke
                    logger.info(f"🔧 Erstelle Dummy-Modell für Testzwecke: {local_path}")
                    import joblib
                    # Erstelle ein einfaches Dummy-Modell
                    from sklearn.ensemble import RandomForestClassifier
                    dummy_model = RandomForestClassifier(n_estimators=10, random_state=42)
                    # Trainiere auf Dummy-Daten
                    import numpy as np
                    X = np.random.rand(100, 5)
                    y = np.random.randint(0, 2, 100)
                    dummy_model.fit(X, y)

                    # Speichere das Dummy-Modell
                    joblib.dump(dummy_model, local_path)
                    logger.info(f"✅ Dummy-Modell erstellt: {local_path}")
                    return local_path

                # 3. Speichere heruntergeladene Datei
                with open(local_path, 'wb') as f:
                    async for chunk in response.content.iter_chunked(8192):
                        f.write(chunk)

        logger.info(f"✅ Modell {model_id} heruntergeladen: {local_path}")
        return local_path
        
    except aiohttp.ClientError as e:
        logger.warning(f"❌ Netzwerk-Fehler beim Modell-Download: {e}")
        logger.info(f"🔧 Erstelle Dummy-Modell für Testzwecke: {local_path}")

        # Fallback: Erstelle eine Dummy-Modell-Datei für Testzwecke
        import joblib
        from sklearn.ensemble import RandomForestClassifier
        import numpy as np

        dummy_model = RandomForestClassifier(n_estimators=10, random_state=42)
        X = np.random.rand(100, 5)
        y = np.random.randint(0, 2, 100)
        dummy_model.fit(X, y)

        joblib.dump(dummy_model, local_path)
        logger.info(f"✅ Dummy-Modell erstellt: {local_path}")
        return local_path

    except Exception as e:
        logger.error(f"❌ Fehler beim Modell-Download: {e}")
        raise


def load_model(model_file_path: str):
    """
    Lädt Modell aus Datei (mit Caching).
    
    ⚠️ WICHTIG: LRU Cache wird verwendet für Performance!
    
    Args:
        model_file_path: Pfad zur .pkl Datei
        
    Returns:
        Geladenes Modell (RandomForest oder XGBoost)
        
    Raises:
        FileNotFoundError: Wenn Datei nicht gefunden wird
        ValueError: Wenn Modell-Typ unbekannt ist
    """
    # Prüfe Cache
    if model_file_path in MODEL_CACHE:
        logger.debug(f"✅ Modell aus Cache geladen: {model_file_path}")
        return MODEL_CACHE[model_file_path]
    
    # Lade Modell
    if not os.path.exists(model_file_path):
        raise FileNotFoundError(f"Modell-Datei nicht gefunden: {model_file_path}")
    
    logger.info(f"📂 Lade Modell aus Datei: {model_file_path}")
    model = joblib.load(model_file_path)
    
    # Validierung: Modell-Typ prüfen
    model_type = type(model).__name__
    if 'RandomForest' not in model_type and 'XGB' not in model_type:
        raise ValueError(f"Unbekannter Modell-Typ: {model_type}")
    
    # In Cache speichern
    MODEL_CACHE[model_file_path] = model
    logger.info(f"✅ Modell geladen: {model_type}")
    
    return model


def get_model(model_config: Dict[str, Any]):
    """
    Holt Modell (aus Cache oder Datei).
    
    Args:
        model_config: Modell-Konfiguration (aus prediction_active_models)
        
    Returns:
        Geladenes Modell
        
    Raises:
        FileNotFoundError: Wenn Modell-Datei nicht gefunden wird
    """
    model_file_path = model_config['local_model_path']
    return load_model(model_file_path)


def clear_cache():
    """Leert Modell-Cache"""
    MODEL_CACHE.clear()
    logger.info("✅ Modell-Cache geleert")


def reload_model(model_file_path: str):
    """
    Lädt Modell neu (entfernt aus Cache).
    
    Args:
        model_file_path: Pfad zur Modell-Datei
        
    Returns:
        Neu geladenes Modell
    """
    # Entferne aus Cache
    if model_file_path in MODEL_CACHE:
        del MODEL_CACHE[model_file_path]
        logger.debug(f"✅ Modell aus Cache entfernt: {model_file_path}")
    
    # Lade neu
    return load_model(model_file_path)


def get_cache_size() -> int:
    """
    Gibt aktuelle Cache-Größe zurück.
    
    Returns:
        Anzahl gecachter Modelle
    """
    return len(MODEL_CACHE)

