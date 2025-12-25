# 📥 Modell-Import Anleitung

## ⚠️ WICHTIG: Modelle müssen importiert werden!

Die Modell-Dateien (`.pkl`) werden **nicht automatisch** heruntergeladen. Sie müssen manuell importiert werden, bevor sie für Vorhersagen verwendet werden können.

## 🔍 Problem erkennen

Wenn du diesen Fehler siehst:
```
FileNotFoundError: Modell-Datei nicht gefunden: /app/models/model_X.pkl
```

Dann fehlt die Modell-Datei im Container.

## ✅ Lösung: Modell importieren

### Option 1: Über die Streamlit UI (Empfohlen)

1. Öffne die Streamlit UI: `http://localhost:8502` (oder deine Coolify-URL)
2. Gehe zu **"📥 Modell importieren"**
3. Wähle das Modell aus der Liste
4. Klicke auf **"📥 Modell importieren"**
5. Das Modell wird automatisch vom Training Service heruntergeladen

### Option 2: Über die API

```bash
# 1. Verfügbare Modelle anzeigen
curl http://localhost:8006/api/models/available

# 2. Modell importieren (z.B. Modell ID 1)
curl -X POST http://localhost:8006/api/models/import \
  -H "Content-Type: application/json" \
  -d '{
    "model_id": 1
  }'
```

**Response:**
```json
{
  "active_model_id": 1,
  "model_id": 1,
  "model_name": "Finale",
  "local_model_path": "/app/models/model_1.pkl",
  "message": "Modell 1 erfolgreich importiert"
}
```

### Option 3: Über n8n

Siehe `API_BEISPIELE.md` für n8n-Workflow-Beispiele.

## 🔄 Automatischer Import (Optional)

Falls du möchtest, dass Modelle automatisch importiert werden, wenn sie in der Datenbank aktiv sind, kannst du ein Startup-Script erstellen.

## 📋 Checkliste nach Deployment

- [ ] Training Service ist erreichbar (`TRAINING_SERVICE_API_URL` ist korrekt)
- [ ] Modelle sind im Training Service vorhanden
- [ ] Modelle wurden über UI oder API importiert
- [ ] Modell-Dateien existieren in `/app/models/` (im Container)
- [ ] Modelle sind in `prediction_active_models` als `is_active=true` markiert

## 🐛 Troubleshooting

### "Modell-Datei nicht gefunden"

**Ursache:** Modell wurde nie importiert oder Datei wurde gelöscht.

**Lösung:**
1. Prüfe ob Modell im Training Service existiert
2. Importiere das Modell erneut über UI oder API
3. Prüfe ob `TRAINING_SERVICE_API_URL` korrekt ist

### "Modell-Download fehlgeschlagen"

**Ursache:** Training Service ist nicht erreichbar oder Modell existiert nicht.

**Lösung:**
1. Prüfe `TRAINING_SERVICE_API_URL` Environment Variable
2. Teste Verbindung: `curl http://TRAINING_SERVICE_API_URL/health`
3. Prüfe ob Modell im Training Service existiert

### "Modell bereits importiert"

**Ursache:** Modell wurde bereits importiert, aber Datei fehlt.

**Lösung:**
1. Lösche den Eintrag in `prediction_active_models` (über API oder DB)
2. Importiere das Modell erneut

## 📚 Weitere Informationen

- Siehe `API_BEISPIELE.md` für API-Beispiele
- Siehe `README.md` für allgemeine Informationen

