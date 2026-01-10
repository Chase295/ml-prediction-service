import React, { useEffect } from 'react'
import {
  Container, Typography, Paper, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow,
  Button, Chip, Box, Alert, CircularProgress
} from '@mui/material'
import { useMLStore } from '../stores/mlStore'
import { useNavigate } from 'react-router-dom'

const Jobs: React.FC = () => {
  const { jobs, isLoading, error, fetchJobs } = useMLStore()
  const navigate = useNavigate()

  useEffect(() => {
    console.log('🔄 Jobs-Seite: Lade Jobs...')
    fetchJobs().catch((error) => {
      console.error('❌ Jobs-Seite: Fehler beim Laden:', error)
    })
  }, [fetchJobs])

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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Jobs</Typography>
        <Button variant="contained" onClick={() => navigate('/training')}>
          Neuer Job
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {isLoading && <CircularProgress sx={{ mb: 2 }} />}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Job ID</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Modell-Typ</TableCell>
              <TableCell>Erstellt</TableCell>
              <TableCell>Fehler</TableCell>
              <TableCell>Aktionen</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {jobs.map((job) => (
              <TableRow key={job.id}>
                <TableCell>{String(job.id).slice(0, 8)}</TableCell>
                <TableCell>
                  <Chip
                    label={job.status}
                    color={getStatusColor(job.status) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>{job.train_model_type || 'N/A'}</TableCell>
                <TableCell>
                  {new Date(job.created_at).toLocaleString()}
                </TableCell>
                <TableCell>
                  {job.status === 'FAILED' && job.error_msg ? (
                    <Typography
                      variant="body2"
                      color="error"
                      sx={{
                        maxWidth: '200px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                      title={job.error_msg}
                    >
                      {job.error_msg}
                    </Typography>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      -
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Button
                    size="small"
                    onClick={() => navigate(`/job-details/${job.id}`)}
                  >
                    Details
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {jobs.length === 0 && !isLoading && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Keine Jobs gefunden. Erstelle dein erstes Modell über die Training-Seite.
        </Alert>
      )}
    </Container>
  )
}

export default Jobs;
