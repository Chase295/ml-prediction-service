"""
Debug-Script für Modell ID 2
Prüft warum Modell ID 2 keine Coins verarbeitet
"""
import asyncio
import asyncpg
from datetime import datetime, timezone
from app.database.connection import get_pool, close_pool
from app.database.models import get_active_models
from app.prediction.engine import predict_coin_all_models
from app.utils.config import DB_DSN

async def debug_model_2():
    """Debug Modell ID 2"""
    pool = await get_pool()
    
    try:
        # 1. Prüfe ob Modell ID 2 aktiv ist
        print("=" * 60)
        print("1. PRÜFE AKTIVE MODELLE")
        print("=" * 60)
        
        active_models = await get_active_models()
        print(f"Anzahl aktiver Modelle: {len(active_models)}")
        
        model_2 = None
        for model in active_models:
            print(f"  - Modell ID: {model['id']}, Model ID (Training): {model['model_id']}, Name: {model.get('custom_name') or model.get('name')}, Aktiv: {model.get('is_active')}")
            if model['id'] == 2:
                model_2 = model
        
        if not model_2:
            print("\n❌ FEHLER: Modell ID 2 ist NICHT aktiv!")
            print("   → Prüfe in der Datenbank: SELECT * FROM prediction_active_models WHERE id = 2;")
            return
        
        print(f"\n✅ Modell ID 2 gefunden:")
        print(f"   - Name: {model_2.get('custom_name') or model_2.get('name')}")
        print(f"   - Model ID (Training): {model_2['model_id']}")
        print(f"   - Aktiv: {model_2.get('is_active')}")
        print(f"   - Phasen: {model_2.get('phases')}")
        print(f"   - Features: {model_2.get('features', [])[:10]}...")  # Erste 10 Features
        print(f"   - Lokaler Pfad: {model_2.get('local_model_path')}")
        
        # 2. Prüfe ob Modell-Datei existiert
        print("\n" + "=" * 60)
        print("2. PRÜFE MODELL-DATEI")
        print("=" * 60)
        
        import os
        model_path = model_2.get('local_model_path')
        if model_path:
            if os.path.exists(model_path):
                file_size = os.path.getsize(model_path)
                print(f"✅ Modell-Datei existiert: {model_path}")
                print(f"   Größe: {file_size / 1024 / 1024:.2f} MB")
            else:
                print(f"❌ FEHLER: Modell-Datei existiert NICHT: {model_path}")
                return
        else:
            print("❌ FEHLER: Kein lokaler Modell-Pfad angegeben!")
            return
        
        # 3. Prüfe ob es Coins gibt, die verarbeitet werden sollten
        print("\n" + "=" * 60)
        print("3. PRÜFE VERFÜGBARE COINS")
        print("=" * 60)
        
        # Hole einen Test-Coin
        phases = model_2.get('phases')
        if phases:
            query = """
                SELECT DISTINCT mint, MAX(timestamp) as latest_timestamp, MAX(phase_id_at_time) as phase_id
                FROM coin_metrics
                WHERE phase_id_at_time = ANY($1::int[])
                GROUP BY mint
                ORDER BY latest_timestamp DESC
                LIMIT 5
            """
            rows = await pool.fetch(query, phases)
        else:
            query = """
                SELECT DISTINCT mint, MAX(timestamp) as latest_timestamp, MAX(phase_id_at_time) as phase_id
                FROM coin_metrics
                GROUP BY mint
                ORDER BY latest_timestamp DESC
                LIMIT 5
            """
            rows = await pool.fetch(query)
        
        if not rows:
            print("❌ FEHLER: Keine Coins gefunden für die Modell-Phasen!")
            return
        
        print(f"✅ {len(rows)} Test-Coins gefunden:")
        for row in rows:
            print(f"   - Coin: {row['mint'][:20]}..., Phase: {row['phase_id']}, Timestamp: {row['latest_timestamp']}")
        
        # 4. Teste Vorhersage mit einem Coin
        print("\n" + "=" * 60)
        print("4. TESTE VORHERSAGE")
        print("=" * 60)
        
        test_coin = rows[0]['mint']
        test_timestamp = rows[0]['latest_timestamp']
        
        print(f"Teste mit Coin: {test_coin[:20]}...")
        print(f"Timestamp: {test_timestamp}")
        
        try:
            results = await predict_coin_all_models(
                coin_id=test_coin,
                timestamp=test_timestamp,
                active_models=[model_2],  # Nur Modell 2
                pool=pool
            )
            
            if results:
                print(f"✅ Vorhersage erfolgreich!")
                for result in results:
                    print(f"   - Model ID: {result['model_id']}, Active Model ID: {result['active_model_id']}")
                    print(f"   - Prediction: {result['prediction']}, Probability: {result['probability']:.4f}")
            else:
                print("❌ FEHLER: Keine Vorhersage zurückgegeben!")
        except Exception as e:
            print(f"❌ FEHLER bei Vorhersage: {e}")
            import traceback
            traceback.print_exc()
        
        # 5. Prüfe ob es Vorhersagen in der DB gibt
        print("\n" + "=" * 60)
        print("5. PRÜFE VORHERSAGEN IN DB")
        print("=" * 60)
        
        count_query = """
            SELECT COUNT(*) as count
            FROM predictions
            WHERE active_model_id = $1
        """
        count_row = await pool.fetchrow(count_query, 2)
        count = count_row['count'] if count_row else 0
        
        print(f"Anzahl Vorhersagen für Modell ID 2: {count}")
        
        if count > 0:
            latest_query = """
                SELECT coin_id, prediction, probability, created_at
                FROM predictions
                WHERE active_model_id = $1
                ORDER BY created_at DESC
                LIMIT 5
            """
            latest_rows = await pool.fetch(latest_query, 2)
            print("\nLetzte 5 Vorhersagen:")
            for row in latest_rows:
                print(f"   - Coin: {row['coin_id'][:20]}..., Prediction: {row['prediction']}, Probability: {row['probability']:.4f}, Zeit: {row['created_at']}")
        else:
            print("⚠️ Keine Vorhersagen in der DB für Modell ID 2")
        
    except Exception as e:
        print(f"\n❌ FEHLER: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await close_pool()

if __name__ == "__main__":
    asyncio.run(debug_model_2())

