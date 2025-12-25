# 🏠 Lokales Setup - ML Prediction Service

## Quick Start

```bash
cd ml-prediction-service

# 1. .env Datei prüfen (sollte bereits existieren)
cat .env

# 2. Container starten
docker-compose -f docker-compose.local.yml up -d

# 3. Logs ansehen
docker-compose -f docker-compose.local.yml logs -f

# 4. Health Check
curl http://localhost:8000/api/health

# 5. Container stoppen
docker-compose -f docker-compose.local.yml down
```

## URLs

- **FastAPI API:** http://localhost:8000
- **API Docs (Swagger):** http://localhost:8000/docs
- **Streamlit UI:** http://localhost:8501

## Wichtige Befehle

```bash
# Logs live ansehen
docker-compose -f docker-compose.local.yml logs -f

# Container neu bauen (nach Code-Änderungen)
docker-compose -f docker-compose.local.yml build
docker-compose -f docker-compose.local.yml up -d

# Container stoppen
docker-compose -f docker-compose.local.yml down

# Container neu starten
docker-compose -f docker-compose.local.yml restart

# In Container einloggen
docker exec -it ml-prediction-service bash
```

## Environment Variables

Die `.env` Datei enthält alle notwendigen Konfigurationen:
- `DB_DSN` - Externe Datenbank-Verbindung
- `TRAINING_SERVICE_API_URL` - URL zum Training Service
- `N8N_WEBHOOK_URL` - n8n Webhook (optional)
- `PORT` / `STREAMLIT_PORT` - Lokale Ports (8000/8501)

## Debugging

```bash
# Logs filtern
docker-compose -f docker-compose.local.yml logs | grep ERROR
docker-compose -f docker-compose.local.yml logs | grep "Import-Anfrage"

# Container Status
docker-compose -f docker-compose.local.yml ps

# Container Ressourcen
docker stats ml-prediction-service
```

## Code-Änderungen

Nach Code-Änderungen:
1. Container neu bauen: `docker-compose -f docker-compose.local.yml build`
2. Container neu starten: `docker-compose -f docker-compose.local.yml up -d`
3. Logs prüfen: `docker-compose -f docker-compose.local.yml logs -f`

