import React, { useState, useEffect } from 'react'
import {
  Container, Typography, Paper, Box, Button, Alert, Card, CardContent,
  FormControl, InputLabel, Select, MenuItem, CircularProgress,
  Chip, Grid, Divider, TextField
} from '@mui/material'
import { PlayArrow, Assessment, Timeline, TrendingUp, Error, CheckCircle, Schedule, Event } from '@mui/icons-material'
import { mlApi } from '../services/api'
import { ModelResponse } from '../types/api'

const Testing: React.FC = () => {
  const [models, setModels] = useState<ModelResponse[]>([])
  const [selectedModelId, setSelectedModelId] = useState<string>('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isTesting, setIsTesting] = useState(false)
  const [testResults, setTestResults] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadModels()
  }, [])

  const loadModels = async () => {
    try {
      const response = await mlApi.getModels()
      setModels(response)
    } catch (err) {
      console.error('Error loading models:', err)
      setError('Fehler beim Laden der Modelle')
    } finally {
      setLoading(false)
    }
  }

  const handleTestModel = async () => {
    if (!selectedModelId || !startDate || !endDate) {
      setError('Bitte wähle ein Modell und einen Zeitraum aus!')
      return
    }

    try {
      setIsTesting(true)
      setError(null)
      setTestResults(null)

      const response = await fetch(`/api/models/${selectedModelId}/test?test_start=${startDate}&test_end=${endDate}`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Test fehlgeschlagen')
      }

      const result = await response.json()
      alert(`Test-Job erstellt! Job-ID: ${result.job_id}. Warte auf Ergebnisse...`)

      // Poll for results
      pollForResults(result.job_id)

    } catch (error) {
      console.error('Test failed:', error)
      setError('Test fehlgeschlagen. Überprüfe die Logs.')
      setIsTesting(false)
    }
  }

  const pollForResults = async (jobId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/queue/${jobId}`)
        const job = await response.json()

        if (job.status === 'COMPLETED') {
          clearInterval(pollInterval)
          setIsTesting(false)

          // Load test results
          await loadTestResults(selectedModelId)
        } else if (job.status === 'FAILED') {
          clearInterval(pollInterval)
          setIsTesting(false)
          setError(`Test fehlgeschlagen: ${job.error_msg || 'Unbekannter Fehler'}`)
        }
      } catch (err) {
        console.error('Error polling job:', err)
      }
    }, 2000)

    // Timeout after 2 minutes
    setTimeout(() => {
      clearInterval(pollInterval)
      setIsTesting(false)
      setError('Test-Timeout. Versuche es später nochmal.')
    }, 120000)
  }

  const loadTestResults = async (modelId: string) => {
    try {
      const response = await fetch(`/api/test-results`)
      const results = await response.json()

      // Find the latest result for this model
      const modelResults = results.filter((r: any) => r.model_id === parseInt(modelId))
      if (modelResults.length > 0) {
        const latestResult = modelResults.sort((a: any, b: any) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0]
        setTestResults(latestResult)
      }
    } catch (err) {
      console.error('Error loading test results:', err)
    }
  }

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    )
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ color: '#00d4ff', fontWeight: 'bold', mb: 4 }}>
        🧪 Modell-Testing & Backtesting
      </Typography>

      <Alert severity="info" sx={{ mb: 4 }}>
        <Typography variant="body2">
          <strong>Teste deine ML-Modelle auf historischen Daten!</strong>
          <br />Wähle einfach ein Modell und einen Zeitraum - das System zeigt dir, wie gut es in der Vergangenheit performt hätte.
        </Typography>
      </Alert>

      {/* Test-Konfiguration */}
      <Paper sx={{
        p: 4,
        mb: 4,
        background: 'linear-gradient(135deg, rgba(26, 26, 46, 0.8) 0%, rgba(22, 33, 62, 0.8) 100%)',
        border: '1px solid rgba(0, 212, 255, 0.2)',
        borderRadius: '16px',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ color: '#00d4ff', fontWeight: 'bold', mr: 2 }}>
            ⚙️ Test-Konfiguration
          </Typography>
          <Chip
            label="Schnell & Einfach"
            size="small"
            sx={{
              background: 'rgba(0, 212, 255, 0.2)',
              color: '#00d4ff',
              border: '1px solid rgba(0, 212, 255, 0.3)',
            }}
          />
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel sx={{ color: 'rgba(255, 255, 255, 0.7)', '&.Mui-focused': { color: '#00d4ff' } }}>
                🤖 Modell auswählen
              </InputLabel>
              <Select
                value={selectedModelId}
                onChange={(e) => setSelectedModelId(e.target.value)}
                label="🤖 Modell auswählen"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    '& fieldset': {
                      borderColor: 'rgba(0, 212, 255, 0.3)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(0, 212, 255, 0.5)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#00d4ff',
                    },
                  },
                  '& .MuiSelect-select': {
                    color: 'white',
                  },
                }}
              >
                {models.map((model) => (
                  <MenuItem key={model.id} value={model.id.toString()}>
                    <Box sx={{ py: 1 }}>
                      <Typography variant="body2" fontWeight="bold" sx={{ color: '#00d4ff' }}>
                        {model.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                        {model.model_type} • {model.features?.length || 0} Features • Genauigkeit: {model.training_accuracy ? (model.training_accuracy * 100).toFixed(1) : 'N/A'}%
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Start-Zeitpunkt (UTC)"
              type="datetime-local"
              value={startDate.replace('Z', '')}
              onChange={(e) => setStartDate(e.target.value + 'Z')}
              InputProps={{
                startAdornment: (
                  <Schedule sx={{ color: 'action.active', mr: 1 }} />
                ),
              }}
              InputLabelProps={{
                shrink: true,
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  '& fieldset': {
                    borderColor: 'rgba(0, 212, 255, 0.3)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(0, 212, 255, 0.5)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#00d4ff',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: 'rgba(255, 255, 255, 0.7)',
                  '&.Mui-focused': {
                    color: '#00d4ff',
                  },
                },
                '& .MuiInputBase-input': {
                  color: 'white',
                },
              }}
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Ende-Zeitpunkt (UTC)"
              type="datetime-local"
              value={endDate.replace('Z', '')}
              onChange={(e) => setEndDate(e.target.value + 'Z')}
              InputProps={{
                startAdornment: (
                  <Schedule sx={{ color: 'action.active', mr: 1 }} />
                ),
              }}
              InputLabelProps={{
                shrink: true,
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  '& fieldset': {
                    borderColor: 'rgba(0, 212, 255, 0.3)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(0, 212, 255, 0.5)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#00d4ff',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: 'rgba(255, 255, 255, 0.7)',
                  '&.Mui-focused': {
                    color: '#00d4ff',
                  },
                },
                '& .MuiInputBase-input': {
                  color: 'white',
                },
              }}
            />
          </Grid>

          <Grid item xs={12} md={2}>
            <Button
              variant="contained"
              size="large"
              startIcon={isTesting ? <CircularProgress size={20} /> : <PlayArrow />}
              onClick={handleTestModel}
              disabled={!selectedModelId || !startDate || !endDate || isTesting}
              sx={{
                height: '56px',
                mt: 2.5,
                background: isTesting
                  ? 'rgba(255, 255, 255, 0.1)'
                  : 'linear-gradient(45deg, #00d4ff 30%, #0099cc 90%)',
                border: '1px solid rgba(0, 212, 255, 0.5)',
                boxShadow: isTesting
                  ? 'none'
                  : '0 3px 5px 2px rgba(0, 212, 255, .3)',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '1.1em',
                '&:hover': {
                  background: isTesting
                    ? 'rgba(255, 255, 255, 0.1)'
                    : 'linear-gradient(45deg, #0099cc 30%, #00d4ff 90%)',
                  boxShadow: isTesting
                    ? 'none'
                    : '0 6px 10px 2px rgba(0, 212, 255, .4)',
                },
                '&:disabled': {
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'rgba(255, 255, 255, 0.3)',
                },
              }}
              fullWidth
            >
              {isTesting ? '🧪 Teste...' : '🚀 Test starten'}
            </Button>
          </Grid>
        </Grid>

        {/* Vorgeschlagene Zeiträume */}
        <Box sx={{ mt: 3 }}>
          <Typography variant="body2" gutterBottom fontWeight="bold" sx={{ color: '#00d4ff' }}>
            💡 Empfohlene Test-Zeiträume (klick einfach drauf):
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
            <Chip
              label="🏋️ Trainings-Zeitraum (1h)"
              variant="outlined"
              clickable
              onClick={() => {
                setStartDate('2025-12-31T10:00:00Z')
                setEndDate('2025-12-31T11:00:00Z')
              }}
              sx={{
                borderColor: 'rgba(0, 212, 255, 0.3)',
                color: 'rgba(255, 255, 255, 0.8)',
                '&:hover': {
                  borderColor: '#00d4ff',
                  backgroundColor: 'rgba(0, 212, 255, 0.1)',
                },
              }}
            />
            <Chip
              label="🔮 Nächste Stunde"
              variant="outlined"
              clickable
              onClick={() => {
                setStartDate('2025-12-31T11:00:00Z')
                setEndDate('2025-12-31T12:00:00Z')
              }}
              sx={{
                borderColor: 'rgba(0, 212, 255, 0.3)',
                color: 'rgba(255, 255, 255, 0.8)',
                '&:hover': {
                  borderColor: '#00d4ff',
                  backgroundColor: 'rgba(0, 212, 255, 0.1)',
                },
              }}
            />
            <Chip
              label="📊 Letzte Stunde"
              variant="outlined"
              clickable
              onClick={() => {
                const now = new Date()
                const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
                const nowStr = now.toISOString().replace('T', 'T').slice(0, 16) + 'Z'
                const agoStr = oneHourAgo.toISOString().replace('T', 'T').slice(0, 16) + 'Z'
                setStartDate(agoStr)
                setEndDate(nowStr)
              }}
              sx={{
                borderColor: 'rgba(0, 212, 255, 0.3)',
                color: 'rgba(255, 255, 255, 0.8)',
                '&:hover': {
                  borderColor: '#00d4ff',
                  backgroundColor: 'rgba(0, 212, 255, 0.1)',
                },
              }}
            />
            <Chip
              label="🎯 Aktuelle Stunde"
              variant="outlined"
              clickable
              onClick={() => {
                const now = new Date()
                const startOfHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0)
                const endOfHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 59, 59)
                const startStr = startOfHour.toISOString().replace('T', 'T').slice(0, 16) + 'Z'
                const endStr = endOfHour.toISOString().replace('T', 'T').slice(0, 16) + 'Z'
                setStartDate(startStr)
                setEndDate(endStr)
              }}
              sx={{
                borderColor: 'rgba(0, 212, 255, 0.3)',
                color: 'rgba(255, 255, 255, 0.8)',
                '&:hover': {
                  borderColor: '#00d4ff',
                  backgroundColor: 'rgba(0, 212, 255, 0.1)',
                },
              }}
            />
          </Box>
          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', mt: 1, display: 'block' }}>
            💡 Klicke auf einen Chip um die Felder automatisch auszufüllen
          </Typography>
        </Box>
      </Paper>

      {/* Test-Ergebnisse */}
      {testResults && (
        <Paper sx={{ p: 4 }}>
          <Typography variant="h6" gutterBottom sx={{ color: '#4caf50', fontWeight: 'bold' }}>
            📊 Test-Ergebnisse
          </Typography>

          <Grid container spacing={3}>
            {/* Haupt-Metriken */}
            <Grid item xs={12}>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 2, mb: 3 }}>
                <Card sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ color: testResults.accuracy && testResults.accuracy > 0.6 ? '#4caf50' : testResults.accuracy && testResults.accuracy > 0.4 ? '#ff9800' : '#f44336' }}>
                    {testResults.accuracy ? (testResults.accuracy * 100).toFixed(1) : 'N/A'}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Genauigkeit</Typography>
                </Card>

                <Card sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ color: testResults.f1_score && testResults.f1_score > 0.6 ? '#4caf50' : testResults.f1_score && testResults.f1_score > 0.4 ? '#ff9800' : '#f44336' }}>
                    {testResults.f1_score ? (testResults.f1_score * 100).toFixed(1) : 'N/A'}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">F1-Score</Typography>
                </Card>

                <Card sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ color: testResults.roc_auc && testResults.roc_auc > 0.7 ? '#4caf50' : testResults.roc_auc && testResults.roc_auc > 0.5 ? '#ff9800' : '#f44336' }}>
                    {testResults.roc_auc ? (testResults.roc_auc * 100).toFixed(1) : 'N/A'}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">ROC-AUC</Typography>
                </Card>

                <Card sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ color: testResults.simulated_profit_pct && testResults.simulated_profit_pct > 0 ? '#4caf50' : '#f44336' }}>
                    {testResults.simulated_profit_pct ? `${testResults.simulated_profit_pct > 0 ? '+' : ''}${testResults.simulated_profit_pct.toFixed(2)}%` : 'N/A'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Simulierter Profit</Typography>
                </Card>
              </Box>
            </Grid>

            {/* Confusion Matrix */}
            {testResults.confusion_matrix && (
              <Grid item xs={12} md={6}>
                <Card sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    📋 Confusion Matrix
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Was hätte dein Modell gesagt?
                  </Typography>

                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                    <Chip
                      label={`✅ True Positive: ${testResults.confusion_matrix.tp || 0}`}
                      color="success"
                      sx={{ fontWeight: 'bold', fontSize: '0.9em' }}
                    />
                    <Chip
                      label={`❌ False Positive: ${testResults.confusion_matrix.fp || 0}`}
                      color="warning"
                      sx={{ fontWeight: 'bold', fontSize: '0.9em' }}
                    />
                    <Chip
                      label={`✅ True Negative: ${testResults.confusion_matrix.tn || 0}`}
                      color="info"
                      sx={{ fontWeight: 'bold', fontSize: '0.9em' }}
                    />
                    <Chip
                      label={`❌ False Negative: ${testResults.confusion_matrix.fn || 0}`}
                      color="error"
                      sx={{ fontWeight: 'bold', fontSize: '0.9em' }}
                    />
                  </Box>
                </Card>
              </Grid>
            )}

            {/* Trading-Analyse */}
            {testResults.confusion_matrix && (
              <Grid item xs={12} md={6}>
                <Card sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    💼 Trading-Performance
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Wie hättest du performt?
                  </Typography>

                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 1 }}>
                    <Chip
                      label={`📈 Trades: ${testResults.confusion_matrix.tp + testResults.confusion_matrix.fp}`}
                      color="primary"
                      size="small"
                      sx={{ fontWeight: 'bold' }}
                    />
                    <Chip
                      label={`✅ Erfolgreich: ${testResults.confusion_matrix.tp}`}
                      color="success"
                      size="small"
                      sx={{ fontWeight: 'bold' }}
                    />
                    <Chip
                      label={`❌ Verlust: ${testResults.confusion_matrix.fp}`}
                      color="warning"
                      size="small"
                      sx={{ fontWeight: 'bold' }}
                    />
                    <Chip
                      label={`🎯 Win-Rate: ${testResults.confusion_matrix.tp + testResults.confusion_matrix.fp > 0 ? ((testResults.confusion_matrix.tp / (testResults.confusion_matrix.tp + testResults.confusion_matrix.fp)) * 100).toFixed(1) : '0.0'}%`}
                      color={(testResults.confusion_matrix.tp / (testResults.confusion_matrix.tp + testResults.confusion_matrix.fp)) > 0.5 ? "success" : "error"}
                      size="small"
                      sx={{ fontWeight: 'bold' }}
                    />
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#2e7d32' }}>
                    📊 Zusammenfassung:
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    • Du hättest <strong>{testResults.confusion_matrix.tp + testResults.confusion_matrix.fp}</strong> Trades gemacht
                    • <strong>{((testResults.confusion_matrix.tp + testResults.confusion_matrix.fp) / (testResults.num_samples || 1) * 100).toFixed(1)}%</strong> der Zeit aktiv gewesen
                    • <strong>{testResults.confusion_matrix.tp}</strong> profitable Signale
                    • <strong>{testResults.confusion_matrix.fp}</strong> Fehlsignale
                  </Typography>
                </Card>
              </Grid>
            )}
          </Grid>
        </Paper>
      )}

      {/* Fehler-Anzeige */}
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>Fehler:</strong> {error}
          </Typography>
        </Alert>
      )}

      {/* Lade-Status */}
      {isTesting && (
        <Paper sx={{ p: 3, mt: 2, bgcolor: 'rgba(0, 212, 255, 0.1)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CircularProgress size={24} />
            <Typography variant="body1">
              🧪 Teste Modell... Das kann 30-60 Sekunden dauern.
            </Typography>
          </Box>
        </Paper>
      )}
    </Container>
  )
}

export default Testing
