/**
 * ModelDetails Page
 * Vollständige Detailansicht eines ML-Modells mit Tabs
 */
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Typography,
  Box,
  Tabs,
  Tab,
  Breadcrumbs,
  Link as MuiLink,
  Chip,
  Alert,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { ArrowBack as BackIcon, Delete as DeleteIcon } from '@mui/icons-material';

// Components
import PageContainer from '../components/layout/PageContainer';
import LoadingSpinner from '../components/common/LoadingSpinner';
import OverviewTab from '../components/modelDetails/OverviewTab';
import PerformanceTab from '../components/modelDetails/PerformanceTab';
import PredictionsTab from '../components/modelDetails/PredictionsTab';
// import ConfigurationTab from '../components/modelDetails/ConfigurationTab'; // Temporär deaktiviert wegen Build-Fehlern
import JsonExportTab from '../components/modelDetails/JsonExportTab';

// Services
import { modelsApi } from '../services/api';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`model-details-tabpanel-${index}`}
      aria-labelledby={`model-details-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const ModelDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = React.useState(0);

  const modelId = Number(id);

  // State für Lösch-Bestätigung
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);

  // Modell-Daten laden
  const {
    data: model,
    isLoading,
    error
  } = useQuery({
    queryKey: ['model', modelId],
    queryFn: () => modelsApi.getById(modelId),
    enabled: !!modelId,
    refetchInterval: 30000 // Aktualisiere alle 30 Sekunden
  });

  // Modell löschen
  const deleteMutation = useMutation({
    mutationFn: () => modelsApi.delete(modelId),
    onSuccess: () => {
      navigate('/', { replace: true });
    },
    onError: (error) => {
      console.error('Fehler beim Löschen des Modells:', error);
    }
  });

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleBack = () => {
    navigate('/');
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    deleteMutation.mutate();
    setDeleteDialogOpen(false);
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
  };

  if (isLoading) {
    return <LoadingSpinner message="Modell-Details werden geladen..." />;
  }

  if (error || !model) {
    return (
      <PageContainer>
        <Alert severity="error" sx={{ mb: 3 }}>
          Fehler beim Laden der Modell-Details: {error?.message || 'Modell nicht gefunden'}
        </Alert>
        <Button startIcon={<BackIcon />} onClick={handleBack}>
          Zurück zur Übersicht
        </Button>
      </PageContainer>
    );
  }

  const modelName = model.custom_name || model.name;
  const isActive = model.is_active;

  return (
    <PageContainer>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 3 }}>
        <MuiLink
          component="button"
          variant="body2"
          onClick={() => navigate('/')}
          sx={{ cursor: 'pointer' }}
        >
          Übersicht
        </MuiLink>
        <Typography color="text.primary">{modelName}</Typography>
      </Breadcrumbs>

      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
              🔍 {modelName}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              ID: {model.id} • Typ: {model.model_type} • Ziel: {model.target_direction?.toUpperCase()}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Chip
              label={isActive ? 'Aktiv' : 'Inaktiv'}
              color={isActive ? 'success' : 'default'}
              variant={isActive ? 'filled' : 'outlined'}
              size="medium"
            />
            <Button
              startIcon={<DeleteIcon />}
              onClick={handleDeleteClick}
              variant="contained"
              color="error"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Löschen...' : 'Löschen'}
            </Button>
            <Button
              startIcon={<BackIcon />}
              onClick={handleBack}
              variant="outlined"
            >
              Zurück
            </Button>
          </Box>
        </Box>

        {/* Quick Stats */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(4, 1fr)'
            },
            gap: 3
          }}
        >
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary">
                {model.total_predictions || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Vorhersagen Gesamt
              </Typography>
            </CardContent>
          </Card>

          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">
                {model.average_probability ? `${(model.average_probability * 100).toFixed(1)}%` : 'N/A'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Ø Wahrscheinlichkeit
              </Typography>
            </CardContent>
          </Card>

          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="info.main">
                {model.accuracy ? `${(model.accuracy * 100).toFixed(1)}%` : 'N/A'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Accuracy
              </Typography>
            </CardContent>
          </Card>

          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main">
                {model.positive_predictions || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Positive Vorhersagen
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label="model details tabs"
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontSize: '0.95rem',
              fontWeight: 500
            }
          }}
        >
          <Tab label="📊 Übersicht" />
          <Tab label="🎯 Performance" />
          <Tab label="🔮 Vorhersagen" />
          <Tab label="📋 JSON Export" />
        </Tabs>
      </Box>

      {/* Tab Content */}
      <TabPanel value={activeTab} index={0}>
        <OverviewTab model={model} />
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        <PerformanceTab model={model} />
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        <PredictionsTab modelId={modelId} />
      </TabPanel>

      <TabPanel value={activeTab} index={3}>
        <JsonExportTab model={model} />
      </TabPanel>

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
            Bist du sicher, dass du das Modell "{model?.custom_name || model?.name}" löschen möchtest?
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

export default ModelDetails;
