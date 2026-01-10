import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Container, Typography, Paper, Box, Button, Chip,
  Card, CardContent, Alert, CircularProgress
} from '@mui/material'
import { ArrowBack } from '@mui/icons-material'
import { mlApi } from '../services/api'

const Details: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [jobDetails, setJobDetails] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchJobDetails = async () => {
      if (!id) return

      try {
        const jobData = await mlApi.getJob(id)
        setJobDetails(jobData)
      } catch (err) {
        console.error('Error fetching job details:', err)
        setError('Fehler beim Laden der Job-Details')
      } finally {
        setLoading(false)
      }
    }

    fetchJobDetails()
  }, [id])

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    )
  }

  if (error || !jobDetails) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">{error || 'Job nicht gefunden'}</Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/jobs')} sx={{ mt: 2 }}>
          Zurück zu Jobs
        </Button>
      </Container>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'primary'
      case 'completed': return 'success'
      case 'failed': return 'error'
      case 'pending': return 'warning'
      default: return 'default'
    }
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/jobs')}>
          Zurück zu Jobs
        </Button>
      </Box>

      <Typography variant="h4" gutterBottom>
        Job Details: {String(jobDetails.id).slice(0, 8)}
      </Typography>

      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(50% - 12px)' }, minWidth: 0 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Job Informationen
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Typography><strong>Status:</strong>
                <Chip
                  label={jobDetails.status}
                  color={getStatusColor(jobDetails.status) as any}
                  size="small"
                  sx={{ ml: 1 }}
                />
              </Typography>
            </Box>
            <Typography><strong>Erstellt:</strong> {new Date(jobDetails.created_at).toLocaleString()}</Typography>
            <Typography><strong>Modell-Typ:</strong> {jobDetails.train_model_type || 'N/A'}</Typography>
            <Typography><strong>Target Variable:</strong> {jobDetails.train_target_var || 'N/A'}</Typography>
            <Typography><strong>Operator:</strong> {jobDetails.train_operator || 'N/A'}</Typography>
            <Typography><strong>Value:</strong> {jobDetails.train_value || 'N/A'}</Typography>
          </Paper>
        </Box>

        {(jobDetails.result_model_id || jobDetails.result_test_id || jobDetails.result_comparison_id) && (
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(50% - 12px)' }, minWidth: 0 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Ergebnisse
              </Typography>
              {jobDetails.result_model_id && (
                <Typography><strong>Modell ID:</strong> {String(jobDetails.result_model_id).slice(0, 8)}</Typography>
              )}
              {jobDetails.result_test_id && (
                <Typography><strong>Test ID:</strong> {String(jobDetails.result_test_id).slice(0, 8)}</Typography>
              )}
              {jobDetails.result_comparison_id && (
                <Typography><strong>Vergleich ID:</strong> {String(jobDetails.result_comparison_id).slice(0, 8)}</Typography>
              )}
              {jobDetails.progress_msg && (
                <Typography><strong>Fortschritt:</strong> {jobDetails.progress_msg}</Typography>
              )}
              {jobDetails.error_msg && (
                <Typography><strong>Fehler:</strong> {jobDetails.error_msg}</Typography>
              )}
            </Paper>
          </Box>
        )}

        <Box sx={{ flex: '1 1 100%', minWidth: 0 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Konfiguration Details
            </Typography>
            <Box sx={{
              bgcolor: 'grey.900',
              color: 'grey.100',
              p: 2,
              borderRadius: 1,
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              overflow: 'auto',
              maxHeight: '600px'
            }}>
              <pre style={{
                margin: 0,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {JSON.stringify(jobDetails, null, 2)}
              </pre>
            </Box>
          </Paper>
        </Box>
      </Box>
    </Container>
  )
}

export default Details
