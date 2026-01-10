import React, { useEffect, useState } from 'react';
import {
  Container, Typography, Paper, Box, Card, CardContent, Button,
  Grid, Chip, CircularProgress, Alert, TextField, IconButton, Tooltip,
  Avatar, Checkbox, Fade, Zoom, Badge
} from '@mui/material';
import {
  Compare as CompareIcon,
  PlayArrow,
  CheckCircle,
  RadioButtonUnchecked,
  Close,
  History,
  Speed,
  TrendingUp,
  Psychology,
  Timer,
  CalendarMonth
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { mlApi } from '../services/api';

interface Model {
  id: number;
  name: string;
  model_type: string;
  accuracy?: number;
  f1_score?: number;
  features?: string[];
  phases?: number[];
  created_at?: string;
}

const Compare: React.FC = () => {
  const navigate = useNavigate();
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModels, setSelectedModels] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobProgress, setJobProgress] = useState<string>('');
  
  // Testzeitraum
  const [testStart, setTestStart] = useState<string>('');
  const [testEnd, setTestEnd] = useState<string>('');

  useEffect(() => {
    loadModels();
  }, []);

  // Standard-Zeitraum (letzte 2 Stunden)
  useEffect(() => {
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    setTestEnd(now.toISOString().slice(0, 16));
    setTestStart(twoHoursAgo.toISOString().slice(0, 16));
  }, []);

  const loadModels = async () => {
    setLoading(true);
    try {
      const modelsData = await mlApi.getModels();
      setModels(modelsData);
    } catch (err: any) {
      setError(err.message || 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  };

  const toggleModel = (modelId: number) => {
    setSelectedModels(prev => {
      if (prev.includes(modelId)) {
        return prev.filter(id => id !== modelId);
      } else if (prev.length < 4) {
        return [...prev, modelId];
      }
      return prev;
    });
  };

  const startComparison = async () => {
    if (selectedModels.length < 2) {
      setError('Wähle mindestens 2 Modelle aus');
      return;
    }

    setComparing(true);
    setError(null);
    setJobProgress('Starte Vergleich...');

    try {
      const result = await mlApi.compareModels(
        selectedModels,
        new Date(testStart).toISOString(),
        new Date(testEnd).toISOString()
      );
      
      pollJobStatus(result.job_id);
    } catch (err: any) {
      setError(err.message || 'Fehler beim Starten des Vergleichs');
      setComparing(false);
    }
  };

  const pollJobStatus = async (id: number) => {
    const poll = async () => {
      try {
        const job = await mlApi.getJob(String(id));
        setJobProgress(job.progress_msg || 'Verarbeite...');

        if (job.status === 'COMPLETED') {
          setComparing(false);
          setSelectedModels([]);
          // Navigiere zur Vergleichs-Übersicht
          navigate(`/comparisons/${job.result_comparison_id}`);
        } else if (job.status === 'FAILED') {
          setError(job.error_msg || 'Job fehlgeschlagen');
          setComparing(false);
        } else {
          setTimeout(poll, 2000);
        }
      } catch (err) {
        setTimeout(poll, 3000);
      }
    };
    poll();
  };

  const getModelColor = (index: number) => {
    const colors = [
      { bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: '#667eea' },
      { bg: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', border: '#11998e' },
      { bg: 'linear-gradient(135deg, #fc4a1a 0%, #f7b733 100%)', border: '#fc4a1a' },
      { bg: 'linear-gradient(135deg, #00c6fb 0%, #005bea 100%)', border: '#00c6fb' }
    ];
    return colors[index % colors.length];
  };

  const getSlotLabel = (index: number) => {
    return ['A', 'B', 'C', 'D'][index];
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
              Modell-Vergleich
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Wähle bis zu 4 Modelle und vergleiche ihre Performance
            </Typography>
          </Box>
        </Box>
        <Button
          variant="outlined"
          startIcon={<History />}
          onClick={() => navigate('/comparisons')}
        >
          Bisherige Vergleiche
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Ausgewählte Modelle Slots */}
      <Paper sx={{ p: 3, mb: 4, background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}>
        <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
          🎯 Ausgewählte Modelle ({selectedModels.length}/4)
        </Typography>
        
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[0, 1, 2, 3].map((slot) => {
            const modelId = selectedModels[slot];
            const model = modelId ? models.find(m => m.id === modelId) : null;
            const color = getModelColor(slot);
            
            return (
              <Grid item xs={6} md={3} key={slot}>
                <Zoom in={true} style={{ transitionDelay: `${slot * 100}ms` }}>
                  <Card 
                    sx={{ 
                      height: 140,
                      border: model ? `3px solid ${color.border}` : '3px dashed rgba(255,255,255,0.2)',
                      background: model ? color.bg : 'transparent',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      transition: 'all 0.3s ease',
                      position: 'relative',
                      overflow: 'visible'
                    }}
                  >
                    {/* Slot Label */}
                    <Badge
                      badgeContent={getSlotLabel(slot)}
                      sx={{
                        position: 'absolute',
                        top: -12,
                        left: 16,
                        '& .MuiBadge-badge': {
                          background: model ? color.bg : 'rgba(255,255,255,0.1)',
                          color: 'white',
                          fontSize: '1rem',
                          fontWeight: 'bold',
                          width: 28,
                          height: 28,
                          borderRadius: '50%'
                        }
                      }}
                    />
                    
                    {model ? (
                      <CardContent sx={{ textAlign: 'center', width: '100%' }}>
                        <IconButton
                          size="small"
                          onClick={() => toggleModel(modelId)}
                          sx={{ 
                            position: 'absolute', 
                            top: 4, 
                            right: 4,
                            color: 'white',
                            bgcolor: 'rgba(0,0,0,0.3)',
                            '&:hover': { bgcolor: 'rgba(255,0,0,0.5)' }
                          }}
                        >
                          <Close fontSize="small" />
                        </IconButton>
                        <Typography variant="h5" fontWeight="bold" sx={{ color: 'white' }}>
                          #{model.id}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', mb: 1 }}>
                          {model.name || model.model_type}
                        </Typography>
                        {model.f1_score !== undefined && (
                          <Chip 
                            size="small"
                            icon={<Speed sx={{ color: 'white !important' }} />}
                            label={`F1: ${(model.f1_score * 100).toFixed(1)}%`}
                            sx={{ 
                              bgcolor: 'rgba(255,255,255,0.2)', 
                              color: 'white',
                              '& .MuiChip-icon': { color: 'white' }
                            }}
                          />
                        )}
                      </CardContent>
                    ) : (
                      <Box sx={{ textAlign: 'center', color: 'text.secondary' }}>
                        <RadioButtonUnchecked sx={{ fontSize: 40, opacity: 0.3 }} />
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          Slot {getSlotLabel(slot)}
                        </Typography>
                        <Typography variant="caption">
                          {slot < 2 ? 'Erforderlich' : 'Optional'}
                        </Typography>
                      </Box>
                    )}
                  </Card>
                </Zoom>
              </Grid>
            );
          })}
        </Grid>

        {/* Testzeitraum */}
        <Paper sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.05)', mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <CalendarMonth /> Testzeitraum
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Start"
                type="datetime-local"
                value={testStart}
                onChange={(e) => setTestStart(e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Ende"
                type="datetime-local"
                value={testEnd}
                onChange={(e) => setTestEnd(e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
            </Grid>
          </Grid>
        </Paper>

        {/* Start Button */}
        <Button
          variant="contained"
          size="large"
          fullWidth
          startIcon={comparing ? <CircularProgress size={24} color="inherit" /> : <PlayArrow />}
          onClick={startComparison}
          disabled={selectedModels.length < 2 || comparing}
          sx={{ 
            py: 2,
            fontSize: '1.1rem',
            background: selectedModels.length >= 2 
              ? 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)'
              : 'rgba(255,255,255,0.1)',
            '&:hover': { 
              background: 'linear-gradient(90deg, #764ba2 0%, #667eea 100%)' 
            },
            '&.Mui-disabled': {
              background: 'rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.3)'
            }
          }}
        >
          {comparing 
            ? jobProgress 
            : selectedModels.length < 2 
              ? `Noch ${2 - selectedModels.length} Modell(e) auswählen` 
              : `🚀 Vergleich starten (${selectedModels.length} Modelle)`}
        </Button>
      </Paper>

      {/* Modell-Auswahl Grid */}
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Psychology /> Verfügbare Modelle ({models.length})
      </Typography>

      <Grid container spacing={2}>
        {models.map((model) => {
          const isSelected = selectedModels.includes(model.id);
          const selectedIndex = selectedModels.indexOf(model.id);
          const isDisabled = selectedModels.length >= 4 && !isSelected;
          const color = isSelected ? getModelColor(selectedIndex) : null;
          
          return (
            <Grid item xs={12} sm={6} md={4} lg={3} key={model.id}>
              <Fade in={true}>
                <Card 
                  onClick={() => !isDisabled && toggleModel(model.id)}
                  sx={{ 
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    opacity: isDisabled ? 0.4 : 1,
                    border: isSelected ? `3px solid ${color?.border}` : '1px solid rgba(255,255,255,0.1)',
                    background: isSelected 
                      ? `linear-gradient(135deg, ${color?.border}22 0%, transparent 100%)`
                      : 'rgba(255,255,255,0.02)',
                    transition: 'all 0.2s ease',
                    '&:hover': !isDisabled ? { 
                      transform: 'translateY(-4px)',
                      boxShadow: isSelected ? `0 8px 24px ${color?.border}44` : 8
                    } : {}
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          {isSelected ? (
                            <Avatar sx={{ 
                              width: 28, height: 28, 
                              background: color?.bg,
                              fontSize: '0.9rem',
                              fontWeight: 'bold'
                            }}>
                              {getSlotLabel(selectedIndex)}
                            </Avatar>
                          ) : (
                            <Checkbox 
                              checked={false}
                              disabled={isDisabled}
                              size="small"
                              sx={{ p: 0 }}
                            />
                          )}
                          <Typography variant="h6" fontWeight="bold">
                            #{model.id}
                          </Typography>
                        </Box>
                        
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {model.name || model.model_type}
                        </Typography>
                      </Box>
                      
                      {isSelected && (
                        <CheckCircle sx={{ color: color?.border, fontSize: 28 }} />
                      )}
                    </Box>
                    
                    {/* Metriken */}
                    <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
                      {model.accuracy !== undefined && (
                        <Chip
                          size="small"
                          label={`Acc: ${(model.accuracy * 100).toFixed(0)}%`}
                          sx={{ 
                            bgcolor: isSelected ? `${color?.border}33` : 'rgba(255,255,255,0.1)',
                            fontSize: '0.7rem'
                          }}
                        />
                      )}
                      {model.f1_score !== undefined && (
                        <Chip
                          size="small"
                          icon={<TrendingUp sx={{ fontSize: '14px !important' }} />}
                          label={`F1: ${(model.f1_score * 100).toFixed(0)}%`}
                          color={model.f1_score > 0.1 ? 'success' : 'default'}
                          sx={{ fontSize: '0.7rem' }}
                        />
                      )}
                    </Box>
                    
                    {/* Features Info */}
                    {model.features && model.features.length > 0 && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        {model.features.length} Features
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Fade>
            </Grid>
          );
        })}
      </Grid>

      {models.length === 0 && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Keine Modelle gefunden. Trainiere zuerst ein Modell!
        </Alert>
      )}
    </Container>
  );
};

export default Compare;
