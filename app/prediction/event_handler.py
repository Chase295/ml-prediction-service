"""
Event-Handler für ML Prediction Service

Überwacht coin_metrics für neue Einträge und macht automatisch Vorhersagen.
Unterstützt LISTEN/NOTIFY (Echtzeit) und Polling-Fallback.
"""
import asyncio
import json
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
import asyncpg
from app.database.connection import get_pool, DB_DSN
from app.database.models import get_active_models, save_prediction
from app.prediction.engine import predict_coin_all_models
from app.prediction.n8n_client import send_to_n8n
from app.utils.config import POLLING_INTERVAL_SECONDS, BATCH_SIZE, BATCH_TIMEOUT_SECONDS
from app.utils.logging_config import get_logger

logger = get_logger(__name__)


class EventHandler:
    """Event-Handler mit LISTEN/NOTIFY und Polling-Fallback"""
    
    def __init__(self):
        self.listener_connection: Optional[asyncpg.Connection] = None
        self.use_listen_notify = True
        self.batch: List[Dict[str, Any]] = []
        self.batch_lock = asyncio.Lock()
        self.last_batch_time = datetime.now(timezone.utc)
        self.running = False
        self.active_models: List[Dict[str, Any]] = []
        self.last_models_update = datetime.now(timezone.utc)
        self.notification_queue: Optional[asyncio.Queue] = None
    
    async def setup_listener(self):
        """Setup LISTEN/NOTIFY Listener"""
        try:
            # Separate Connection für LISTEN (kann nicht über Pool sein)
            self.listener_connection = await asyncpg.connect(DB_DSN)
            
            # ⚠️ WICHTIG: asyncpg's add_listener benötigt eine sync Funktion
            # Aber wir müssen async Code ausführen - nutze eine Queue!
            self.notification_queue = asyncio.Queue()
            
            # Listener-Funktion (MUSS synchron sein für asyncpg!)
            def notification_handler(conn, pid, channel, payload):
                """Wird aufgerufen wenn NOTIFY empfangen wird - LIVE!"""
                try:
                    logger.info(f"🔔🔔🔔 LIVE NOTIFY empfangen! Channel={channel}, PID={pid}")
                    logger.info(f"📦 Payload: {payload}")
                    
                    # Parse JSON
                    data = json.loads(payload)
                    coin_id = data.get('mint', 'UNKNOWN')[:20]
                    timestamp = data.get('timestamp', 'N/A')
                    logger.info(f"🪙 Neuer Coin-Eintrag LIVE: {coin_id}... am {timestamp}")
                    
                    # Füge zu Queue hinzu (thread-safe)
                    # ⚠️ WICHTIG: notification_handler ist sync, aber Queue.put() ist async
                    # Nutze call_soon_threadsafe um async Task im Event Loop zu erstellen
                    try:
                        loop = asyncio.get_event_loop()
                        if loop.is_running():
                            # Loop läuft - nutze call_soon_threadsafe für async Operation
                            def put_in_queue():
                                try:
                                    asyncio.create_task(self.notification_queue.put(data))
                                except Exception as e:
                                    logger.error(f"❌ Fehler beim Erstellen der Queue-Task: {e}")
                            loop.call_soon_threadsafe(put_in_queue)
                            logger.debug(f"✅ Event zu Queue hinzugefügt für Coin {coin_id}...")
                        else:
                            # Loop läuft nicht - direkt put (sollte nicht passieren)
                            asyncio.run(self.notification_queue.put(data))
                            logger.debug(f"✅ Event zu Queue hinzugefügt (run) für Coin {coin_id}...")
                    except RuntimeError as e:
                        # Kein Event Loop - erstelle neuen
                        logger.warning(f"⚠️ Kein Event Loop, erstelle neuen: {e}")
                        try:
                            loop = asyncio.new_event_loop()
                            asyncio.set_event_loop(loop)
                            loop.run_until_complete(self.notification_queue.put(data))
                            logger.debug(f"✅ Event zu Queue hinzugefügt (neuer Loop) für Coin {coin_id}...")
                        except Exception as e2:
                            logger.error(f"❌ Fehler beim Erstellen neues Loop: {e2}")
                except Exception as e:
                    logger.error(f"❌ Fehler beim Verarbeiten von Notification: {e}", exc_info=True)
            
            # Listener registrieren
            await self.listener_connection.add_listener(
                'coin_metrics_insert',
                notification_handler
            )
            
            # LISTEN aktivieren
            await self.listener_connection.execute("LISTEN coin_metrics_insert")
            
            logger.info("✅ LISTEN/NOTIFY aktiviert")
            self.use_listen_notify = True
            
            # Starte Queue-Processor (verarbeitet Events aus Queue)
            asyncio.create_task(self._process_notification_queue())
            
        except Exception as e:
            logger.warning(f"⚠️ LISTEN/NOTIFY nicht verfügbar: {e}", exc_info=True)
            logger.info("→ Fallback auf Polling")
            self.use_listen_notify = False
    
    async def _process_notification_queue(self):
        """Verarbeitet Events aus der Notification-Queue"""
        logger.info("🔄 Notification-Queue-Processor gestartet")
        while self.running:
            try:
                # Warte auf Event (mit Timeout)
                event_data = await asyncio.wait_for(
                    self.notification_queue.get(),
                    timeout=1.0
                )
                logger.debug(f"📥 Event aus Queue geholt: {event_data.get('mint', 'UNKNOWN')[:20]}...")
                await self.add_to_batch(event_data)
            except asyncio.TimeoutError:
                # Timeout ist OK - nur prüfen ob noch running
                continue
            except Exception as e:
                logger.error(f"❌ Fehler im Queue-Processor: {e}", exc_info=True)
    
    async def add_to_batch(self, event_data: Dict[str, Any]):
        """Fügt Event zu Batch hinzu"""
        should_process = False
        batch_to_process = None
        
        async with self.batch_lock:
            # Wenn Batch leer war, setze last_batch_time neu (Start des neuen Batches)
            if not self.batch:
                self.last_batch_time = datetime.now(timezone.utc)
            
            self.batch.append(event_data)
            logger.debug(f"📥 Event zu Batch hinzugefügt (Batch-Größe: {len(self.batch)})")
            
            # Prüfe ob Batch voll
            if len(self.batch) >= BATCH_SIZE:
                logger.info(f"📦 Batch voll ({len(self.batch)} Einträge), verarbeite sofort")
                batch_to_process = self.batch.copy()
                self.batch.clear()
                self.last_batch_time = datetime.now(timezone.utc)
                should_process = True
        
        # ⚠️ WICHTIG: Verarbeite Batch AUSSERHALB des Locks!
        if should_process and batch_to_process:
            logger.info(f"🔄 Verarbeite Batch: {len(batch_to_process)} Einträge")
            await self._process_coin_entries(batch_to_process)
    
    async def process_batch(self):
        """Verarbeitet aktuellen Batch"""
        async with self.batch_lock:
            if not self.batch:
                return
            
            batch_to_process = self.batch.copy()
            self.batch.clear()
            self.last_batch_time = datetime.now(timezone.utc)
        
        logger.info(f"🔄 Verarbeite Batch: {len(batch_to_process)} Einträge")
        # Verarbeite Batch
        await self._process_coin_entries(batch_to_process)
    
    async def _process_coin_entries(self, coin_entries: List[Dict[str, Any]]):
        """
        Verarbeitet Liste von Coin-Einträgen.
        
        Args:
            coin_entries: Liste von Dicts mit 'mint' und 'timestamp'
        """
        pool = await get_pool()
        
        # Aktualisiere aktive Modelle (alle 10 Sekunden - für n8n Einstellungen wichtig!)
        now = datetime.now(timezone.utc)
        if (now - self.last_models_update).total_seconds() > 10:
            try:
                self.active_models = await get_active_models()
                self.last_models_update = now
                logger.debug(f"✅ Aktive Modelle aktualisiert: {len(self.active_models)} Modelle")
                # Debug: Zeige n8n_enabled Status
                for m in self.active_models:
                    logger.debug(f"  - Modell {m.get('id')}: n8n_enabled={m.get('n8n_enabled')}, n8n_url={m.get('n8n_webhook_url')}")
            except Exception as e:
                logger.error(f"❌ Fehler beim Aktualisieren aktiver Modelle: {e}")
        
        if not self.active_models:
            logger.warning("⚠️ Keine aktiven Modelle - überspringe Vorhersagen")
            return
        
        # Verarbeite jeden Coin
        model_names = [m.get('custom_name') or m.get('name', 'Unknown') for m in self.active_models]
        logger.info(f"📊 Verarbeite {len(coin_entries)} Coin-Einträge mit {len(self.active_models)} aktiven Modellen: {', '.join(model_names)}")
        for entry in coin_entries:
            coin_id = entry.get('mint')
            timestamp_str = entry.get('timestamp')
            
            if not coin_id or not timestamp_str:
                logger.warning(f"⚠️ Ungültiger Eintrag: {entry}")
                continue
            
            logger.debug(f"🪙 Verarbeite Coin: {coin_id[:20]}... am {timestamp_str}")
            
            # Parse timestamp
            try:
                if isinstance(timestamp_str, str):
                    timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                else:
                    timestamp = timestamp_str
                
                if timestamp.tzinfo is None:
                    timestamp = timestamp.replace(tzinfo=timezone.utc)
            except Exception as e:
                logger.error(f"❌ Fehler beim Parsen von Timestamp: {e}")
                continue
            
            try:
                logger.info(f"🔮 Starte Vorhersagen für Coin {coin_id[:20]}... mit {len(self.active_models)} Modellen")
                # Mache Vorhersagen mit allen Modellen
                results = await predict_coin_all_models(
                    coin_id=coin_id,
                    timestamp=timestamp,
                    active_models=self.active_models,
                    pool=pool
                )
                
                logger.info(f"✅ {len(results)} Vorhersagen erstellt für Coin {coin_id[:20]}...")
                
                # Speichere Vorhersagen in DB
                for result in results:
                    try:
                        await save_prediction(
                            coin_id=coin_id,
                            data_timestamp=timestamp,
                            model_id=result['model_id'],
                            active_model_id=result.get('active_model_id'),
                            prediction=result['prediction'],
                            probability=result['probability'],
                            phase_id_at_time=entry.get('phase_id'),
                            prediction_duration_ms=None  # Wird später hinzugefügt
                        )
                    except Exception as e:
                        logger.error(f"❌ Fehler beim Speichern der Vorhersage: {e}")
                
                # Sende ALLE Vorhersagen an n8n (nicht nur Alerts!)
                if results:
                    logger.info(f"📤 Rufe send_to_n8n auf mit {len(results)} Vorhersagen und {len(self.active_models)} aktiven Modellen")
                    result = await send_to_n8n(
                        coin_id=coin_id,
                        timestamp=timestamp,
                        predictions=results,
                        active_models=self.active_models
                    )
                    logger.info(f"📤 send_to_n8n Ergebnis: {result}")
                else:
                    logger.warning(f"⚠️ Keine Vorhersagen-Ergebnisse für Coin {coin_id[:8]}... - nichts an n8n zu senden")
                
            except Exception as e:
                logger.error(
                    f"❌ Fehler bei Verarbeitung von Coin {coin_id[:8]}...: {e}",
                    exc_info=True
                )
                continue
    
    async def start_polling_fallback(self):
        """Polling-Fallback wenn LISTEN/NOTIFY nicht verfügbar"""
        pool = await get_pool()
        # Starte mit Einträgen der letzten 5 Minuten (nicht 1 Stunde, um nicht zu viele zu verarbeiten)
        last_processed_timestamp = datetime.now(timezone.utc) - timedelta(minutes=5)
        
        logger.info(f"🔄 Starte Polling-Fallback (Intervall: {POLLING_INTERVAL_SECONDS}s, Start: {last_processed_timestamp})")
        
        while self.running:
            try:
                # Hole aktive Modelle (periodisch aktualisieren)
                self.active_models = await get_active_models()
                
                if not self.active_models:
                    logger.warning("⚠️ Keine aktiven Modelle gefunden")
                    await asyncio.sleep(POLLING_INTERVAL_SECONDS)
                    continue
                
                # Hole neue Einträge
                query = """
                    SELECT DISTINCT mint, MAX(timestamp) as latest_timestamp, MAX(phase_id_at_time) as phase_id
                    FROM coin_metrics
                    WHERE timestamp > $1
                    GROUP BY mint
                    ORDER BY latest_timestamp ASC
                    LIMIT $2
                """
                rows = await pool.fetch(query, last_processed_timestamp, BATCH_SIZE)
                
                if rows:
                    logger.info(f"📥 Polling: {len(rows)} neue Einträge gefunden (seit {last_processed_timestamp})")
                    events = [
                        {
                            'mint': row['mint'],
                            'timestamp': row['latest_timestamp'],
                            'phase_id': row['phase_id']
                        }
                        for row in rows
                    ]
                    await self._process_coin_entries(events)
                    last_processed_timestamp = max(e['timestamp'] for e in events)
                    logger.debug(f"✅ Polling: Verarbeitet bis {last_processed_timestamp}")
                else:
                    logger.debug(f"📭 Polling: Keine neuen Einträge seit {last_processed_timestamp}")
                
                await asyncio.sleep(POLLING_INTERVAL_SECONDS)
                
            except Exception as e:
                logger.error(f"❌ Fehler im Polling-Loop: {e}", exc_info=True)
                await asyncio.sleep(POLLING_INTERVAL_SECONDS)
    
    async def start(self):
        """Startet Event-Handler"""
        self.running = True
        
        # Lade aktive Modelle
        try:
            self.active_models = await get_active_models()
            logger.info(f"✅ {len(self.active_models)} aktive Modelle geladen")
        except Exception as e:
            logger.error(f"❌ Fehler beim Laden aktiver Modelle: {e}")
            self.active_models = []
        
        # Versuche LISTEN/NOTIFY
        await self.setup_listener()
        
        if self.use_listen_notify:
            # LISTEN/NOTIFY aktiv - warte auf Notifications
            logger.info("✅ Event-Handler gestartet (LISTEN/NOTIFY - LIVE)")
            
            # Starte Background-Task für Batch-Verarbeitung (falls Timeout erreicht)
            asyncio.create_task(self._batch_timeout_loop())
            
            # ⚠️ WICHTIG: asyncpg LISTEN benötigt eine aktive Connection
            # Die Connection muss "am Leben" bleiben, um Events zu empfangen
            # Wir nutzen eine Endlosschleife die die Connection prüft
            try:
                logger.info("👂 Warte auf NOTIFY-Events von coin_metrics...")
                while self.running:
                    # Prüfe ob Connection noch aktiv ist
                    if self.listener_connection.is_closed():
                        logger.warning("⚠️ LISTEN-Connection geschlossen, versuche Reconnect...")
                        await self.setup_listener()
                        if not self.use_listen_notify:
                            logger.error("❌ Reconnect fehlgeschlagen, wechsle zu Polling")
                            break
                    
                    # Warte kurz (Connection bleibt aktiv für NOTIFY)
                    await asyncio.sleep(1)
                    
            except Exception as e:
                logger.error(f"❌ Fehler in LISTEN-Loop: {e}", exc_info=True)
                self.use_listen_notify = False
                logger.info("→ Fallback auf Polling")
                await self.start_polling_fallback()
        else:
            # Fallback: Polling
            logger.warning("⚠️ LISTEN/NOTIFY nicht verfügbar, nutze Polling-Fallback")
            await self.start_polling_fallback()
    
    async def _batch_timeout_loop(self):
        """Background-Task für Batch-Timeout"""
        logger.debug("⏰ Batch-Timeout-Loop gestartet")
        while self.running:
            await asyncio.sleep(BATCH_TIMEOUT_SECONDS)
            
            batch_to_process = None
            async with self.batch_lock:
                if self.batch:
                    time_since_last = (datetime.now(timezone.utc) - self.last_batch_time).total_seconds()
                    if time_since_last >= BATCH_TIMEOUT_SECONDS:
                        logger.info(f"⏰ Batch-Timeout erreicht ({time_since_last:.1f}s), verarbeite {len(self.batch)} Einträge")
                        batch_to_process = self.batch.copy()
                        self.batch.clear()
                        self.last_batch_time = datetime.now(timezone.utc)
            
            # ⚠️ WICHTIG: Verarbeite Batch AUSSERHALB des Locks!
            if batch_to_process:
                logger.info(f"🔄 Verarbeite Batch (Timeout): {len(batch_to_process)} Einträge")
                await self._process_coin_entries(batch_to_process)
    
    async def stop(self):
        """Stoppt Event-Handler"""
        self.running = False
        
        # Verarbeite verbleibenden Batch
        if self.batch:
            await self.process_batch()
        
        # Schließe LISTEN-Connection
        if self.listener_connection and not self.listener_connection.is_closed():
            await self.listener_connection.close()
            logger.info("✅ LISTEN-Connection geschlossen")
        
        logger.info("✅ Event-Handler gestoppt")


