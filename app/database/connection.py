"""
Datenbank-Verbindungsmanagement für ML Prediction Service

Verwaltet den asyncpg Connection Pool für PostgreSQL-Verbindungen.
Die Datenbank ist EXTERN und wird über DB_DSN konfiguriert.
"""
import asyncpg
from typing import Optional
from app.utils.config import DB_DSN, load_config

# Globaler Connection Pool (wird beim ersten Aufruf erstellt)
pool: Optional[asyncpg.Pool] = None

async def get_pool() -> asyncpg.Pool:
    """
    Erstellt oder gibt existierenden Connection Pool zurück.
    
    Der Pool wird beim ersten Aufruf erstellt und danach wiederverwendet.
    Dies verbessert die Performance durch Connection-Reuse.
    
    Returns:
        asyncpg.Pool: Connection Pool für Datenbank-Operationen
        
    Raises:
        Exception: Wenn die Verbindung zur Datenbank fehlschlägt
        
    Example:
        ```python
        pool = await get_pool()
        result = await pool.fetchval("SELECT COUNT(*) FROM prediction_active_models")
        ```
    """
    global pool
    if pool is None:
        try:
            # DB_DSN enthält externe DB-Adresse, z.B.:
            # postgresql://user:pass@100.76.209.59:5432/crypto
            # SSL basierend auf der URL entscheiden
            ssl_mode = False if 'localhost' in DB_DSN or 'db:' in DB_DSN else True

            pool = await asyncpg.create_pool(
                DB_DSN,
                min_size=1,
                max_size=10,
                command_timeout=60,
                ssl=ssl_mode
            )
            # Logging wird später hinzugefügt (nach Schritt 7)
            print(f"✅ Datenbank-Pool erstellt: {DB_DSN.split('@')[1] if '@' in DB_DSN else 'localhost'}")
        except Exception as e:
            print(f"❌ Fehler beim Erstellen des DB-Pools: {e}")
            raise
    return pool

async def close_pool() -> None:
    """
    Schließt den Connection Pool graceful.
    
    Wird typischerweise beim Service-Shutdown aufgerufen, um alle
    offenen Verbindungen ordnungsgemäß zu schließen.
    
    Example:
        ```python
        await close_pool()
        ```
    """
    global pool
    if pool:
        await pool.close()
        pool = None
        print("✅ Datenbank-Pool geschlossen")

async def test_connection() -> bool:
    """
    Testet die Datenbank-Verbindung.
    
    Returns:
        bool: True wenn Verbindung erfolgreich, False sonst
        
    Example:
        ```python
        is_connected = await test_connection()
        if is_connected:
            print("✅ DB-Verbindung funktioniert")
        ```
    """
    try:
        pool = await get_pool()
        result = await pool.fetchval("SELECT 1")
        return result == 1
    except Exception as e:
        print(f"❌ DB-Verbindung fehlgeschlagen: {e}")
        return False

