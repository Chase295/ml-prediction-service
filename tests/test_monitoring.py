#!/usr/bin/env python3
"""
Test-Script für Monitoring und Event-Handler
Prüft ob:
1. Trigger existiert
2. Neue Einträge vorhanden sind
3. Event-Handler läuft
4. Vorhersagen erstellt werden
"""
import asyncio
import asyncpg
from datetime import datetime, timezone, timedelta
import os

DB_DSN = os.getenv("DB_DSN", "postgresql://postgres:Ycy0qfClGpXPbm3Vulz1jBL0OFfCojITnbST4JBYreS5RkBCTsYc2FkbgyUstE6g@100.76.209.59:5432/crypto")

async def test():
    print("="*60)
    print("🔍 Monitoring & Event-Handler Diagnose")
    print("="*60)
    
    conn = await asyncpg.connect(DB_DSN)
    
    try:
        # 1. Prüfe Trigger
        print("\n1️⃣ Prüfe Trigger...")
        trigger_exists = await conn.fetchval("""
            SELECT EXISTS(
                SELECT 1 FROM pg_trigger 
                WHERE tgname = 'coin_metrics_insert_trigger'
            )
        """)
        print(f"   Trigger existiert: {'✅' if trigger_exists else '❌'}")
        
        if trigger_exists:
            trigger_info = await conn.fetchrow("""
                SELECT tgname, tgenabled, tgrelid::regclass
                FROM pg_trigger 
                WHERE tgname = 'coin_metrics_insert_trigger'
            """)
            print(f"   Trigger Name: {trigger_info['tgname']}")
            print(f"   Enabled: {trigger_info['tgenabled']}")
            print(f"   Table: {trigger_info['tgrelid']}")
        
        # 2. Prüfe neue Einträge
        print("\n2️⃣ Prüfe neue Einträge...")
        now = datetime.now(timezone.utc)
        last_hour = now - timedelta(hours=1)
        last_day = now - timedelta(days=1)
        
        count_last_hour = await conn.fetchval("""
            SELECT COUNT(*) FROM coin_metrics 
            WHERE timestamp > $1
        """, last_hour)
        print(f"   Einträge (letzte Stunde): {count_last_hour}")
        
        count_last_day = await conn.fetchval("""
            SELECT COUNT(*) FROM coin_metrics 
            WHERE timestamp > $1
        """, last_day)
        print(f"   Einträge (letzte 24h): {count_last_day}")
        
        # Neuester Eintrag
        newest = await conn.fetchrow("""
            SELECT mint, timestamp, phase_id_at_time
            FROM coin_metrics 
            ORDER BY timestamp DESC 
            LIMIT 1
        """)
        if newest:
            print(f"   Neuester Eintrag: {newest['mint'][:20]}... am {newest['timestamp']}")
        else:
            print("   ⚠️ Keine Einträge in coin_metrics!")
        
        # 3. Prüfe aktive Modelle
        print("\n3️⃣ Prüfe aktive Modelle...")
        active_models = await conn.fetch("""
            SELECT id, model_id, model_name, is_active, total_predictions
            FROM prediction_active_models
            WHERE is_active = true
        """)
        print(f"   Aktive Modelle: {len(active_models)}")
        for m in active_models:
            print(f"   - {m['model_name']} (ID: {m['id']}, Predictions: {m['total_predictions']})")
        
        # 4. Prüfe Vorhersagen
        print("\n4️⃣ Prüfe Vorhersagen...")
        predictions_count = await conn.fetchval("SELECT COUNT(*) FROM predictions")
        print(f"   Gesamt Vorhersagen: {predictions_count}")
        
        recent_predictions = await conn.fetch("""
            SELECT coin_id, prediction, probability, created_at
            FROM predictions
            ORDER BY created_at DESC
            LIMIT 5
        """)
        if recent_predictions:
            print(f"   Neueste Vorhersagen:")
            for p in recent_predictions:
                print(f"   - {p['coin_id'][:20]}...: {p['prediction']} ({p['probability']:.2%}) am {p['created_at']}")
        else:
            print("   ⚠️ Keine Vorhersagen vorhanden!")
        
        # 5. Prüfe Webhook-Logs
        print("\n5️⃣ Prüfe Webhook-Logs...")
        webhook_logs = await conn.fetchval("SELECT COUNT(*) FROM prediction_webhook_log")
        print(f"   Webhook-Logs: {webhook_logs}")
        
        recent_webhooks = await conn.fetch("""
            SELECT coin_id, response_status, error_message, created_at
            FROM prediction_webhook_log
            ORDER BY created_at DESC
            LIMIT 5
        """)
        if recent_webhooks:
            print(f"   Neueste Webhook-Calls:")
            for w in recent_webhooks:
                status = w['response_status'] or 'ERROR'
                print(f"   - {w['coin_id'][:20]}...: Status {status} am {w['created_at']}")
                if w['error_message']:
                    print(f"     Error: {w['error_message'][:50]}")
        else:
            print("   ⚠️ Keine Webhook-Logs vorhanden!")
        
        # 6. Test: Manueller NOTIFY
        print("\n6️⃣ Test: Manueller NOTIFY...")
        try:
            await conn.execute("""
                SELECT pg_notify(
                    'coin_metrics_insert',
                    '{"mint":"TEST_COIN_123","timestamp":"2025-12-24T21:00:00Z","phase_id":1}'::text
                )
            """)
            print("   ✅ NOTIFY gesendet (sollte im Event-Handler ankommen)")
        except Exception as e:
            print(f"   ❌ Fehler beim Senden von NOTIFY: {e}")
        
    finally:
        await conn.close()
    
    print("\n" + "="*60)
    print("✅ Diagnose abgeschlossen")
    print("="*60)

if __name__ == "__main__":
    asyncio.run(test())

"""
Test-Script für Monitoring und Event-Handler
Prüft ob:
1. Trigger existiert
2. Neue Einträge vorhanden sind
3. Event-Handler läuft
4. Vorhersagen erstellt werden
"""
import asyncio
import asyncpg
from datetime import datetime, timezone, timedelta
import os

DB_DSN = os.getenv("DB_DSN", "postgresql://postgres:Ycy0qfClGpXPbm3Vulz1jBL0OFfCojITnbST4JBYreS5RkBCTsYc2FkbgyUstE6g@100.76.209.59:5432/crypto")

async def test():
    print("="*60)
    print("🔍 Monitoring & Event-Handler Diagnose")
    print("="*60)
    
    conn = await asyncpg.connect(DB_DSN)
    
    try:
        # 1. Prüfe Trigger
        print("\n1️⃣ Prüfe Trigger...")
        trigger_exists = await conn.fetchval("""
            SELECT EXISTS(
                SELECT 1 FROM pg_trigger 
                WHERE tgname = 'coin_metrics_insert_trigger'
            )
        """)
        print(f"   Trigger existiert: {'✅' if trigger_exists else '❌'}")
        
        if trigger_exists:
            trigger_info = await conn.fetchrow("""
                SELECT tgname, tgenabled, tgrelid::regclass
                FROM pg_trigger 
                WHERE tgname = 'coin_metrics_insert_trigger'
            """)
            print(f"   Trigger Name: {trigger_info['tgname']}")
            print(f"   Enabled: {trigger_info['tgenabled']}")
            print(f"   Table: {trigger_info['tgrelid']}")
        
        # 2. Prüfe neue Einträge
        print("\n2️⃣ Prüfe neue Einträge...")
        now = datetime.now(timezone.utc)
        last_hour = now - timedelta(hours=1)
        last_day = now - timedelta(days=1)
        
        count_last_hour = await conn.fetchval("""
            SELECT COUNT(*) FROM coin_metrics 
            WHERE timestamp > $1
        """, last_hour)
        print(f"   Einträge (letzte Stunde): {count_last_hour}")
        
        count_last_day = await conn.fetchval("""
            SELECT COUNT(*) FROM coin_metrics 
            WHERE timestamp > $1
        """, last_day)
        print(f"   Einträge (letzte 24h): {count_last_day}")
        
        # Neuester Eintrag
        newest = await conn.fetchrow("""
            SELECT mint, timestamp, phase_id_at_time
            FROM coin_metrics 
            ORDER BY timestamp DESC 
            LIMIT 1
        """)
        if newest:
            print(f"   Neuester Eintrag: {newest['mint'][:20]}... am {newest['timestamp']}")
        else:
            print("   ⚠️ Keine Einträge in coin_metrics!")
        
        # 3. Prüfe aktive Modelle
        print("\n3️⃣ Prüfe aktive Modelle...")
        active_models = await conn.fetch("""
            SELECT id, model_id, model_name, is_active, total_predictions
            FROM prediction_active_models
            WHERE is_active = true
        """)
        print(f"   Aktive Modelle: {len(active_models)}")
        for m in active_models:
            print(f"   - {m['model_name']} (ID: {m['id']}, Predictions: {m['total_predictions']})")
        
        # 4. Prüfe Vorhersagen
        print("\n4️⃣ Prüfe Vorhersagen...")
        predictions_count = await conn.fetchval("SELECT COUNT(*) FROM predictions")
        print(f"   Gesamt Vorhersagen: {predictions_count}")
        
        recent_predictions = await conn.fetch("""
            SELECT coin_id, prediction, probability, created_at
            FROM predictions
            ORDER BY created_at DESC
            LIMIT 5
        """)
        if recent_predictions:
            print(f"   Neueste Vorhersagen:")
            for p in recent_predictions:
                print(f"   - {p['coin_id'][:20]}...: {p['prediction']} ({p['probability']:.2%}) am {p['created_at']}")
        else:
            print("   ⚠️ Keine Vorhersagen vorhanden!")
        
        # 5. Prüfe Webhook-Logs
        print("\n5️⃣ Prüfe Webhook-Logs...")
        webhook_logs = await conn.fetchval("SELECT COUNT(*) FROM prediction_webhook_log")
        print(f"   Webhook-Logs: {webhook_logs}")
        
        recent_webhooks = await conn.fetch("""
            SELECT coin_id, response_status, error_message, created_at
            FROM prediction_webhook_log
            ORDER BY created_at DESC
            LIMIT 5
        """)
        if recent_webhooks:
            print(f"   Neueste Webhook-Calls:")
            for w in recent_webhooks:
                status = w['response_status'] or 'ERROR'
                print(f"   - {w['coin_id'][:20]}...: Status {status} am {w['created_at']}")
                if w['error_message']:
                    print(f"     Error: {w['error_message'][:50]}")
        else:
            print("   ⚠️ Keine Webhook-Logs vorhanden!")
        
        # 6. Test: Manueller NOTIFY
        print("\n6️⃣ Test: Manueller NOTIFY...")
        try:
            await conn.execute("""
                SELECT pg_notify(
                    'coin_metrics_insert',
                    '{"mint":"TEST_COIN_123","timestamp":"2025-12-24T21:00:00Z","phase_id":1}'::text
                )
            """)
            print("   ✅ NOTIFY gesendet (sollte im Event-Handler ankommen)")
        except Exception as e:
            print(f"   ❌ Fehler beim Senden von NOTIFY: {e}")
        
    finally:
        await conn.close()
    
    print("\n" + "="*60)
    print("✅ Diagnose abgeschlossen")
    print("="*60)

if __name__ == "__main__":
    asyncio.run(test())

