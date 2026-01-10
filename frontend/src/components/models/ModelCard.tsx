/**
 * ModelCard Component
 * Darstellung eines einzelnen ML-Modells in der Übersicht
 * Performance-optimiert mit React.memo und useMemo
 */
import React, { useMemo } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Button,
  CircularProgress
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Info as InfoIcon,
  Edit as EditIcon,
  ToggleOn as ToggleOnIcon,
  ToggleOff as ToggleOffIcon,
  Speed as SpeedIcon,
  BarChart as BarChartIcon,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';

interface Model {
  id: number;
  name: string;
  custom_name?: string;
  model_type: string;
  is_active: boolean;
  total_predictions?: number;
  total_positive_predictions?: number;
  total_alert_predictions?: number;
  alert_threshold: number;
  n8n_enabled: boolean;
}

interface ModelCardProps {
  model: Model;
  onDetailsClick: (modelId: number) => void;
  onAlertConfigClick: (modelId: number) => void;
  onToggleActive: (modelId: number, isActive: boolean) => void;
  onDelete: (modelId: number, modelName: string) => void;
  isActivating: boolean;
  isDeactivating: boolean;
  isDeleting: boolean;
}

const ModelCard: React.FC<ModelCardProps> = React.memo(({
  model,
  onDetailsClick,
  onAlertConfigClick,
  onToggleActive,
  onDelete,
  isActivating,
  isDeactivating,
  isDeleting
}) => {
  // Memoized calculations for performance
  const modelName = useMemo(() =>
    model.custom_name || model.name || `Modell ${model.id}`,
    [model.custom_name, model.name, model.id]
  );

  const stats = useMemo(() => {
    const totalPred = model.total_predictions || 0;
    const positivePred = model.total_positive_predictions || 0;
    const alertPred = model.total_alert_predictions || 0;

    return {
      avgProbability: totalPred > 0 ? (positivePred / totalPred) : 0,
      alertRate: totalPred > 0 ? (alertPred / totalPred) : 0,
      totalPredictions: totalPred
    };
  }, [model.total_predictions, model.total_positive_predictions, model.total_alert_predictions]);

  const modelTypeLabel = useMemo(() => {
    const typeLabels: { [key: string]: string } = {
      'random_forest': 'RF',
      'xgboost': 'XGB',
      'neural_network': 'NN',
      'svm': 'SVM',
      'linear': 'LIN',
      'logistic': 'LOG'
    };
    return typeLabels[model.model_type] || model.model_type.toUpperCase();
  }, [model.model_type]);

  const handleToggleActive = () => {
    onToggleActive(model.id, model.is_active);
  };

  const handleDelete = () => {
    onDelete(model.id, modelName);
  };

  const handleCardClick = (event: React.MouseEvent) => {
    // Prevent navigation if clicking on buttons
    if ((event.target as HTMLElement).closest('button')) {
      return;
    }
    onDetailsClick(model.id);
  };

  return (
    <Card
      variant="outlined"
      onClick={handleCardClick}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.2s ease-in-out',
        cursor: 'pointer',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 4,
          borderColor: 'primary.main'
        }
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography variant="h6" component="div" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
            {modelName}
          </Typography>
          <Chip
            label={model.is_active ? 'Aktiv' : 'Inaktiv'}
            color={model.is_active ? 'success' : 'default'}
            size="small"
            icon={model.is_active ? <CheckCircleIcon /> : <CancelIcon />}
          />
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          ID: {model.id} • {modelTypeLabel}
        </Typography>

        {/* Stats Grid */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 1,
            mb: 2
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <SpeedIcon fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              {stats.totalPredictions}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <BarChartIcon fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              {(stats.avgProbability * 100).toFixed(0)}%
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <NotificationsIcon fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              {(stats.alertRate * 100).toFixed(0)}%
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <SettingsIcon fontSize="small" color={model.n8n_enabled ? 'success' : 'error'} />
            <Typography variant="body2" color="text.secondary">
              {model.n8n_enabled ? 'N8N' : 'Aus'}
            </Typography>
          </Box>
        </Box>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<InfoIcon />}
              onClick={() => onDetailsClick(model.id)}
              sx={{ minWidth: 'auto' }}
            >
              Details
            </Button>

            <Button
              variant="outlined"
              size="small"
              startIcon={<EditIcon />}
              onClick={() => onAlertConfigClick(model.id)}
              sx={{ minWidth: 'auto' }}
            >
              Alert
            </Button>

            <Button
              variant="contained"
              size="small"
              color={model.is_active ? 'error' : 'success'}
              startIcon={model.is_active ? <ToggleOffIcon /> : <ToggleOnIcon />}
              onClick={handleToggleActive}
              disabled={isActivating || isDeactivating}
              sx={{
                minWidth: 'auto',
                '&.Mui-disabled': {
                  opacity: 0.6
                }
              }}
            >
              {isActivating || isDeactivating ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                model.is_active ? 'Deaktivieren' : 'Aktivieren'
              )}
            </Button>
          </Box>

          <Button
            variant="contained"
            size="small"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleDelete}
            disabled={isDeleting}
            sx={{
              minWidth: 'auto',
              px: 1,
              '&.Mui-disabled': {
                opacity: 0.6
              }
            }}
          >
            {isDeleting ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              'Löschen'
            )}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
});

ModelCard.displayName = 'ModelCard';

export default ModelCard;