# ML Prediction Service Dockerfile
# Python 3.11-slim mit FastAPI
FROM python:3.11-slim

WORKDIR /app

# System-Dependencies installieren
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl supervisor && \
    rm -rf /var/lib/apt/lists/*

# Installiere Build-Dependencies für ML-Pakete
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Python Dependencies installieren
COPY requirements.txt .
RUN pip install --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r requirements.txt

# App-Code kopieren
COPY app/ ./app/

# Models-Verzeichnis erstellen (wird als Volume gemappt)
RUN mkdir -p /app/models

# Log-Verzeichnis erstellen
RUN mkdir -p /app/logs && chmod 777 /app/logs

# Supervisor Config für FastAPI + Streamlit
RUN printf '[supervisord]\n\
nodaemon=true\n\
\n\
[program:fastapi]\n\
command=uvicorn app.main:app --host 0.0.0.0 --port 8000\n\
directory=/app\n\
autostart=true\n\
autorestart=true\n\
stderr_logfile=/app/logs/fastapi.log\n\
stderr_logfile_maxbytes=50MB\n\
stderr_logfile_backups=5\n\
stdout_logfile=/app/logs/fastapi.log\n\
stdout_logfile_maxbytes=50MB\n\
stdout_logfile_backups=5\n\
\n\
[program:event-handler]\n\
command=python -m app.prediction.event_handler\n\
directory=/app\n\
autostart=true\n\
autorestart=true\n\
stderr_logfile=/app/logs/event_handler.log\n\
stderr_logfile_maxbytes=50MB\n\
stderr_logfile_backups=5\n\
stdout_logfile=/app/logs/event_handler.log\n\
stdout_logfile_maxbytes=50MB\n\
stdout_logfile_backups=5\n\
\n\
[program:streamlit]\n\
command=streamlit run app/streamlit_app.py --server.port 8501 --server.address 0.0.0.0 --server.headless=true\n\
directory=/app\n\
autostart=true\n\
autorestart=true\n\
stderr_logfile=/app/logs/streamlit.log\n\
stderr_logfile_maxbytes=50MB\n\
stderr_logfile_backups=5\n\
stdout_logfile=/app/logs/streamlit.log\n\
stdout_logfile_maxbytes=50MB\n\
stdout_logfile_backups=5\n\
' > /etc/supervisor/conf.d/supervisord.conf

# Ports freigeben
EXPOSE 8000 8501

# Health Check
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=5 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# Graceful Shutdown
STOPSIGNAL SIGTERM

# Start Supervisor (startet FastAPI)
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]

