import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Button,
  IconButton,
  Checkbox,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Alert,
  LinearProgress,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Visibility as DetailsIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Assessment as TestIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { TestResult } from '../types/api';

interface TestResultCardProps {
  testResult: TestResult;
  isSelected: boolean;
  onSelect: (testResultId: number) => void;
  onDetails: (testResultId: number) => void;
  onDelete: (testResult: TestResult) => void;
  compact?: boolean;
}

export const TestResultCard: React.FC<TestResultCardProps> = ({
  testResult,
  isSelected,
  onSelect,
  onDetails,
  onDelete,
  compact = false,
}) => {
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  const formatCurrency = (value: number) => {
    return `${value.toFixed(4)}%`;
  };

  const getPerformanceColor = (accuracy: number) => {
    if (accuracy >= 0.7) return '#4caf50'; // success
    if (accuracy >= 0.5) return '#ff9800'; // warning
    return '#f44336'; // error
  };

  const getProfitColor = (profit: number) => {
    if (profit > 0) return '#4caf50'; // success
    if (profit >= -0.1) return '#ff9800'; // warning
    return '#f44336'; // error
  };

  const getPerformanceLevel = (accuracy: number) => {
    if (accuracy >= 0.7) return { level: 'Ausgezeichnet', color: 'success' };
    if (accuracy >= 0.5) return { level: 'Gut', color: 'warning' };
    return { level: 'Verbesserungswürdig', color: 'error' };
  };

  const performance = getPerformanceLevel(testResult.accuracy);

  return (
      <Card
        sx={{
          border: isSelected ? '2px solid #00d4ff' : '1px solid rgba(255, 255, 255, 0.2)',
          backgroundColor: isSelected ? 'rgba(0, 212, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)',
          color: 'white',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            boxShadow: '0 4px 20px rgba(0, 212, 255, 0.3)',
            transform: 'translateY(-2px)',
          },
        }}
      >
      <CardContent sx={{ p: compact ? 2 : 3 }}>
        {/* Header Row */}
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center" gap={2}>
            <Checkbox
              checked={isSelected}
              onChange={() => onSelect(testResult.id)}
              sx={{ color: '#00d4ff' }}
            />
            <TestIcon sx={{ color: '#00d4ff' }} />
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#00d4ff' }}>
              Test-Ergebnis #{testResult.id}
            </Typography>
            <Chip
              label={performance.level}
              color={performance.color as any}
              size="small"
            />
          </Box>
          <Box display="flex" gap={1}>
            <IconButton
              size="small"
              onClick={() => onDelete(testResult)}
              sx={{ color: 'rgba(244, 67, 54, 0.7)', '&:hover': { color: '#f44336' } }}
              title="Löschen"
            >
              <DeleteIcon />
            </IconButton>
            <Button
              startIcon={<DetailsIcon />}
              onClick={() => onDetails(testResult.id)}
              variant="outlined"
              size="small"
              sx={{
                borderColor: 'rgba(0, 212, 255, 0.5)',
                color: '#00d4ff',
                '&:hover': {
                  borderColor: '#00d4ff',
                  backgroundColor: 'rgba(0, 212, 255, 0.1)',
                },
              }}
            >
              Details
            </Button>
          </Box>
        </Box>

        {/* Model Info */}
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            Modell: {testResult.model_name || `ID ${testResult.model_id}`}
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            {formatDate(testResult.created_at)}
          </Typography>
        </Box>

        {/* Zeiträume */}
        <Box mb={2}>
          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 1 }}>
            Test-Zeitraum:
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
            {formatDate(testResult.test_start)} → {formatDate(testResult.test_end)}
          </Typography>
        </Box>

        {/* Key Metrics */}
        {!compact && (
          <Grid container spacing={2} mb={2}>
            <Grid item xs={6} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" sx={{ color: getPerformanceColor(testResult.accuracy) }}>
                  {formatPercentage(testResult.accuracy)}
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                  Genauigkeit
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" sx={{ color: '#00d4ff' }}>
                  {formatPercentage(testResult.f1_score)}
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                  F1-Score
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" sx={{ color: '#00d4ff' }}>
                  {formatPercentage(testResult.roc_auc)}
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                  ROC-AUC
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography
                  variant="h6"
                  sx={{
                    color: getProfitColor(testResult.simulated_profit_pct),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 0.5
                  }}
                >
                  {testResult.simulated_profit_pct > 0 ? (
                    <TrendingUpIcon fontSize="small" />
                  ) : (
                    <TrendingDownIcon fontSize="small" />
                  )}
                  {formatCurrency(testResult.simulated_profit_pct)}
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                  Simulierter Profit
                </Typography>
              </Box>
            </Grid>
          </Grid>
        )}

        {/* Performance Bar */}
        <Box mb={2}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
              Performance-Level
            </Typography>
            <Typography variant="body2" sx={{ color: getPerformanceColor(testResult.accuracy) }}>
              {performance.level}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={testResult.accuracy * 100}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              '& .MuiLinearProgress-bar': {
                backgroundColor: getPerformanceColor(testResult.accuracy),
                borderRadius: 4,
              },
            }}
          />
        </Box>

        {/* Quick Confusion Matrix Preview */}
        {!compact && (
          <Accordion sx={{
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            '&:before': { display: 'none' },
          }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="body2" sx={{ color: '#00d4ff' }}>
                Confusion Matrix Übersicht
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Box sx={{
                      p: 1,
                      bgcolor: 'rgba(76, 175, 80, 0.1)',
                      border: '1px solid rgba(76, 175, 80, 0.3)',
                      borderRadius: 1,
                      textAlign: 'center'
                    }}>
                    <Typography variant="h6" sx={{ color: '#4caf50' }}>
                      {testResult.confusion_matrix?.tp || 0}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      True Positive
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{
                    p: 1,
                    bgcolor: 'rgba(244, 67, 54, 0.1)',
                    border: '1px solid rgba(244, 67, 54, 0.3)',
                    borderRadius: 1,
                    textAlign: 'center'
                  }}>
                    <Typography variant="h6" sx={{ color: '#f44336' }}>
                      {testResult.confusion_matrix?.fp || 0}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      False Positive
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{
                    p: 1,
                    bgcolor: 'rgba(76, 175, 80, 0.1)',
                    border: '1px solid rgba(76, 175, 80, 0.3)',
                    borderRadius: 1,
                    textAlign: 'center'
                  }}>
                    <Typography variant="h6" sx={{ color: '#4caf50' }}>
                      {testResult.confusion_matrix?.tn || 0}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      True Negative
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{
                    p: 1,
                    bgcolor: 'rgba(244, 67, 54, 0.1)',
                    border: '1px solid rgba(244, 67, 54, 0.3)',
                    borderRadius: 1,
                    textAlign: 'center'
                  }}>
                    <Typography variant="h6" sx={{ color: '#f44336' }}>
                      {testResult.confusion_matrix?.fn || 0}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      False Negative
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  {(() => {
                    const tp = testResult.confusion_matrix?.tp || 0;
                    const tn = testResult.confusion_matrix?.tn || 0;
                    const fp = testResult.confusion_matrix?.fp || 0;
                    const fn = testResult.confusion_matrix?.fn || 0;
                    const total = tp + tn + fp + fn;
                    const successRate = total > 0 ? ((tp + tn) / total) * 100 : 0;

                    return (
                      <>
                        <strong>{total}</strong> Vorhersagen gesamt •
                        Erfolgsrate: <strong>{formatPercentage(successRate)}</strong>
                      </>
                    );
                  })()}
                </Typography>
              </Alert>
            </AccordionDetails>
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
};

export default TestResultCard;
