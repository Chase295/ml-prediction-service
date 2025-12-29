/**
 * JsonExportTab Component
 * Vollständige Modell-Daten als JSON exportieren
 */
import React from 'react';
import {
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip
} from '@mui/material';
import {
  Download as DownloadIcon,
  ExpandMore as ExpandIcon,
  Code as CodeIcon,
  ContentCopy as CopyIcon
} from '@mui/icons-material';
import type { Model } from '../../types/model';

interface JsonExportTabProps {
  model: Model;
}

const JsonExportTab: React.FC<JsonExportTabProps> = ({ model }) => {
  const [copied, setCopied] = React.useState(false);

  // JSON-String für Anzeige formatieren
  const jsonString = React.useMemo(() => {
    return JSON.stringify(model, null, 2);
  }, [model]);

  // Download-Funktion
  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `model_${model.id}_${model.name}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Copy-Funktion
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Fehler beim Kopieren:', error);
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
        📋 JSON Export
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Vollständige Modell-Daten als JSON exportieren oder kopieren
      </Typography>

      {/* Export-Buttons */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          onClick={handleDownload}
          size="large"
        >
          JSON herunterladen
        </Button>

        <Button
          variant="outlined"
          startIcon={<CopyIcon />}
          onClick={handleCopy}
          size="large"
          color={copied ? 'success' : 'primary'}
        >
          {copied ? 'Kopiert!' : 'JSON kopieren'}
        </Button>
      </Box>

      {/* Info-Alert */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <strong>Hinweis:</strong> Diese JSON-Datei enthält alle verfügbaren Modell-Informationen
        einschließlich Konfiguration, Metriken und Feature-Liste. Verwenden Sie diese Daten für
        Backups, Analysen oder die Übertragung zu anderen Systemen.
      </Alert>

      {/* JSON-Viewer */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <CodeIcon sx={{ mr: 1, color: 'action.main' }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Modell-Daten (JSON)
            </Typography>
          </Box>

          {/* Erweiterte Ansicht für große JSONs */}
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandIcon />}>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                Vollständige JSON-Daten anzeigen
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                ({jsonString.length} Zeichen)
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
              <Box
                component="pre"
                sx={{
                  backgroundColor: 'grey.900',
                  color: 'grey.100',
                  p: 2,
                  borderRadius: 1,
                  fontSize: '0.875rem',
                  fontFamily: 'monospace',
                  overflow: 'auto',
                  maxHeight: 600,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all'
                }}
              >
                {jsonString}
              </Box>
            </AccordionDetails>
          </Accordion>

          {/* Zusammenfassung */}
          <Box sx={{ mt: 3, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              📊 Zusammenfassung
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
              <Box>
                <Typography variant="body2" color="text.secondary">Modell-ID</Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>{model.id}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">Name</Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>{model.name}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">Typ</Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>{model.model_type}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">Features</Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>{model.features?.length || 0}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">Vorhersagen</Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>{model.total_predictions || 0}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">Status</Typography>
                <Chip
                  size="small"
                  label={model.is_active ? 'Aktiv' : 'Inaktiv'}
                  color={model.is_active ? 'success' : 'default'}
                />
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default JsonExportTab;
