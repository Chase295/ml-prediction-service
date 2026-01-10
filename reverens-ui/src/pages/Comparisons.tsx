import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  CardActions,
  Chip,
  Avatar,
  Grid,
  IconButton
} from '@mui/material';
import {
  CompareArrows as CompareIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  EmojiEvents as TrophyIcon
} from '@mui/icons-material';
import { mlApi } from '../services/api';
import { ComparisonResponse } from '../services/api';

const Comparisons: React.FC = () => {
  const navigate = useNavigate();
  const [comparisons, setComparisons] = useState<ComparisonResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadComparisons = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await mlApi.getComparisons();
      setComparisons(data);
    } catch (err: any) {
      setError(err.message || 'Fehler beim Laden der Vergleiche');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComparisons();
  }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Möchtest du diesen Vergleich wirklich löschen?')) {
      return;
    }
    try {
      await mlApi.deleteComparison(id.toString());
      await loadComparisons();
    } catch (err: any) {
      setError(err.message || 'Fehler beim Löschen');
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('de-DE');
  };

  const formatDuration = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const hours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
    return `${hours.toFixed(1)}h`;
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ 
            width: 56, height: 56, 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
          }}>
            <CompareIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Box>
            <Typography variant="h4" fontWeight="bold">
              Vergleichs-Übersicht
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Alle Modell-Vergleiche im Überblick
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadComparisons}
          >
            Aktualisieren
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/compare')}
            sx={{ bgcolor: '#667eea' }}
          >
            Neuer Vergleich
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {comparisons.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Keine Vergleiche gefunden
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/compare')}
            sx={{ mt: 2, bgcolor: '#667eea' }}
          >
            Ersten Vergleich erstellen
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {comparisons.map((comparison) => (
            <Grid item xs={12} md={6} key={comparison.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                    <Box>
                      <Typography variant="h6" fontWeight="bold">
                        Vergleich #{comparison.id}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(comparison.created_at)}
                      </Typography>
                    </Box>
                    {comparison.winner_id && (
                      <Chip
                        icon={<TrophyIcon />}
                        label={`Gewinner: #${comparison.winner_id}`}
                        color="success"
                        size="small"
                      />
                    )}
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Modelle: {comparison.model_ids.join(', ')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Test-Zeitraum: {formatDuration(comparison.test_start, comparison.test_end)}
                    </Typography>
                    {comparison.num_samples && (
                      <Typography variant="body2" color="text.secondary">
                        Samples: {comparison.num_samples.toLocaleString()}
                      </Typography>
                    )}
                  </Box>

                  {comparison.results && comparison.results.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Top 3:
                      </Typography>
                      {comparison.results
                        .sort((a: any, b: any) => (b.avg_score || 0) - (a.avg_score || 0))
                        .slice(0, 3)
                        .map((result: any, idx: number) => (
                          <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="body2">
                              {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'} Modell #{result.model_id}
                            </Typography>
                            <Typography variant="body2" fontWeight="bold">
                              Score: {(result.avg_score * 100).toFixed(1)}%
                            </Typography>
                          </Box>
                        ))}
                    </Box>
                  )}

                  {comparison.winner_reason && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>
                      {comparison.winner_reason}
                    </Typography>
                  )}
                </CardContent>
                <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                  <Button
                    size="small"
                    startIcon={<ViewIcon />}
                    onClick={() => navigate(`/comparisons/${comparison.id}`)}
                  >
                    Details
                  </Button>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDelete(comparison.id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
};

export default Comparisons;
