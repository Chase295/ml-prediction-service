/**
 * ModelImport Page
 * Importiert neue ML-Modelle aus dem Training-Service
 */
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Typography,
  Box,
  Card,
  CardContent,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Snackbar
} from '@mui/material';
import {
  CloudDownload as ImportIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

// Components
import PageContainer from '../components/layout/PageContainer';
import LoadingSpinner from '../components/common/LoadingSpinner';

// Services
import { modelsApi } from '../services/api';

interface AvailableModel {
  id: number;
  name: string;
  model_type: string;
  target_variable: string;
  target_operator?: string | null;
  target_value?: number | null;
  future_minutes: number;
  price_change_percent: number;
  target_direction: string;
  features: string[];
  phases?: number[] | null;
  training_accuracy?: number;
  training_f1?: number;
  created_at: string;
}

interface ImportResponse {
  active_model_id: number;
  model_id: number;
  model_name: string;
  local_model_path: string;
  message: string;
}

const ModelImport: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedModel, setSelectedModel] = useState<AvailableModel | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  // Verfügbare Modelle laden
  const { data: availableModels, isLoading, error, refetch } = useQuery<AvailableModel[], Error>({
    queryKey: ['available-models'],
    queryFn: modelsApi.getAvailable
  });

  // Bereits importierte Modelle laden
  const { data: activeModels } = useQuery({
    queryKey: ['models'],
    queryFn: modelsApi.getAll
  });

  // Import-Mutation
  const importMutation = useMutation<ImportResponse, Error, number>({
    mutationFn: (modelId: number) => modelsApi.importModel(modelId),
    onSuccess: (data) => {
      setSnackbar({
        open: true,
        message: data.message,
        severity: 'success'
      });
      setConfirmDialogOpen(false);
      setSelectedModel(null);
      // Refresh verfügbare Modelle und aktive Modelle
      queryClient.invalidateQueries({ queryKey: ['available-models'] });
      queryClient.invalidateQueries({ queryKey: ['models'] });
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: `Import fehlgeschlagen: ${error.message}`,
        severity: 'error'
      });
    }
  });

  const handleImportClick = (model: AvailableModel) => {
    setSelectedModel(model);
    setConfirmDialogOpen(true);
  };

  const handleConfirmImport = () => {
    if (selectedModel) {
      importMutation.mutate(selectedModel.id);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const isAlreadyImported = (modelId: number) => {
    return activeModels?.some(model => model.model_id === modelId);
  };

  const getModelTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      'random_forest': 'Random Forest',
      'xgboost': 'XGBoost',
      'neural_network': 'Neural Network',
      'svm': 'SVM'
    };
    return labels[type] || type;
  };

  const formatPercentage = (value: number | undefined): string => {
    if (value === undefined) return 'N/A';
    return `${(value * 100).toFixed(1)}%`;
  };

  if (isLoading) {
    return <LoadingSpinner message="Lade verfügbare Modelle..." />;
  }

  if (error) {
    return (
      <PageContainer>
        <Alert severity="error" sx={{ mb: 3 }}>
          Fehler beim Laden der verfügbaren Modelle: {error.message}
        </Alert>
      </PageContainer>
    );
  }

  const readyModels = availableModels || [];
  const trainingModels: AvailableModel[] = []; // Keine Training-Modelle von der API

  return (
    <PageContainer>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
            📥 Modell-Import
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Importiere neue ML-Modelle aus dem Training-Service in dein Prediction-System
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => refetch()}
          disabled={isLoading}
        >
          Aktualisieren
        </Button>
      </Box>

      {/* Bereits importierte Modelle Info */}
      {activeModels && activeModels.length > 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Du hast bereits {activeModels.length} Modell(e) importiert. Diese werden in der Übersicht nicht mehr angezeigt.
        </Alert>
      )}

      {/* Verfügbare Modelle */}
      {readyModels.length > 0 && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              ✅ Bereit zum Import ({readyModels.length})
            </Typography>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Typ</TableCell>
                    <TableCell>Training Accuracy</TableCell>
                    <TableCell>Training F1</TableCell>
                    <TableCell>Features</TableCell>
                    <TableCell>Ziel</TableCell>
                    <TableCell>Aktion</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {readyModels.map((model) => (
                    <TableRow key={model.id}>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {model.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ID: {model.id}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getModelTypeLabel(model.model_type)}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {formatPercentage(model.training_accuracy)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {formatPercentage(model.training_f1)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`${model.features.length} Features`}
                          size="small"
                          variant="outlined"
                          color="info"
                        />
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {model.target_direction?.toUpperCase()} {model.price_change_percent}%
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            in {model.future_minutes}min
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<ImportIcon />}
                          onClick={() => handleImportClick(model)}
                          disabled={isAlreadyImported(model.id)}
                        >
                          {isAlreadyImported(model.id) ? 'Bereits importiert' : 'Importieren'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Training Modelle */}
      {trainingModels.length > 0 && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              🔄 In Training ({trainingModels.length})
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Diese Modelle werden noch trainiert und sind noch nicht zum Import bereit.
            </Typography>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Typ</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Erstellt</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {trainingModels.map((model) => (
                    <TableRow key={model.id}>
                      <TableCell>{model.name}</TableCell>
                      <TableCell>
                        <Chip
                          label={getModelTypeLabel(model.model_type)}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label="Training"
                          size="small"
                          color="warning"
                          icon={<InfoIcon />}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(model.created_at).toLocaleDateString('de-DE')}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Keine Modelle verfügbar */}
      {readyModels.length === 0 && trainingModels.length === 0 && (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <InfoIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              Keine Modelle verfügbar
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Aktuell sind keine neuen Modelle zum Import verfügbar.
              Neue Modelle werden automatisch nach dem Training hier angezeigt.
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Confirm Import Dialog */}
      <Dialog
        open={confirmDialogOpen}
        onClose={() => !importMutation.isPending && setConfirmDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          📥 Modell importieren
        </DialogTitle>
        <DialogContent>
          {selectedModel && (
            <Box sx={{ pt: 1 }}>
              <Typography variant="body1" sx={{ mb: 2 }}>
                Möchtest du das Modell <strong>{selectedModel.name}</strong> wirklich importieren?
              </Typography>

              <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1, mb: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                  Modell-Details:
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
                  <Typography variant="caption">Typ: {getModelTypeLabel(selectedModel.model_type)}</Typography>
                  <Typography variant="caption">Accuracy: {formatPercentage(selectedModel.training_accuracy)}</Typography>
                  <Typography variant="caption">Features: {selectedModel.features.length}</Typography>
                  <Typography variant="caption">Zeitfenster: {selectedModel.future_minutes}min</Typography>
                </Box>
              </Box>

              <Alert severity="info" sx={{ mb: 2 }}>
                Nach dem Import ist das Modell sofort einsatzbereit und kann in der Übersicht aktiviert werden.
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setConfirmDialogOpen(false)}
            disabled={importMutation.isPending}
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleConfirmImport}
            variant="contained"
            disabled={importMutation.isPending}
            startIcon={importMutation.isPending ? <CircularProgress size={16} /> : <ImportIcon />}
          >
            {importMutation.isPending ? 'Importiere...' : 'Importieren'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </PageContainer>
  );
};

export default ModelImport;
