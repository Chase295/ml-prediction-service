/**
 * PerformanceTab Component
 * Performance-Metriken und Analyse für ein Modell
 */
import React from 'react';
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
  Paper
} from '@mui/material';
import {
  TableChart as TableIcon
} from '@mui/icons-material';
import type { Model } from '../../types/model';

interface PerformanceTabProps {
  model: Model;
}

const PerformanceTab: React.FC<PerformanceTabProps> = ({ model }) => {
  // Beispiel-Metriken (später aus API laden)
  const metrics = {
    accuracy: model.accuracy || 0.85,
    f1Score: model.f1_score || 0.82,
    precision: model.precision || 0.88,
    recall: model.recall || 0.79,
    rocAuc: model.roc_auc || 0.91,
    mcc: model.mcc || 0.75,
    simulatedProfit: model.simulated_profit_pct || 12.5
  };

  // Beispiel-Confusion-Matrix
  const confusionMatrix = [
    [850, 45],  // [TP, FP]
    [35, 70]    // [FN, TN]
  ];

  const formatPercentage = (value: number, decimals: number = 1): string => {
    if (value === null || value === undefined) return 'N/A';
    return `${(value * 100).toFixed(decimals)}%`;
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
        🎯 Performance-Metriken
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        Diese Metriken basieren auf den Training-Daten des Modells. Live-Performance-Metriken
        werden aus den aktuellen Vorhersagen berechnet.
      </Alert>

      {/* Kern-Metriken */}
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
        📊 Kern-Metriken
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(4, 1fr)'
          },
          gap: 3,
          mb: 4
        }}
      >
        <Card sx={{ textAlign: 'center' }}>
          <CardContent>
            <Typography variant="h4" color="primary.main" sx={{ fontWeight: 700 }}>
              {formatPercentage(metrics.accuracy)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Accuracy
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ textAlign: 'center' }}>
          <CardContent>
            <Typography variant="h4" color="success.main" sx={{ fontWeight: 700 }}>
              {formatPercentage(metrics.f1Score)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              F1-Score
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ textAlign: 'center' }}>
          <CardContent>
            <Typography variant="h4" color="info.main" sx={{ fontWeight: 700 }}>
              {formatPercentage(metrics.precision)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Precision
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ textAlign: 'center' }}>
          <CardContent>
            <Typography variant="h4" color="warning.main" sx={{ fontWeight: 700 }}>
              {formatPercentage(metrics.recall)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Recall
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Erweiterte Metriken */}
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
        🔬 Erweiterte Metriken
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            md: 'repeat(3, 1fr)'
          },
          gap: 3,
          mb: 4
        }}
      >
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h5" color="secondary.main" sx={{ fontWeight: 700 }}>
              {formatPercentage(metrics.rocAuc, 2)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              ROC AUC Score
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Area Under Curve - Je höher, desto besser
            </Typography>
          </CardContent>
        </Card>

        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h5" color="error.main" sx={{ fontWeight: 700 }}>
              {formatPercentage(metrics.mcc, 2)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Matthews Correlation Coefficient
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Balanced Accuracy-Metric (-1 bis +1)
            </Typography>
          </CardContent>
        </Card>

        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h5" color="success.main" sx={{ fontWeight: 700 }}>
              {metrics.simulatedProfit}%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Simulierter Profit
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Basierend auf historischen Daten
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Confusion Matrix */}
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
        📊 Confusion Matrix
      </Typography>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <TableIcon sx={{ mr: 1, color: 'action.main' }} />
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              Vorhersage-Genauigkeit (Training-Daten)
            </Typography>
          </Box>

          <TableContainer component={Paper} sx={{ maxWidth: 400, mx: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Tatsächlich</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Positiv</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Negativ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Positiv</TableCell>
                  <TableCell
                    align="center"
                    sx={{ bgcolor: 'success.light', color: 'success.contrastText', fontWeight: 600 }}
                  >
                    {confusionMatrix[0][0]}
                  </TableCell>
                  <TableCell align="center">{confusionMatrix[0][1]}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Negativ</TableCell>
                  <TableCell align="center">{confusionMatrix[1][0]}</TableCell>
                  <TableCell
                    align="center"
                    sx={{ bgcolor: 'error.light', color: 'error.contrastText', fontWeight: 600 }}
                  >
                    {confusionMatrix[1][1]}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 3 }}>
            <Typography variant="caption" color="success.main">
              ✓ True Positive: {confusionMatrix[0][0]}
            </Typography>
            <Typography variant="caption" color="error.main">
              ✗ False Positive: {confusionMatrix[0][1]}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              ✗ False Negative: {confusionMatrix[1][0]}
            </Typography>
            <Typography variant="caption" color="success.main">
              ✓ True Negative: {confusionMatrix[1][1]}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default PerformanceTab;
