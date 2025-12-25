"""
Zentrale Konfiguration für ML Prediction Service

Liest alle Environment Variables und stellt Default-Werte bereit.
Wichtig für Docker-Deployment mit externer Datenbank.
"""
import os

# ============================================================
# Datenbank (EXTERNE DB!)
# ============================================================
DB_DSN = os.getenv("DB_DSN", "postgresql://user:pass@localhost:5432/crypto")

# ============================================================
# Ports
# ============================================================
API_PORT = int(os.getenv("API_PORT", "8000"))
STREAMLIT_PORT = int(os.getenv("STREAMLIT_PORT", "8501"))

# ============================================================
# Modell-Storage (lokal im Container)
# ============================================================
MODEL_STORAGE_PATH = os.getenv("MODEL_STORAGE_PATH", "/app/models")

# ============================================================
# Training Service API (für Modell-Download)
# ============================================================
TRAINING_SERVICE_API_URL = os.getenv("TRAINING_SERVICE_API_URL", "http://localhost:8000/api")

# ============================================================
# Event-Handling
# ============================================================
POLLING_INTERVAL_SECONDS = int(os.getenv("POLLING_INTERVAL_SECONDS", "30"))
BATCH_SIZE = int(os.getenv("BATCH_SIZE", "50"))
BATCH_TIMEOUT_SECONDS = int(os.getenv("BATCH_TIMEOUT_SECONDS", "5"))

# ============================================================
# Feature-Engineering
# ============================================================
FEATURE_HISTORY_SIZE = int(os.getenv("FEATURE_HISTORY_SIZE", "20"))

# ============================================================
# Performance
# ============================================================
MAX_CONCURRENT_PREDICTIONS = int(os.getenv("MAX_CONCURRENT_PREDICTIONS", "10"))
MODEL_CACHE_SIZE = int(os.getenv("MODEL_CACHE_SIZE", "10"))

# ============================================================
# n8n Integration
# ============================================================
N8N_WEBHOOK_URL = os.getenv("N8N_WEBHOOK_URL", None)  # Optional
N8N_WEBHOOK_TIMEOUT = int(os.getenv("N8N_WEBHOOK_TIMEOUT", "5"))  # Sekunden
DEFAULT_ALERT_THRESHOLD = float(os.getenv("DEFAULT_ALERT_THRESHOLD", "0.7"))  # 0.0 - 1.0

# ============================================================
# Logging
# ============================================================
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()  # DEBUG, INFO, WARNING, ERROR, CRITICAL
LOG_FORMAT = os.getenv("LOG_FORMAT", "text")  # "text" oder "json"
LOG_JSON_INDENT = int(os.getenv("LOG_JSON_INDENT", "0"))  # 0 = kompakt, 2+ = formatiert

