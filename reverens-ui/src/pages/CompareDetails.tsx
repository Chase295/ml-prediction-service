import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Chip,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Grid,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  CompareArrows as CompareIcon,
  EmojiEvents as TrophyIcon,
  ContentCopy as CopyIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import { mlApi } from '../services/api';
import { ComparisonResponse } from '../services/api';

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
      id={`comparison-tabpanel-${index}`}
      aria-labelledby={`comparison-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const CompareDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [comparison, setComparison] = useState<ComparisonResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    if (id) {
      loadComparison();
    }
  }, [id]);

  const loadComparison = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await mlApi.getComparison(id);
      setComparison(data);
    } catch (err: any) {
      setError(err.message || 'Fehler beim Laden des Vergleichs');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('de-DE');
  };

  const formatPercentage = (value: number | undefined) => {
    if (value === undefined || value === null) return 'N/A';
    return `${(value * 100).toFixed(2)}%`;
  };

  const formatNumber = (value: number | undefined) => {
    if (value === undefined || value === null) return 'N/A';
    return value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const downloadJson = () => {
    if (!comparison) return;
    const dataStr = JSON.stringify(comparison, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `comparison-${comparison.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error || !comparison) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Alert severity="error">{error || 'Vergleich nicht gefunden'}</Alert>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/comparisons')} sx={{ mt: 2 }}>
          Zurück zur Übersicht
        </Button>
      </Container>
    );
  }

  // Sortiere Ergebnisse nach Score
  const sortedResults = [...(comparison.results || [])].sort(
    (a: any, b: any) => (b.avg_score || 0) - (a.avg_score || 0)
  );

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/comparisons')} sx={{ mr: 1 }}>
            <BackIcon />
          </IconButton>
          <Avatar sx={{ 
            width: 56, height: 56, 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
          }}>
            <CompareIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Box>
            <Typography variant="h4" fontWeight="bold">
              Vergleich #{comparison.id}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {formatDate(comparison.created_at)}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="JSON kopieren">
            <IconButton onClick={() => copyToClipboard(JSON.stringify(comparison, null, 2))}>
              <CopyIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="JSON downloaden">
            <IconButton onClick={downloadJson}>
              <DownloadIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Info Box */}
      <Paper sx={{ p: 3, mb: 3, bgcolor: 'rgba(102, 126, 234, 0.1)' }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Typography variant="body2" color="text.secondary">Modelle</Typography>
            <Typography variant="h6">{comparison.model_ids.join(', ')}</Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="body2" color="text.secondary">Test-Zeitraum</Typography>
            <Typography variant="h6">
              {formatDate(comparison.test_start)} - {formatDate(comparison.test_end)}
            </Typography>
          </Grid>
          {comparison.winner_id && (
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="text.secondary">Gewinner</Typography>
              <Chip
                icon={<TrophyIcon />}
                label={`Modell #${comparison.winner_id}`}
                color="success"
                sx={{ fontSize: '1rem', height: '32px' }}
              />
            </Grid>
          )}
        </Grid>
        {comparison.winner_reason && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              {comparison.winner_reason}
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label="Ranking" />
          <Tab label="Metriken-Vergleich" />
          <Tab label="Confusion Matrix" />
          <Tab label="Rohdaten" />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <TabPanel value={tabValue} index={0}>
        {/* Ranking */}
        <Grid container spacing={3}>
          {sortedResults.map((result: any, idx: number) => {
            const medals = ['🥇', '🥈', '🥉'];
            const medal = idx < 3 ? medals[idx] : `${idx + 1}.`;
            const isWinner = comparison.winner_id === result.model_id;
            
            return (
              <Grid item xs={12} md={6} key={result.model_id}>
                <Card sx={{ 
                  height: '100%',
                  border: isWinner ? '2px solid #4caf50' : '1px solid rgba(255, 255, 255, 0.1)',
                  bgcolor: isWinner ? 'rgba(76, 175, 80, 0.1)' : undefined
                }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                      <Box>
                        <Typography variant="h5" fontWeight="bold">
                          {medal} Modell #{result.model_id}
                        </Typography>
                        {isWinner && (
                          <Chip
                            icon={<TrophyIcon />}
                            label="Gewinner"
                            color="success"
                            size="small"
                            sx={{ mt: 1 }}
                          />
                        )}
                      </Box>
                      <Typography variant="h4" color="primary">
                        {(result.avg_score * 100).toFixed(1)}%
                      </Typography>
                    </Box>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">Accuracy</Typography>
                        <Typography variant="h6">{formatPercentage(result.accuracy)}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">F1-Score</Typography>
                        <Typography variant="h6">{formatPercentage(result.f1_score)}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">Precision</Typography>
                        <Typography variant="h6">{formatPercentage(result.precision_score)}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">Recall</Typography>
                        <Typography variant="h6">{formatPercentage(result.recall)}</Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary">Simulierter Profit</Typography>
                        <Typography variant="h6" sx={{ color: result.simulated_profit_pct >= 0 ? '#4caf50' : '#f44336' }}>
                          {formatNumber(result.simulated_profit_pct)}%
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        {/* Metriken-Vergleich */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Metrik</TableCell>
                {sortedResults.map((result: any) => (
                  <TableCell key={result.model_id} align="right">
                    Modell #{result.model_id}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>Durchschnitts-Score</TableCell>
                {sortedResults.map((result: any) => (
                  <TableCell key={result.model_id} align="right">
                    {(result.avg_score * 100).toFixed(2)}%
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell>Accuracy</TableCell>
                {sortedResults.map((result: any) => (
                  <TableCell key={result.model_id} align="right">
                    {formatPercentage(result.accuracy)}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell>F1-Score</TableCell>
                {sortedResults.map((result: any) => (
                  <TableCell key={result.model_id} align="right">
                    {formatPercentage(result.f1_score)}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell>Precision</TableCell>
                {sortedResults.map((result: any) => (
                  <TableCell key={result.model_id} align="right">
                    {formatPercentage(result.precision_score)}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell>Recall</TableCell>
                {sortedResults.map((result: any) => (
                  <TableCell key={result.model_id} align="right">
                    {formatPercentage(result.recall)}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell>ROC-AUC</TableCell>
                {sortedResults.map((result: any) => (
                  <TableCell key={result.model_id} align="right">
                    {formatPercentage(result.roc_auc)}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell>MCC</TableCell>
                {sortedResults.map((result: any) => (
                  <TableCell key={result.model_id} align="right">
                    {formatNumber(result.mcc)}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell>FPR</TableCell>
                {sortedResults.map((result: any) => (
                  <TableCell key={result.model_id} align="right">
                    {formatPercentage(result.fpr)}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell>FNR</TableCell>
                {sortedResults.map((result: any) => (
                  <TableCell key={result.model_id} align="right">
                    {formatPercentage(result.fnr)}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell>Simulierter Profit</TableCell>
                {sortedResults.map((result: any) => (
                  <TableCell 
                    key={result.model_id} 
                    align="right"
                    sx={{ color: result.simulated_profit_pct >= 0 ? '#4caf50' : '#f44336' }}
                  >
                    {formatNumber(result.simulated_profit_pct)}%
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell>Samples</TableCell>
                {sortedResults.map((result: any) => (
                  <TableCell key={result.model_id} align="right">
                    {result.num_samples?.toLocaleString() || 'N/A'}
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        {/* Confusion Matrix */}
        <Grid container spacing={3}>
          {sortedResults.map((result: any) => (
            <Grid item xs={12} md={6} key={result.model_id}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Modell #{result.model_id}
                  </Typography>
                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={6}>
                      <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'rgba(76, 175, 80, 0.1)', borderRadius: 2 }}>
                        <Typography variant="h4" sx={{ color: '#4caf50' }}>{result.tp || 0}</Typography>
                        <Typography variant="body2" color="text.secondary">True Positive</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'rgba(244, 67, 54, 0.1)', borderRadius: 2 }}>
                        <Typography variant="h4" sx={{ color: '#f44336' }}>{result.fp || 0}</Typography>
                        <Typography variant="body2" color="text.secondary">False Positive</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'rgba(244, 67, 54, 0.1)', borderRadius: 2 }}>
                        <Typography variant="h4" sx={{ color: '#f44336' }}>{result.fn || 0}</Typography>
                        <Typography variant="body2" color="text.secondary">False Negative</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'rgba(76, 175, 80, 0.1)', borderRadius: 2 }}>
                        <Typography variant="h4" sx={{ color: '#4caf50' }}>{result.tn || 0}</Typography>
                        <Typography variant="body2" color="text.secondary">True Negative</Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        {/* Rohdaten */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
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
              {JSON.stringify(comparison, null, 2)}
            </Box>
          </CardContent>
        </Card>
      </TabPanel>
    </Container>
  );
};

export default CompareDetails;
