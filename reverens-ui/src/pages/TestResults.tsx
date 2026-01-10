import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
  IconButton,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
} from '@mui/material';
import {
  Assessment as TestResultsIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Delete as DeleteIcon,
  SelectAll as SelectAllIcon,
  CheckBox as CheckBoxIcon,
  CheckBoxOutlineBlank as CheckBoxOutlineBlankIcon,
} from '@mui/icons-material';
import { mlApi as apiService } from '../services/api';
import { TestResultCard } from '../components/TestResultCard';

interface TestResult {
  id: number;
  model_id: number;
  test_start: string;
  test_end: string;
  accuracy: number;
  f1_score: number;
  roc_auc: number;
  simulated_profit_pct: number;
  total_predictions: number;
  true_positives: number;
  true_negatives: number;
  false_positives: number;
  false_negatives: number;
  confusion_matrix: number[][];
  created_at: string;
  model_name?: string;
}

const TestResults: React.FC = () => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [performanceFilter, setPerformanceFilter] = useState<string>('Alle');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedTestIds, setSelectedTestIds] = useState<number[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [testToDelete, setTestToDelete] = useState<TestResult | null>(null);

  useEffect(() => {
    loadTestResults();
  }, []);

  const loadTestResults = async () => {
    try {
      setLoading(true);
      const data = await apiService.getTestResults();
      setResults(data);
      setError(null);
    } catch (err) {
      setError('Fehler beim Laden der Test-Ergebnisse');
      console.error('Error loading test results:', err);
    } finally {
      setLoading(false);
    }
  };

  // Statistiken berechnen
  const stats = useMemo(() => {
    const total = results.length;
    const highPerformance = results.filter(r => r.accuracy >= 0.7).length;
    const mediumPerformance = results.filter(r => r.accuracy >= 0.5 && r.accuracy < 0.7).length;
    const lowPerformance = results.filter(r => r.accuracy < 0.5).length;
    const profitable = results.filter(r => r.simulated_profit_pct > 0).length;

    return { total, highPerformance, mediumPerformance, lowPerformance, profitable };
  }, [results]);

  // Filter und Sortierung
  const filteredAndSortedResults = useMemo(() => {
    let filtered = results;

    // Performance filter
    if (performanceFilter !== 'Alle') {
      switch (performanceFilter) {
        case 'Ausgezeichnet':
          filtered = filtered.filter(r => r.accuracy >= 0.7);
          break;
        case 'Gut':
          filtered = filtered.filter(r => r.accuracy >= 0.5 && r.accuracy < 0.7);
          break;
        case 'Verbesserungswürdig':
          filtered = filtered.filter(r => r.accuracy < 0.5);
          break;
      }
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(result =>
        (result.model_name || `ID ${result.model_id}`).toLowerCase().includes(query) ||
        result.id.toString().includes(query)
      );
    }

    // Sortierung
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'accuracy':
          aValue = a.accuracy;
          bValue = b.accuracy;
          break;
        case 'profit':
          aValue = a.simulated_profit_pct;
          bValue = b.simulated_profit_pct;
          break;
        case 'created_at':
        default:
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [results, performanceFilter, searchQuery, sortBy, sortOrder]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('de-DE');
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  const formatCurrency = (value: number) => {
    return `${value.toFixed(4)}%`;
  };

  const getPerformanceColor = (accuracy: number) => {
    if (accuracy >= 0.7) return 'success';
    if (accuracy >= 0.5) return 'warning';
    return 'error';
  };

  const getProfitColor = (profit: number) => {
    if (profit > 0) return 'success';
    if (profit >= -0.1) return 'warning';
    return 'error';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (results.length === 0) {
    return (
      <Box p={3}>
        <Typography variant="h4" gutterBottom>
          🧪 Test-Ergebnisse
        </Typography>
        <Alert severity="info">
          Keine Test-Ergebnisse verfügbar. Teste zuerst ein Modell auf der Test-Seite.
        </Alert>
      </Box>
    );
  }

  const handleTestResultClick = (testResultId: number) => {
    // Navigate to test result details
    window.location.href = `/test-result-details/${testResultId}`;
  };

  const handleSelectTest = (testId: number) => {
    setSelectedTestIds(prev =>
      prev.includes(testId)
        ? prev.filter(id => id !== testId)
        : [...prev, testId]
    );
  };

  const handleSelectAll = () => {
    if (selectedTestIds.length === filteredAndSortedResults.length) {
      setSelectedTestIds([]);
    } else {
      setSelectedTestIds(filteredAndSortedResults.map(r => r.id));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedTestIds.length > 0) {
      setDeleteDialogOpen(true);
    }
  };

  const handleDeleteClick = (testResult: TestResult) => {
    setTestToDelete(testResult);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (testToDelete) {
      try {
        await apiService.deleteTestResult(testToDelete.id.toString());
        setResults(prev => prev.filter(r => r.id !== testToDelete.id));
        setTestToDelete(null);
        setDeleteDialogOpen(false);
      } catch (err) {
        console.error('Error deleting test result:', err);
        setError('Fehler beim Löschen des Test-Ergebnisses');
      }
    } else if (selectedTestIds.length > 0) {
      try {
        await apiService.deleteTestResults(selectedTestIds.map(id => id.toString()));
        setResults(prev => prev.filter(r => !selectedTestIds.includes(r.id)));
        setSelectedTestIds([]);
        setDeleteDialogOpen(false);
      } catch (err) {
        console.error('Error deleting test results:', err);
        setError('Fehler beim Löschen der Test-Ergebnisse');
      }
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setTestToDelete(null);
  };

  return (
    <Box p={3}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h4" sx={{ color: '#00d4ff', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
            <TestResultsIcon /> Test-Ergebnisse
          </Typography>
          {selectedTestIds.length > 0 && (
            <Chip
              label={`${selectedTestIds.length} ausgewählt`}
              color="primary"
              sx={{ fontWeight: 'bold' }}
            />
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            startIcon={<SelectAllIcon />}
            onClick={handleSelectAll}
            variant="outlined"
            size="small"
          >
            {selectedTestIds.length === filteredAndSortedResults.length ? 'Alle abwählen' : 'Alle auswählen'}
          </Button>
          {selectedTestIds.length > 0 && (
            <Button
              startIcon={<DeleteIcon />}
              onClick={handleDeleteSelected}
              variant="contained"
              color="error"
              size="small"
            >
              Ausgewählte löschen ({selectedTestIds.length})
            </Button>
          )}
          <Button
            startIcon={<RefreshIcon />}
            onClick={() => loadTestResults()}
            variant="outlined"
            disabled={loading}
          >
            Aktualisieren
          </Button>
        </Box>
      </Box>

      <Typography variant="body1" color="text.secondary" gutterBottom>
        Übersicht aller durchgeführten Modell-Tests und Backtesting-Ergebnisse
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Statistics */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid xs={6} md={3}>
          <Box sx={{
            p: 2,
            bgcolor: 'rgba(0, 212, 255, 0.1)',
            border: '1px solid rgba(0, 212, 255, 0.3)',
            borderRadius: 1,
            textAlign: 'center'
          }}>
            <Typography variant="h4" sx={{ color: '#00d4ff' }}>{stats.total}</Typography>
            <Typography variant="body2" color="textSecondary">Gesamt Tests</Typography>
          </Box>
        </Grid>
        <Grid xs={6} md={3}>
          <Box sx={{
            p: 2,
            bgcolor: 'rgba(76, 175, 80, 0.1)',
            border: '1px solid rgba(76, 175, 80, 0.3)',
            borderRadius: 1,
            textAlign: 'center'
          }}>
            <Typography variant="h4" sx={{ color: '#4caf50' }}>{stats.highPerformance}</Typography>
            <Typography variant="body2" color="textSecondary">Ausgezeichnet</Typography>
          </Box>
        </Grid>
        <Grid xs={6} md={3}>
          <Box sx={{
            p: 2,
            bgcolor: 'rgba(255, 152, 0, 0.1)',
            border: '1px solid rgba(255, 152, 0, 0.3)',
            borderRadius: 1,
            textAlign: 'center'
          }}>
            <Typography variant="h4" sx={{ color: '#ff9800' }}>{stats.mediumPerformance}</Typography>
            <Typography variant="body2" color="textSecondary">Gut</Typography>
          </Box>
        </Grid>
        <Grid xs={6} md={3}>
          <Box sx={{
            p: 2,
            bgcolor: 'rgba(76, 175, 80, 0.1)',
            border: '1px solid rgba(76, 175, 80, 0.3)',
            borderRadius: 1,
            textAlign: 'center'
          }}>
            <Typography variant="h4" sx={{ color: '#4caf50' }}>{stats.profitable}</Typography>
            <Typography variant="body2" color="textSecondary">Profitabel</Typography>
          </Box>
        </Grid>
      </Grid>

      {/* Filters */}
      <Box sx={{
        p: 3,
        mb: 4,
        bgcolor: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 2
      }}>
        <Typography variant="h6" gutterBottom sx={{ color: '#00d4ff', display: 'flex', alignItems: 'center', gap: 1 }}>
          <FilterIcon /> Filter & Suche
        </Typography>

        <Grid container spacing={3} alignItems="center">
          <Grid xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Suche nach Modell-Name oder ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                endAdornment: searchQuery && (
                  <IconButton size="small" onClick={() => setSearchQuery('')}>
                    <ClearIcon />
                  </IconButton>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '&.Mui-focused fieldset': {
                    borderColor: '#00d4ff',
                  },
                },
              }}
            />
          </Grid>

          <Grid xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Performance</InputLabel>
              <Select
                value={performanceFilter}
                label="Performance"
                onChange={(e) => setPerformanceFilter(e.target.value)}
              >
                <MenuItem value="Alle">Alle</MenuItem>
                <MenuItem value="Ausgezeichnet">Ausgezeichnet (≥70%)</MenuItem>
                <MenuItem value="Gut">Gut (50-70%)</MenuItem>
                <MenuItem value="Verbesserungswürdig">Verbesserungswürdig (&lt;50%)</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Sortieren nach</InputLabel>
              <Select
                value={sortBy}
                label="Sortieren nach"
                onChange={(e) => setSortBy(e.target.value)}
              >
                <MenuItem value="created_at">Datum</MenuItem>
                <MenuItem value="accuracy">Genauigkeit</MenuItem>
                <MenuItem value="profit">Profit</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Reihenfolge</InputLabel>
              <Select
                value={sortOrder}
                label="Reihenfolge"
                onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
              >
                <MenuItem value="desc">Absteigend</MenuItem>
                <MenuItem value="asc">Aufsteigend</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Box>

      {/* Results Grid */}
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      ) : filteredAndSortedResults.length === 0 ? (
        <Alert severity="info">
          {results.length === 0
            ? "Keine Test-Ergebnisse verfügbar. Teste zuerst ein Modell auf der Test-Seite."
            : "Keine Test-Ergebnisse entsprechen deinen Filterkriterien."
          }
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {filteredAndSortedResults.map((result) => (
            <Grid item xs={12} md={6} lg={4} key={result.id}>
              <TestResultCard
                testResult={result}
                isSelected={selectedTestIds.includes(result.id)}
                onSelect={handleSelectTest}
                onDetails={handleTestResultClick}
                onDelete={handleDeleteClick}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Test-Ergebnisse löschen</DialogTitle>
        <DialogContent>
          <Typography>
            Sind Sie sicher, dass Sie {testToDelete ? 'dieses Test-Ergebnis' : `diese ${selectedTestIds.length} Test-Ergebnisse`} löschen möchten?
            Diese Aktion kann nicht rückgängig gemacht werden.
          </Typography>
          {testToDelete && (
            <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
              Test-Ergebnis #{testToDelete.id} - Modell: {testToDelete.model_name || `ID ${testToDelete.model_id}`}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Abbrechen</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Löschen
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TestResults;
