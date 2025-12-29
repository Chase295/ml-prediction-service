/**
 * Overview Page
 * Hauptübersicht aller ML-Modelle mit Live-Daten aus der API
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography,
  Box,
  Alert,
  Button,
  Chip,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Refresh as RefreshIcon, Add as AddIcon } from '@mui/icons-material';

// Components
import PageContainer from '../components/layout/PageContainer';
import ModelCard from '../components/models/ModelCard';
import LoadingSpinner from '../components/common/LoadingSpinner';

// Services
import { modelsApi } from '../services/api';
import { invalidateQueries } from '../services/queryClient';

const Overview: React.FC = () => {
  const navigate = useNavigate();

  // Models laden
  const {
    data: models,
    isLoading,
    error,
    refetch,
    isRefetching
  } = useQuery({
    queryKey: ['models'],
    queryFn: modelsApi.getAll,
    refetchInterval: 30000, // Alle 30 Sekunden aktualisieren
    staleTime: 10000 // 10 Sekunden als frisch betrachten
  });

  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [modelToDelete, setModelToDelete] = React.useState<{id: number, name: string} | null>(null);

  // Modell löschen
  const deleteMutation = useMutation({
    mutationFn: (modelId: number) => modelsApi.delete(modelId),
    onSuccess: () => {
      invalidateQueries.models(); // Cache invalidieren
      refetch(); // Sofort neu laden
      setDeleteDialogOpen(false);
      setModelToDelete(null);
    },
    onError: (error) => {
      console.error('Fehler beim Löschen des Modells:', error);
      setDeleteDialogOpen(false);
      setModelToDelete(null);
    }
  });

  // Modell aktivieren/deaktivieren
  const toggleActiveMutation = useMutation({
    mutationFn: ({ modelId, active }: { modelId: number; active: boolean }) =>
      modelsApi.toggleActive(modelId, active),
    onSuccess: () => {
      invalidateQueries.models(); // Cache invalidieren
      refetch(); // Sofort neu laden
    },
    onError: (error) => {
      console.error('Fehler beim Ändern des Modell-Status:', error);
    }
  });

  const handleToggleActive = (modelId: number, active: boolean) => {
    toggleActiveMutation.mutate({ modelId, active });
  };

  const handleDetailsClick = (modelId: number) => {
    navigate(`/model/${modelId}`);
  };

  const handleAlertConfigClick = (modelId: number) => {
    navigate(`/model/${modelId}/alert-config`);
  };

  const handleDeleteClick = (modelId: number, modelName: string) => {
    setModelToDelete({ id: modelId, name: modelName });
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (modelToDelete) {
      deleteMutation.mutate(modelToDelete.id);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setModelToDelete(null);
  };

  const handleRefresh = () => {
    refetch();
  };

  // Statistiken berechnen
  const stats = React.useMemo(() => {
    if (!models) return { total: 0, active: 0, inactive: 0 };

    return {
      total: models.length,
      active: models.filter(m => m.is_active).length,
      inactive: models.filter(m => !m.is_active).length
    };
  }, [models]);

  if (isLoading) {
    return <LoadingSpinner message="Modelle werden geladen..." />;
  }

  if (error) {
    return (
      <PageContainer>
        <Alert severity="error" sx={{ mb: 3 }}>
          Fehler beim Laden der Modelle: {error.message}
        </Alert>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={handleRefresh}
        >
          Erneut versuchen
        </Button>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            🔮 ML Modelle Übersicht
          </Typography>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={isRefetching}
            size="small"
          >
            {isRefetching ? 'Aktualisiere...' : 'Aktualisieren'}
          </Button>
        </Box>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Verwalten Sie Ihre Machine Learning Modelle für Krypto-Preisvorhersagen
        </Typography>

        {/* Statistiken */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Chip
            label={`${stats.total} Gesamt`}
            color="primary"
            variant="outlined"
          />
          <Chip
            label={`${stats.active} Aktiv`}
            color="success"
            variant="filled"
          />
          <Chip
            label={`${stats.inactive} Inaktiv`}
            color="default"
            variant="outlined"
          />
        </Box>
      </Box>

      {/* Modelle Grid */}
      {!models || models.length === 0 ? (
        <Card sx={{ textAlign: 'center', py: 6 }}>
          <CardContent>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Keine Modelle gefunden
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Es wurden noch keine ML-Modelle importiert oder konfiguriert.
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              size="large"
              onClick={() => navigate('/model-import')}
            >
              Modell importieren
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              lg: 'repeat(3, 1fr)'
            },
            gap: 3
          }}
        >
          {models.map((model) => (
            <ModelCard
              key={model.id}
              model={model}
              onDetailsClick={handleDetailsClick}
              onAlertConfigClick={handleAlertConfigClick}
              onToggleActive={handleToggleActive}
              onDelete={handleDeleteClick}
              isActivating={toggleActiveMutation.isPending && toggleActiveMutation.variables?.modelId === model.id}
              isDeactivating={toggleActiveMutation.isPending && toggleActiveMutation.variables?.modelId === model.id}
              isDeleting={deleteMutation.isPending && deleteMutation.variables === model.id}
            />
          ))}
        </Box>
      )}

      {/* Footer Info */}
      <Box sx={{ mt: 4, p: 2, backgroundColor: 'background.paper', borderRadius: 2 }}>
        <Typography variant="body2" color="text.secondary" align="center">
          Daten werden automatisch alle 30 Sekunden aktualisiert •
          Letzte Aktualisierung: {new Date().toLocaleTimeString()}
        </Typography>
      </Box>

      {/* Lösch-Bestätigung Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="delete-dialog-title"
      >
        <DialogTitle id="delete-dialog-title">
          Modell löschen?
        </DialogTitle>
        <DialogContent>
          <Typography>
            Bist du sicher, dass du das Modell "{modelToDelete?.name}" löschen möchtest?
            Diese Aktion kann nicht rückgängig gemacht werden.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} color="inherit">
            Abbrechen
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Wird gelöscht...' : 'Löschen'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default Overview;
