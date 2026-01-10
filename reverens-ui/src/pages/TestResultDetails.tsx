import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Assessment as TestIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  ExpandMore as ExpandMoreIcon,
  Download as DownloadIcon,
  Share as ShareIcon,
} from '@mui/icons-material';
import { mlApi as apiService } from '../services/api';

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
      id={`test-result-tabpanel-${index}`}
      aria-labelledby={`test-result-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const TestResultDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [testResult, setTestResult] = useState<any>(null);
  const [modelDetails, setModelDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    if (id) {
      loadTestResult(parseInt(id));
    }
  }, [id]);

  const loadTestResult = async (testResultId: number) => {
    try {
      setLoading(true);
      const data = await apiService.getTestResult(testResultId.toString());
      setTestResult(data);
      
      // Lade auch die Modell-Details für erweiterte Informationen
      if (data.model_id) {
        try {
          const modelData = await apiService.getModel(data.model_id.toString());
          setModelDetails(modelData);
        } catch (modelErr) {
          console.warn('Modell-Details konnten nicht geladen werden:', modelErr);
        }
      }
      
      setError(null);
    } catch (err) {
      setError('Fehler beim Laden der Test-Ergebnisse');
      console.error('Error loading test result:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
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
    if (accuracy >= 0.7) return '#4caf50';
    if (accuracy >= 0.5) return '#ff9800';
    return '#f44336';
  };

  const getProfitColor = (profit: number) => {
    if (profit > 0) return '#4caf50';
    if (profit >= -0.1) return '#ff9800';
    return '#f44336';
  };

  const getPerformanceLevel = (accuracy: number) => {
    if (accuracy >= 0.7) return { level: 'Ausgezeichnet', color: 'success', description: 'Das Modell zeigt sehr gute Vorhersageleistung mit hoher Genauigkeit.' };
    if (accuracy >= 0.5) return { level: 'Gut', color: 'warning', description: 'Das Modell zeigt solide Vorhersageleistung, aber es gibt Raum für Verbesserungen.' };
    return { level: 'Verbesserungswürdig', color: 'error', description: 'Das Modell benötigt Optimierungen für bessere Vorhersageleistung.' };
  };

  const exportResults = () => {
    const dataStr = JSON.stringify(testResult, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `test-result-${testResult.id}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !testResult) {
    return (
      <Box p={3}>
        <Alert severity="error">{error || 'Test-Ergebnis nicht gefunden'}</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/test-results')} sx={{ mt: 2 }}>
          Zurück zu Test-Ergebnissen
        </Button>
      </Box>
    );
  }

  const performance = getPerformanceLevel(testResult.accuracy);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ p: 3, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/test-results')} variant="outlined">
            Zurück
          </Button>
          <TestIcon sx={{ color: '#00d4ff', fontSize: 32 }} />
          <Box>
            <Typography variant="h4" sx={{ color: '#00d4ff', fontWeight: 'bold' }}>
              Test-Ergebnis #{testResult.id}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Detaillierte Analyse des Backtesting-Ergebnisses
            </Typography>
          </Box>
        </Box>

        <Box display="flex" gap={2}>
          <Button startIcon={<DownloadIcon />} onClick={exportResults} variant="outlined">
            JSON Export
          </Button>
          <Button startIcon={<ShareIcon />} variant="outlined">
            Teilen
          </Button>
        </Box>
      </Box>

      {/* Performance Overview */}
      <Box sx={{ p: 3, bgcolor: 'rgba(0, 212, 255, 0.05)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <Typography variant="h6" gutterBottom sx={{ color: '#00d4ff' }}>
          📊 Performance-Übersicht
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            <Card sx={{ bgcolor: 'rgba(255, 255, 255, 0.05)' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ color: getPerformanceColor(testResult.accuracy) }}>
                  {formatPercentage(testResult.accuracy)}
                </Typography>
                <Typography variant="body2" color="text.secondary">Genauigkeit</Typography>
                <Chip label={performance.level} color={performance.color as any} size="small" sx={{ mt: 1 }} />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card sx={{ bgcolor: 'rgba(255, 255, 255, 0.05)' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ color: '#00d4ff' }}>
                  {formatPercentage(testResult.f1_score)}
                </Typography>
                <Typography variant="body2" color="text.secondary">F1-Score</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card sx={{ bgcolor: 'rgba(255, 255, 255, 0.05)' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ color: getProfitColor(testResult.simulated_profit_pct) }}>
                  {formatCurrency(testResult.simulated_profit_pct)}
                </Typography>
                <Typography variant="body2" color="text.secondary">Simulierter Profit</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card sx={{ bgcolor: 'rgba(255, 255, 255, 0.05)' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ color: '#00d4ff' }}>
                  {testResult.num_samples?.toLocaleString() || testResult.total_predictions?.toLocaleString() || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">Datenpunkte</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Wichtige Warnungen */}
        <Box sx={{ mt: 2 }}>
          {testResult.is_overfitted && (
            <Alert severity="warning" sx={{ mb: 1 }}>
              ⚠️ <strong>OVERFITTING erkannt!</strong> Train-Test Gap: {formatPercentage(testResult.accuracy_degradation || 0)} - Das Modell generalisiert schlecht auf neue Daten.
            </Alert>
          )}
          {testResult.has_overlap && (
            <Alert severity="warning" sx={{ mb: 1 }}>
              ⚠️ <strong>Überlappung!</strong> {testResult.overlap_note}
            </Alert>
          )}
          {!testResult.has_overlap && testResult.overlap_note && (
            <Alert severity="success" sx={{ mb: 1 }}>
              {testResult.overlap_note}
            </Alert>
          )}
        </Box>

        {/* Train vs Test Vergleich */}
        {testResult.train_accuracy && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom sx={{ color: '#00d4ff' }}>
              📈 Train vs. Test Vergleich
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} md={3}>
                <Typography variant="body2" color="text.secondary">Train Accuracy</Typography>
                <Typography variant="h6">{formatPercentage(testResult.train_accuracy)}</Typography>
              </Grid>
              <Grid item xs={6} md={3}>
                <Typography variant="body2" color="text.secondary">Test Accuracy</Typography>
                <Typography variant="h6" sx={{ color: getPerformanceColor(testResult.accuracy) }}>{formatPercentage(testResult.accuracy)}</Typography>
              </Grid>
              <Grid item xs={6} md={3}>
                <Typography variant="body2" color="text.secondary">Train F1</Typography>
                <Typography variant="h6">{formatPercentage(testResult.train_f1 || 0)}</Typography>
              </Grid>
              <Grid item xs={6} md={3}>
                <Typography variant="body2" color="text.secondary">Test F1</Typography>
                <Typography variant="h6">{formatPercentage(testResult.f1_score)}</Typography>
              </Grid>
            </Grid>
          </Box>
        )}
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="test result tabs">
          <Tab label="Übersicht" />
          <Tab label="Performance" />
          <Tab label="Konfiguration" />
          <Tab label="Rohdaten" />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <TabPanel value={tabValue} index={0}>
        {/* Übersicht */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ color: '#00d4ff' }}>
                  📈 Performance-Analyse
                </Typography>

                <Box mb={3}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Performance-Level: <strong style={{ color: getPerformanceColor(testResult.accuracy) }}>{performance.level}</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {performance.description}
                  </Typography>
                </Box>

                <Box mb={3}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Modell: <strong>{testResult.model_name || `ID ${testResult.model_id}`}</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Test-Zeitraum: <strong>{formatDate(testResult.test_start)} → {formatDate(testResult.test_end)}</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Durchgeführt am: <strong>{formatDate(testResult.created_at)}</strong>
                  </Typography>
                </Box>

                <Alert severity={performance.color as any} sx={{ mb: 3 }}>
                  <Typography variant="body2">
                    {(() => {
                      const tp = testResult.confusion_matrix?.tp || 0;
                      const tn = testResult.confusion_matrix?.tn || 0;
                      const total = tp + tn + (testResult.confusion_matrix?.fp || 0) + (testResult.confusion_matrix?.fn || 0);
                      const successRate = total > 0 ? ((tp + tn) / total) * 100 : 0;
                      return (
                        <>
                          <strong>Erfolgsrate:</strong> {formatPercentage(successRate)}
                          ({tp + tn} von {total} Vorhersagen korrekt)
                        </>
                      );
                    })()}
                  </Typography>
                </Alert>

                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Profitabilität: <strong style={{ color: getProfitColor(testResult.simulated_profit_pct) }}>
                      {testResult.simulated_profit_pct > 0 ? 'Profitabel' : 'Verlustreich'}
                    </strong>
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(Math.abs(testResult.simulated_profit_pct) * 1000, 100)}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      bgcolor: 'rgba(255, 255, 255, 0.1)',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: getProfitColor(testResult.simulated_profit_pct),
                        borderRadius: 4,
                      },
                    }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ color: '#00d4ff' }}>
                  🎯 Confusion Matrix
                </Typography>

                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell></TableCell>
                        <TableCell align="center">Vorhergesagt Positive</TableCell>
                        <TableCell align="center">Vorhergesagt Negative</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell><strong>Tatsächlich Positive</strong></TableCell>
                        <TableCell align="center" sx={{ bgcolor: 'rgba(76, 175, 80, 0.1)', color: '#4caf50', fontWeight: 'bold' }}>
                          {testResult.confusion_matrix?.tp || 0}
                        </TableCell>
                        <TableCell align="center" sx={{ bgcolor: 'rgba(244, 67, 54, 0.1)', color: '#f44336', fontWeight: 'bold' }}>
                          {testResult.confusion_matrix?.fn || 0}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><strong>Tatsächlich Negative</strong></TableCell>
                        <TableCell align="center" sx={{ bgcolor: 'rgba(255, 152, 0, 0.1)', color: '#ff9800', fontWeight: 'bold' }}>
                          {testResult.confusion_matrix?.fp || 0}
                        </TableCell>
                        <TableCell align="center" sx={{ bgcolor: 'rgba(76, 175, 80, 0.1)', color: '#4caf50', fontWeight: 'bold' }}>
                          {testResult.confusion_matrix?.tn || 0}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>

                <Box mt={2}>
                  {(() => {
                    const tp = testResult.confusion_matrix?.tp || 0;
                    const tn = testResult.confusion_matrix?.tn || 0;
                    const fp = testResult.confusion_matrix?.fp || 0;
                    const fn = testResult.confusion_matrix?.fn || 0;
                    const total = tp + tn + fp + fn;

                    return (
                      <>
                        <Typography variant="body2" color="text.secondary">
                          <strong>True Positives:</strong> Richtig erkannte Pump-Signale ({total > 0 ? formatPercentage(tp / total) : '0.00%'})
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          <strong>True Negatives:</strong> Richtig erkannte Nicht-Pump-Signale ({total > 0 ? formatPercentage(tn / total) : '0.00%'})
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          <strong>False Positives:</strong> Falsche Pump-Signale ({total > 0 ? formatPercentage(fp / total) : '0.00%'})
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          <strong>False Negatives:</strong> Verpasste Pump-Signale ({total > 0 ? formatPercentage(fn / total) : '0.00%'})
                        </Typography>
                      </>
                    );
                  })()}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        {/* Performance */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ color: '#00d4ff' }}>
                  📊 Detaillierte Metriken
                </Typography>
                <TableContainer>
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell>Genauigkeit (Accuracy)</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', color: getPerformanceColor(testResult.accuracy) }}>
                          {formatPercentage(testResult.accuracy)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>F1-Score</TableCell>
                        <TableCell align="right">{formatPercentage(testResult.f1_score)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>ROC AUC</TableCell>
                        <TableCell align="right">{formatPercentage(testResult.roc_auc)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Simulierter Profit</TableCell>
                        <TableCell align="right" sx={{ color: getProfitColor(testResult.simulated_profit_pct) }}>
                          {formatCurrency(testResult.simulated_profit_pct)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Präzision (Precision)</TableCell>
                        <TableCell align="right">
                          {(() => {
                            const tp = testResult.confusion_matrix?.tp || 0;
                            const fp = testResult.confusion_matrix?.fp || 0;
                            return formatPercentage(tp / (tp + fp) || 0);
                          })()}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Sensitivität (Recall)</TableCell>
                        <TableCell align="right">
                          {(() => {
                            const tp = testResult.confusion_matrix?.tp || 0;
                            const fn = testResult.confusion_matrix?.fn || 0;
                            return formatPercentage(tp / (tp + fn) || 0);
                          })()}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>MCC (Matthews Corr.)</TableCell>
                        <TableCell align="right">{testResult.mcc?.toFixed(4) || 'N/A'}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>FPR (False Positive Rate)</TableCell>
                        <TableCell align="right">{formatPercentage(testResult.fpr || 0)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>FNR (False Negative Rate)</TableCell>
                        <TableCell align="right">{formatPercentage(testResult.fnr || 0)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ color: '#00d4ff' }}>
                  📊 Daten-Statistiken
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell>Gesamt Datenpunkte</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>{testResult.num_samples?.toLocaleString() || 'N/A'}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Positive Labels (Pumps)</TableCell>
                        <TableCell align="right" sx={{ color: '#4caf50' }}>{testResult.num_positive?.toLocaleString() || 'N/A'}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Negative Labels (Kein Pump)</TableCell>
                        <TableCell align="right" sx={{ color: '#ff9800' }}>{testResult.num_negative?.toLocaleString() || 'N/A'}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Pump-Rate</TableCell>
                        <TableCell align="right">
                          {testResult.num_samples && testResult.num_positive
                            ? formatPercentage(testResult.num_positive / testResult.num_samples)
                            : 'N/A'
                          }
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Test-Dauer</TableCell>
                        <TableCell align="right">{testResult.test_duration_days?.toFixed(2) || 'N/A'} Tage</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ color: '#00d4ff' }}>
                  💰 Profit-Analyse
                </Typography>

                <Alert severity={testResult.simulated_profit_pct > 0 ? 'success' : 'warning'} sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>Simulierter Return:</strong> {formatCurrency(testResult.simulated_profit_pct)}
                    {testResult.simulated_profit_pct > 0 ? ' (Profitabel)' : ' (Verlust)'}
                  </Typography>
                </Alert>

                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Basierend auf {testResult.total_predictions} Vorhersagen im Zeitraum:
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatDate(testResult.test_start)} → {formatDate(testResult.test_end)}
                </Typography>

                <Box mt={2}>
                  <Typography variant="body2" color="text.secondary">
                    💡 <strong>Interpretation:</strong> Bei einem simulierten Profit von {formatCurrency(testResult.simulated_profit_pct)}
                    {testResult.simulated_profit_pct > 0
                      ? ' hätte das Modell in diesem Zeitraum Geld verdient.'
                      : ' hätte das Modell in diesem Zeitraum Verluste gemacht.'
                    }
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        {/* Konfiguration */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ color: '#00d4ff' }}>
                  ⚙️ Test-Konfiguration
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText primary={`Test Start: ${formatDate(testResult.test_start)}`} secondary="Beginn des Test-Zeitraums" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary={`Test Ende: ${formatDate(testResult.test_end)}`} secondary="Ende des Test-Zeitraums" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary={`Dauer: ${testResult.test_duration_days?.toFixed(2) || 'N/A'} Tage`} secondary="Test-Zeitraum in Tagen" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary={`Durchgeführt: ${formatDate(testResult.created_at)}`} secondary="Zeitpunkt der Test-Durchführung" />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ color: '#00d4ff' }}>
                  🤖 Modell-Details
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary={`Modell: ${modelDetails?.name || testResult.model_name || `ID ${testResult.model_id}`}`} 
                      secondary="Name des getesteten Modells" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary={`Typ: ${modelDetails?.model_type || 'N/A'}`} 
                      secondary="XGBoost oder Random Forest" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary={`Features: ${modelDetails?.features?.length || 'N/A'} Stück`} 
                      secondary="Anzahl der verwendeten Features" 
                    />
                  </ListItem>
                  {modelDetails?.phases && modelDetails.phases.length > 0 && (
                    <ListItem>
                      <ListItemText 
                        primary={`Phasen: ${modelDetails.phases.join(', ')}`} 
                        secondary="Coin-Phasen die beim Training verwendet wurden" 
                      />
                    </ListItem>
                  )}
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Modell-Parameter */}
          {modelDetails?.params && (
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ color: '#00d4ff' }}>
                    ⚡ Trainings-Parameter
                  </Typography>
                  <List dense>
                    {modelDetails.params._time_based && (
                      <>
                        <ListItem>
                          <ListItemText 
                            primary={`Vorhersage: ${modelDetails.params._time_based.min_percent_change}% in ${modelDetails.params._time_based.future_minutes} Min`} 
                            secondary={`Richtung: ${modelDetails.params._time_based.direction === 'up' ? '📈 Pump (Steigerung)' : '📉 Dump (Absturz)'}`}
                          />
                        </ListItem>
                      </>
                    )}
                    {modelDetails.params.scale_pos_weight && (
                      <ListItem>
                        <ListItemText 
                          primary={`Scale Pos Weight: ${modelDetails.params.scale_pos_weight}`} 
                          secondary="Gewichtung für seltene Pump-Events" 
                        />
                      </ListItem>
                    )}
                    {modelDetails.params.use_smote && (
                      <ListItem>
                        <ListItemText 
                          primary="SMOTE: Aktiviert" 
                          secondary="Synthetic Minority Over-sampling" 
                        />
                      </ListItem>
                    )}
                    {modelDetails.params.use_engineered_features && (
                      <ListItem>
                        <ListItemText 
                          primary="Feature Engineering: Aktiviert" 
                          secondary={`Windows: ${modelDetails.params.feature_engineering_windows?.join(', ') || '5, 10, 15'} Min`}
                        />
                      </ListItem>
                    )}
                  </List>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Features-Liste */}
          {modelDetails?.features && modelDetails.features.length > 0 && (
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ color: '#00d4ff' }}>
                    📊 Verwendete Features ({modelDetails.features.length})
                  </Typography>
                  <Box sx={{ maxHeight: 250, overflow: 'auto' }}>
                    {modelDetails.features.slice(0, 20).map((feature: string, idx: number) => (
                      <Chip
                        key={idx}
                        label={feature}
                        size="small"
                        sx={{ m: 0.5, bgcolor: 'rgba(0, 212, 255, 0.1)' }}
                      />
                    ))}
                    {modelDetails.features.length > 20 && (
                      <Chip
                        label={`+${modelDetails.features.length - 20} weitere`}
                        size="small"
                        sx={{ m: 0.5, bgcolor: 'rgba(255, 152, 0, 0.2)' }}
                      />
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Test-Statistiken */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ color: '#00d4ff' }}>
                  📈 Test-Statistiken (Confusion Matrix)
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6} md={3}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'rgba(76, 175, 80, 0.1)', borderRadius: 2 }}>
                      <Typography variant="h4" sx={{ color: '#4caf50' }}>{testResult.confusion_matrix?.tp || 0}</Typography>
                      <Typography variant="body2" color="text.secondary">True Positive</Typography>
                      <Typography variant="caption" color="text.secondary">Richtig erkannte Pumps</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'rgba(244, 67, 54, 0.1)', borderRadius: 2 }}>
                      <Typography variant="h4" sx={{ color: '#f44336' }}>{testResult.confusion_matrix?.fp || 0}</Typography>
                      <Typography variant="body2" color="text.secondary">False Positive</Typography>
                      <Typography variant="caption" color="text.secondary">Falsche Pump-Alarme</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'rgba(255, 152, 0, 0.1)', borderRadius: 2 }}>
                      <Typography variant="h4" sx={{ color: '#ff9800' }}>{testResult.confusion_matrix?.fn || 0}</Typography>
                      <Typography variant="body2" color="text.secondary">False Negative</Typography>
                      <Typography variant="caption" color="text.secondary">Verpasste Pumps</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'rgba(76, 175, 80, 0.1)', borderRadius: 2 }}>
                      <Typography variant="h4" sx={{ color: '#4caf50' }}>{testResult.confusion_matrix?.tn || 0}</Typography>
                      <Typography variant="body2" color="text.secondary">True Negative</Typography>
                      <Typography variant="caption" color="text.secondary">Richtig erkannte Nicht-Pumps</Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        {/* Rohdaten */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ color: '#00d4ff' }}>
              📋 Rohdaten (JSON)
            </Typography>

            <Alert severity="info" sx={{ mb: 2 }}>
              Diese Daten können für detaillierte Analysen oder zur Weiterverarbeitung exportiert werden.
            </Alert>

            <Box sx={{
              bgcolor: 'rgba(0, 0, 0, 0.3)',
              p: 2,
              borderRadius: 1,
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              maxHeight: '600px',
              overflow: 'auto',
              whiteSpace: 'pre-wrap'
            }}>
              {JSON.stringify(testResult, null, 2)}
            </Box>
          </CardContent>
        </Card>
      </TabPanel>
    </Box>
  );
};

import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Assessment as TestIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  ExpandMore as ExpandMoreIcon,
  Download as DownloadIcon,
  Share as ShareIcon,
} from '@mui/icons-material';
import { mlApi as apiService } from '../services/api';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

export default TestResultDetails;