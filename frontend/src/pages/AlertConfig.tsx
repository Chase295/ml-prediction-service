/**
 * AlertConfig Page
 * Vollständige Alert-Konfiguration für ein Modell
 */
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Typography,
  Box,
  Button,
  Alert,
  Divider,
  Breadcrumbs,
  Link as MuiLink
} from '@mui/material';
import { ArrowBack as BackIcon, Save as SaveIcon } from '@mui/icons-material';

// Components
import PageContainer from '../components/layout/PageContainer';
import LoadingSpinner from '../components/common/LoadingSpinner';

// Services
import { modelsApi } from '../services/api';
import { invalidateQueries } from '../services/queryClient';

// Sub-Komponenten (werden als separate Dateien erstellt)
import AlertSettingsForm from '../components/forms/AlertSettingsForm';
import IgnoreSettingsForm from '../components/forms/IgnoreSettingsForm';
import CurrentConfigDisplay from '../components/models/CurrentConfigDisplay';

const AlertConfig: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const modelId = Number(id);

  // Modell-Daten laden
  const { data: model, isLoading, error } = useQuery({
    queryKey: ['model', modelId],
    queryFn: () => modelsApi.getById(modelId),
    enabled: !!modelId
  });

  // Form-Daten State
  const [alertData, setAlertData] = React.useState<any>(null);
  const [ignoreData, setIgnoreData] = React.useState<any>(null);

  // Speichern-Mutationen
  const alertMutation = useMutation({
    mutationFn: (data: any) => modelsApi.updateAlertConfig(modelId, data),
    onSuccess: () => {
      invalidateQueries.model(modelId);
      invalidateQueries.models();
    }
  });

  const ignoreMutation = useMutation({
    mutationFn: (data: any) => modelsApi.updateIgnoreSettings(modelId, data),
    onSuccess: () => {
      invalidateQueries.model(modelId);
      invalidateQueries.models();
    }
  });

  // Formular absenden
  const handleSubmit = async () => {
    try {
      // Beide Updates parallel ausführen
      await Promise.all([
        alertData && alertMutation.mutateAsync(alertData),
        ignoreData && ignoreMutation.mutateAsync(ignoreData)
      ]);

      // Erfolg-Meldung und Redirect
      navigate(`/model/${modelId}`, {
        state: { message: 'Alert-Konfiguration erfolgreich gespeichert!' }
      });
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
    }
  };

  const handleBack = () => {
    navigate(`/model/${modelId}`);
  };

  if (isLoading) {
    return <LoadingSpinner message="Konfiguration wird geladen..." />;
  }

  if (error || !model) {
    return (
      <PageContainer>
        <Alert severity="error" sx={{ mb: 3 }}>
          Fehler beim Laden der Modell-Konfiguration: {error?.message || 'Modell nicht gefunden'}
        </Alert>
        <Button startIcon={<BackIcon />} onClick={handleBack}>
          Zurück
        </Button>
      </PageContainer>
    );
  }

  const isLoadingSave = alertMutation.isPending || ignoreMutation.isPending;

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
        <MuiLink
          component="button"
          variant="body2"
          onClick={handleBack}
          sx={{ cursor: 'pointer' }}
        >
          {model.custom_name || model.name}
        </MuiLink>
        <Typography color="text.primary">Alert-Konfiguration</Typography>
      </Breadcrumbs>

      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Button
            startIcon={<BackIcon />}
            onClick={handleBack}
            variant="outlined"
            size="small"
          >
            Zurück
          </Button>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            ⚙️ Alert-Konfiguration
          </Typography>
        </Box>

        <Typography variant="h6" color="text.secondary">
          {model.custom_name || model.name}
        </Typography>
      </Box>

      {/* Aktuelle Konfiguration */}
      <CurrentConfigDisplay model={model} />

      <Divider sx={{ my: 4 }} />

      {/* Konfigurations-Formulare */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' },
          gap: 4
        }}
      >
        {/* Alert-Einstellungen */}
        <AlertSettingsForm
          model={model}
          onChange={setAlertData}
          disabled={isLoadingSave}
        />

        {/* Ignore-Einstellungen */}
        <IgnoreSettingsForm
          model={model}
          onChange={setIgnoreData}
          disabled={isLoadingSave}
        />
      </Box>

      {/* Speichern-Button */}
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Button
          variant="contained"
          size="large"
          startIcon={<SaveIcon />}
          onClick={handleSubmit}
          disabled={isLoadingSave || (!alertData && !ignoreData)}
          sx={{ px: 4, py: 1.5 }}
        >
          {isLoadingSave ? 'Speichere...' : 'Konfiguration speichern'}
        </Button>
      </Box>

      {/* Fehler-Anzeige */}
      {(alertMutation.error || ignoreMutation.error) && (
        <Alert severity="error" sx={{ mt: 3 }}>
          Fehler beim Speichern: {alertMutation.error?.message || ignoreMutation.error?.message}
        </Alert>
      )}
    </PageContainer>
  );
};

export default AlertConfig;
