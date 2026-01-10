import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Button,
  Checkbox,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Science as TestIcon,
  Compare as CompareIcon,
  Visibility as DetailsIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AutoAwesome as EngineeringIcon,
  Balance as BalanceIcon,
  Timer as TimerIcon,
  Storage as FeaturesIcon,
} from '@mui/icons-material';
import { ModelResponse } from '../types/api';

interface ModelCardProps {
  model: ModelResponse;
  isSelected: boolean;
  onSelect: (modelId: number) => void;
  onDetails: (modelId: number) => void;
  onEdit: (modelId: number) => void;
  onDelete: (modelId: number) => void;
  onDownload: (modelId: number) => void;
  onTest: (modelId: number) => void;
  compact?: boolean;
}

export const ModelCard: React.FC<ModelCardProps> = ({
  model,
  isSelected,
  onSelect,
  onDetails,
  onEdit,
  onDelete,
  onDownload,
  onTest,
  compact = false,
}) => {
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [newName, setNewName] = React.useState(model.name);
  const [newDescription, setNewDescription] = React.useState(model.description || '');

  const handleEdit = () => {
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    setEditDialogOpen(false);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'ready': return 'success';
      case 'trained': return 'success';
      case 'training': return 'warning';
      case 'failed': return 'error';
      default: return 'default';
    }
  };

  const getModelTypeEmoji = (modelType: string) => {
    return modelType === 'xgboost' ? '🚀' : '🌲';
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const formatDuration = (start: string, end: string) => {
    try {
      const startDate = new Date(start);
      const endDate = new Date(end);
      const diffMs = endDate.getTime() - startDate.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      if (diffHours > 0) {
        return `${diffHours}h ${diffMinutes}min`;
      }
      return `${diffMinutes}min`;
    } catch {
      return 'N/A';
    }
  };

  // Extract time-based prediction info
  const getTimePrediction = () => {
    if (model.params?._time_based?.enabled || model.params?._time_based?.future_minutes) {
      return {
        enabled: true,
        minutes: model.params._time_based.future_minutes || 5,
        percent: model.params._time_based.min_percent_change || 2,
        direction: model.params._time_based.direction || 'up'
      };
    }
    return null;
  };

  // Categorize features (nur eindeutige Features zählen, Duplikate ignorieren)
  const categorizeFeatures = () => {
    const features = model.features || [];
    
    // ⚠️ KRITISCH: Entferne Duplikate - zähle nur eindeutige Features
    // Ohne diese Zeile werden Duplikate mitgezählt (z.B. 129 statt 66 Engineering)
    const uniqueFeatures = Array.from(new Set(features));
    
    // Debug: Prüfe ob wirklich eindeutig
    if (features.length !== uniqueFeatures.length) {
      console.log(`[ModelCard] Duplikate entfernt: ${features.length} → ${uniqueFeatures.length} Features`);
    }
    
    let baseCount = 0;
    let engCount = 0;
    let flagCount = 0;

    // Liste aller 28 Basis-Features (aus FEATURE_ÜBERSICHT.md)
    const baseFeatures = [
      // OHLC (4)
      'price_open', 'price_high', 'price_low', 'price_close',
      // Volume (4)
      'volume_sol', 'buy_volume_sol', 'sell_volume_sol', 'net_volume_sol',
      // Market (3)
      'market_cap_close', 'bonding_curve_pct', 'virtual_sol_reserves',
      // Trade (6)
      'num_buys', 'num_sells', 'unique_wallets', 'num_micro_trades',
      'max_single_buy_sol', 'max_single_sell_sol',
      // Whale (4)
      'whale_buy_volume_sol', 'whale_sell_volume_sol', 'num_whale_buys', 'num_whale_sells',
      // Sonstige (7)
      'dev_sold_amount', 'volatility_pct', 'avg_trade_size_sol',
      'buy_pressure_ratio', 'unique_signer_ratio', 'phase_id_at_time', 'is_koth'
    ];

    // Engineering-Feature-Patterns (alles was mit diesen beginnt ODER diese exakten Namen hat)
    const engPatterns = [
      'dev_sold_', 'buy_pressure_', 'whale_', 'volatility_', 'wash_trading_',
      'net_volume_', 'price_change_', 'price_roc_', 'mcap_velocity_', 'ath_',
      'price_acceleration_', 'volume_spike_', 'volume_flip_',
      // Exakte Engineering-Feature-Namen
      'buy_sell_ratio', 'whale_dominance', 'rolling_ath', 'minutes_since_ath',
      'ath_breakout', 'price_vs_ath_pct',
      // Engineering-Features ohne Pattern
      'dev_sold_flag', 'dev_sold_cumsum', 'whale_net_volume'
    ];

    // Zähle nur eindeutige Features
    uniqueFeatures.forEach((f: string) => {
      if (f.endsWith('_has_data')) {
        flagCount++;
      } else if (baseFeatures.includes(f)) {
        baseCount++;
      } else if (engPatterns.some(pattern => f.startsWith(pattern) || f === pattern)) {
        engCount++;
      } else {
        // Unbekanntes Feature - zähle als Engineering (könnte ein neues Engineering-Feature sein)
        engCount++;
      }
    });

    return { baseCount, engCount, flagCount };
  };

  const { baseCount, engCount, flagCount } = categorizeFeatures();

  // Check for engineering features
  const hasEngineering = model.params?.use_engineered_features === true || engCount > 0;
  
  // Check for flag features
  const hasFlagFeatures = model.params?.use_flag_features === true || flagCount > 0;
  
  // Check for scale_pos_weight
  const scaleWeight = model.params?.scale_pos_weight;
  
  // Check for SMOTE
  const hasSmote = model.params?.use_smote === true;

  const timePred = getTimePrediction();
  const featureCount = model.features?.length || 0;

  // Calculate F1 bar color - realistische Schwellenwerte für Pump-Detection
  const getF1Color = (f1: number) => {
    // Gut: >= 30% (0.3) - Grünes Signal
    if (f1 >= 0.3) return '#4caf50';
    // Mittel: >= 15% (0.15) - Orange/Warnung
    if (f1 >= 0.15) return '#ff9800';
    // Schlecht: < 15% (0.15) - Rot/Kritisch
    if (f1 > 0) return '#f44336';
    // Kein F1-Score
    return '#666';
  };

  return (
    <>
      <Card
        sx={{
          border: isSelected ? '2px solid #00d4ff' : '1px solid rgba(255, 255, 255, 0.2)',
          backgroundColor: isSelected ? 'rgba(0, 212, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)',
          color: 'white',
          transition: 'all 0.2s ease-in-out',
          position: 'relative',
          overflow: 'visible',
          '&:hover': {
            boxShadow: '0 8px 32px rgba(0, 212, 255, 0.4)',
            transform: 'translateY(-4px)',
          },
        }}
      >
        <CardContent sx={{ p: compact ? 2 : 3 }}>
          {/* Header Row */}
          <Box display="flex" alignItems="center" mb={2}>
            <Checkbox
              checked={isSelected}
              onChange={() => onSelect(model.id)}
              sx={{ mr: 1 }}
            />
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#00d4ff', lineHeight: 1.2 }}>
              {model.name}
            </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                ID: {model.id} • {formatDate(model.created_at)}
              </Typography>
            </Box>
            <Box display="flex" gap={0.5}>
              <Tooltip title="Details anzeigen">
                <IconButton size="small" onClick={() => onDetails(model.id)} sx={{ color: '#00d4ff' }}>
                <DetailsIcon />
              </IconButton>
              </Tooltip>
              <Tooltip title="Bearbeiten">
                <IconButton size="small" onClick={handleEdit}>
                <EditIcon />
              </IconButton>
              </Tooltip>
              <Tooltip title="Download">
                <IconButton size="small" onClick={() => onDownload(model.id)}>
                <DownloadIcon />
              </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* Status and Type Row */}
          <Box display="flex" alignItems="center" gap={1} mb={2} flexWrap="wrap">
            <Chip
              label={model.status}
              color={getStatusColor(model.status) as any}
              size="small"
              sx={{ fontWeight: 'bold' }}
            />
            <Chip
              label={`${getModelTypeEmoji(model.model_type)} ${model.model_type.toUpperCase()}`}
              size="small"
              variant="outlined"
              sx={{ borderColor: 'rgba(255, 255, 255, 0.3)' }}
            />
            {/* Feature Count Badge - Detailed Breakdown */}
            <Tooltip title={`Gesamt: ${featureCount} Features (${baseCount} Basis, ${engCount} Engineering, ${flagCount} Flags)`}>
              <Chip
                icon={<FeaturesIcon sx={{ fontSize: 14 }} />}
                label={`${baseCount} Basis, ${engCount} Eng, ${flagCount} Flags`}
                size="small"
                variant="outlined"
                sx={{ borderColor: featureCount > 50 ? '#4caf50' : 'rgba(255, 255, 255, 0.3)' }}
              />
            </Tooltip>
          </Box>

          {/* Training Config Badges */}
          <Box display="flex" gap={1} mb={2} flexWrap="wrap">
            {hasEngineering && (
              <Tooltip title="Feature Engineering aktiviert - 66 zusätzliche Features">
                <Chip
                  icon={<EngineeringIcon sx={{ fontSize: 14 }} />}
                  label="Engineering"
                  size="small"
                  sx={{ bgcolor: 'rgba(156, 39, 176, 0.3)', borderColor: '#9c27b0', border: '1px solid' }}
                />
              </Tooltip>
            )}
            {hasFlagFeatures && (
              <Tooltip title="Flag-Features aktiviert - Zeigt Datenverfügbarkeit für Engineering-Features">
                <Chip
                  label="🚩 Flags"
                  size="small"
                  sx={{ bgcolor: 'rgba(255, 193, 7, 0.3)', borderColor: '#ffc107', border: '1px solid' }}
                />
              </Tooltip>
            )}
            {scaleWeight && (
              <Tooltip title={`scale_pos_weight=${scaleWeight} - Klassen-Gewichtung für unbalancierte Daten`}>
                <Chip
                  icon={<BalanceIcon sx={{ fontSize: 14 }} />}
                  label={`Weight: ${scaleWeight}`}
                  size="small"
                  sx={{ bgcolor: 'rgba(255, 152, 0, 0.3)', borderColor: '#ff9800', border: '1px solid' }}
                />
              </Tooltip>
            )}
            {hasSmote && (
              <Tooltip title="SMOTE aktiviert - Synthetisches Oversampling">
                <Chip
                  label="SMOTE"
                  size="small"
                  sx={{ bgcolor: 'rgba(0, 188, 212, 0.3)', borderColor: '#00bcd4', border: '1px solid' }}
                />
              </Tooltip>
            )}
            {/* 🔄 Coin-Phasen Anzeige */}
            {model.phases && model.phases.length > 0 && (
              <Tooltip title={`Training nur mit Coins in Phase(n): ${model.phases.join(', ')}`}>
                <Chip
                  label={`🔄 Phase ${model.phases.join(',')}`}
                  size="small"
                  sx={{ 
                    bgcolor: model.phases.includes(1) ? 'rgba(0, 212, 255, 0.3)' : 
                             model.phases.includes(2) ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255, 152, 0, 0.3)',
                    borderColor: model.phases.includes(1) ? '#00d4ff' : 
                                 model.phases.includes(2) ? '#4caf50' : '#ff9800',
                    border: '1px solid' 
                  }}
                />
              </Tooltip>
            )}
          </Box>

          {/* Time-Based Prediction Info */}
          {timePred && (
            <Box sx={{ 
              mb: 2, 
              p: 1.5, 
              bgcolor: 'rgba(0, 212, 255, 0.1)', 
              borderRadius: 1,
              border: '1px solid rgba(0, 212, 255, 0.3)'
            }}>
              <Box display="flex" alignItems="center" gap={1}>
                <TimerIcon sx={{ color: '#00d4ff', fontSize: 20 }} />
                {timePred.direction === 'up' ? (
                  <TrendingUpIcon sx={{ color: '#4caf50', fontSize: 20 }} />
                ) : (
                  <TrendingDownIcon sx={{ color: '#f44336', fontSize: 20 }} />
                )}
                <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#00d4ff' }}>
                  {timePred.percent}% in {timePred.minutes} Min
                  <Typography component="span" sx={{ ml: 0.5, color: timePred.direction === 'up' ? '#4caf50' : '#f44336' }}>
                    ({timePred.direction === 'up' ? 'PUMP' : 'RUG'})
                  </Typography>
                </Typography>
              </Box>
            </Box>
          )}

          {/* Metrics Grid */}
          {!compact && (
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1 }}>
                <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 1 }}>
                  <Typography variant="h6" sx={{ color: '#4caf50', fontWeight: 'bold' }}>
                    {((model.training_accuracy || 0) * 100).toFixed(1)}%
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                  Accuracy
                </Typography>
              </Box>
                <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 1 }}>
                  <Typography variant="h6" sx={{ color: getF1Color(model.training_f1 || 0), fontWeight: 'bold' }}>
                    {((model.training_f1 || 0) * 100).toFixed(2)}%
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                  F1-Score
                </Typography>
              </Box>
                <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 1 }}>
                  <Typography variant="h6" sx={{ color: '#00d4ff', fontWeight: 'bold' }}>
                    {((model.training_precision || 0) * 100).toFixed(1)}%
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                    Precision
                </Typography>
              </Box>
                <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 1 }}>
                  <Typography variant="h6" sx={{ color: '#ff9800', fontWeight: 'bold' }}>
                    {((model.training_recall || 0) * 100).toFixed(1)}%
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                    Recall
                  </Typography>
                </Box>
              </Box>

              {/* F1-Score Progress Bar */}
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                  F1-Score Qualität
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={Math.min((model.training_f1 || 0) * 1000, 100)} // Scale: 0.1 = 100%
                  sx={{ 
                    height: 6, 
                    borderRadius: 3,
                    bgcolor: 'rgba(255,255,255,0.1)',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: getF1Color(model.training_f1 || 0),
                      borderRadius: 3
                    }
                  }}
                />
              </Box>
            </Box>
          )}

          {/* Confusion Matrix Mini */}
          {model.tp !== undefined && model.fp !== undefined && (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 0.5, mb: 2 }}>
              <Tooltip title="True Positive - Korrekt erkannte Pumps">
                <Box sx={{ p: 0.5, bgcolor: 'rgba(76, 175, 80, 0.2)', borderRadius: 0.5, textAlign: 'center' }}>
                  <Typography variant="caption" sx={{ color: '#4caf50' }}>TP: {model.tp}</Typography>
                </Box>
              </Tooltip>
              <Tooltip title="False Positive - Falsch vorhergesagte Pumps">
                <Box sx={{ p: 0.5, bgcolor: 'rgba(244, 67, 54, 0.2)', borderRadius: 0.5, textAlign: 'center' }}>
                  <Typography variant="caption" sx={{ color: '#f44336' }}>FP: {model.fp}</Typography>
                </Box>
              </Tooltip>
              <Tooltip title="False Negative - Verpasste Pumps">
                <Box sx={{ p: 0.5, bgcolor: 'rgba(255, 152, 0, 0.2)', borderRadius: 0.5, textAlign: 'center' }}>
                  <Typography variant="caption" sx={{ color: '#ff9800' }}>FN: {model.fn}</Typography>
                </Box>
              </Tooltip>
              <Tooltip title="True Negative - Korrekt erkannte Nicht-Pumps">
                <Box sx={{ p: 0.5, bgcolor: 'rgba(33, 150, 243, 0.2)', borderRadius: 0.5, textAlign: 'center' }}>
                  <Typography variant="caption" sx={{ color: '#2196f3' }}>TN: {model.tn}</Typography>
                </Box>
              </Tooltip>
            </Box>
          )}

          {/* Training Period */}
          <Box sx={{ mb: 2, p: 1, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 1 }}>
            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', display: 'block' }}>
              📅 Trainings-Zeitraum: <strong>{formatDuration(model.train_start, model.train_end)}</strong>
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.4)' }}>
              {formatDate(model.train_start)} → {formatDate(model.train_end)}
              </Typography>
          </Box>

          {/* Actions Row */}
          <Box display="flex" gap={1} flexWrap="wrap">
            <Button
              size="small"
              variant="contained"
              startIcon={<DetailsIcon />}
              onClick={() => onDetails(model.id)}
              sx={{ bgcolor: '#00d4ff', '&:hover': { bgcolor: '#00b8d4' } }}
            >
              Details
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<TestIcon />}
              onClick={() => onTest(model.id)}
              disabled={model.status !== 'READY' && model.status !== 'TRAINED'}
            >
              Testen
            </Button>
            <Button
              size="small"
              color="error"
              variant="outlined"
              startIcon={<DeleteIcon />}
              onClick={() => onDelete(model.id)}
            >
              Löschen
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Modell bearbeiten</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            label="Beschreibung"
            multiline
            rows={3}
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Abbrechen</Button>
          <Button onClick={handleEditSave} variant="contained">
            Speichern
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ModelCard;
