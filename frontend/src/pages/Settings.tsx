import React from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Typography,
  Paper,
  Box,
  TextField,
  Button,
  Alert
} from '@mui/material';
import { RestartAlt as RestartIcon } from '@mui/icons-material';
import PageContainer from '../components/layout/PageContainer';

// Services
import { modelsApi } from '../services/api';

const Settings: React.FC = () => {
  const [apiUrl, setApiUrl] = React.useState('http://localhost:8000/api');
  const [trainingServiceUrl, setTrainingServiceUrl] = React.useState('http://ml-training-service:8000/api');
  const [dbDsn, setDbDsn] = React.useState('postgresql://user:pass@localhost:5432/crypto');
  const [saved, setSaved] = React.useState(false);

  // Service neu starten
  const restartMutation = useMutation({
    mutationFn: modelsApi.restartService,
    onSuccess: (data) => {
      console.log('Service restart requested:', data);
    },
    onError: (error) => {
      console.error('Fehler beim Service-Neustart:', error);
    }
  });

  const handleSave = () => {
    // Hier könnten die Einstellungen gespeichert werden
    localStorage.setItem('apiUrl', apiUrl);
    localStorage.setItem('trainingServiceUrl', trainingServiceUrl);
    localStorage.setItem('dbDsn', dbDsn);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    setApiUrl('http://localhost:8000/api');
    setTrainingServiceUrl('http://ml-training-service:8000/api');
    setDbDsn('postgresql://user:pass@localhost:5432/crypto');
    localStorage.removeItem('apiUrl');
    localStorage.removeItem('trainingServiceUrl');
    localStorage.removeItem('dbDsn');
  };

  const handleRestart = () => {
    restartMutation.mutate();
  };

  React.useEffect(() => {
    // Lade gespeicherte Einstellungen
    const savedApiUrl = localStorage.getItem('apiUrl');
    const savedTrainingServiceUrl = localStorage.getItem('trainingServiceUrl');
    const savedDbDsn = localStorage.getItem('dbDsn');

    if (savedApiUrl) setApiUrl(savedApiUrl);
    if (savedTrainingServiceUrl) setTrainingServiceUrl(savedTrainingServiceUrl);
    if (savedDbDsn) setDbDsn(savedDbDsn);
  }, []);

  return (
    <PageContainer>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Einstellungen
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Konfiguriere die Anwendung nach deinen Bedürfnissen
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, mb: 3 }}>
        {/* API Einstellungen */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            API-Konfiguration
          </Typography>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="API-Basis-URL"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              variant="outlined"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Training-Service-URL"
              value={trainingServiceUrl}
              onChange={(e) => setTrainingServiceUrl(e.target.value)}
              variant="outlined"
              sx={{ mb: 2 }}
              helperText="URL zum Training-Service für Modell-Downloads"
            />
            <Alert severity="info" sx={{ mb: 2 }}>
              Änderungen an den API-URLs erfordern einen Neustart der Anwendung.
            </Alert>
          </Box>
        </Paper>
      </Box>

      {/* Datenbank Einstellungen */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Datenbank-Konfiguration
        </Typography>
        <Box sx={{ mt: 2 }}>
          <TextField
            fullWidth
            label="Datenbank-Verbindungsstring"
            value={dbDsn}
            onChange={(e) => setDbDsn(e.target.value)}
            variant="outlined"
            sx={{ mb: 2 }}
            helperText="PostgreSQL DSN (nur für Entwicklung/Tests)"
          />
          <Alert severity="warning" sx={{ mb: 0 }}>
            <strong>⚠️ Sicherheitshinweis:</strong> Datenbank-Verbindungsdaten sollten normalerweise nicht über die Web-UI geändert werden. Verwenden Sie Environment-Variablen in der Produktion.
          </Alert>
        </Box>
      </Paper>

      {/* Speichern-Buttons */}
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSave}
            size="large"
          >
            Einstellungen speichern
          </Button>
          <Button
            variant="outlined"
            onClick={handleReset}
            size="large"
          >
            Auf Standard zurücksetzen
          </Button>
          <Button
            variant="contained"
            color="warning"
            startIcon={<RestartIcon />}
            onClick={handleRestart}
            disabled={restartMutation.isPending}
            size="large"
          >
            {restartMutation.isPending ? 'Starte neu...' : 'Service neu starten'}
          </Button>

          {saved && (
            <Alert severity="success" sx={{ ml: 2 }}>
              Einstellungen gespeichert!
            </Alert>
          )}

          {restartMutation.isSuccess && (
            <Alert severity="info" sx={{ ml: 2 }}>
              <strong>Service-Neustart erforderlich!</strong><br/>
              Führen Sie aus: <code>./restart_service.sh</code><br/>
              Oder: <code>pkill -f uvicorn && python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload</code>
            </Alert>
          )}

          {restartMutation.isError && (
            <Alert severity="error" sx={{ ml: 2 }}>
              Fehler beim Neustart: {restartMutation.error?.message}
            </Alert>
          )}
        </Box>
      </Paper>
    </PageContainer>
  );
};

export default Settings;
