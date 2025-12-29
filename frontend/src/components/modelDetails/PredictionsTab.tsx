/**
 * PredictionsTab Component
 * Analyse der Vorhersagen mit Charts und Statistiken
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
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
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  ReferenceLine
} from 'recharts';

// Services
import { predictionsApi } from '../../services/api';

interface PredictionsTabProps {
  modelId: number;
}

interface Prediction {
  id: number;
  coin_id: string;
  prediction: number;
  probability: number;
  created_at: string;
}

const PredictionsTab: React.FC<PredictionsTabProps> = ({ modelId }) => {
  // Vorhersagen laden
  const { data: predictions, isLoading, error } = useQuery({
    queryKey: ['predictions', 'model', modelId],
    queryFn: () => predictionsApi.getForModel(modelId, 1, 100),
    refetchInterval: 30000 // Aktualisiere alle 30 Sekunden
  });

  const predictionData = predictions?.predictions || [];

  // Statistiken berechnen
  const stats = React.useMemo(() => {
    if (predictionData.length === 0) return null;

    const positivePreds = predictionData.filter(p => p.prediction === 1).length;
    const totalPreds = predictionData.length;
    const positiveRate = totalPreds > 0 ? positivePreds / totalPreds : 0;

    const probabilities = predictionData.map(p => p.probability);
    const avgProb = probabilities.reduce((a, b) => a + b, 0) / probabilities.length;
    const stdDev = Math.sqrt(
      probabilities.reduce((a, b) => a + Math.pow(b - avgProb, 2), 0) / probabilities.length
    );

    return {
      total: totalPreds,
      positive: positivePreds,
      positiveRate,
      avgProb,
      stdDev
    };
  }, [predictionData]);

  // Daten für Zeit-Chart vorbereiten
  const timeChartData = React.useMemo(() => {
    if (predictionData.length === 0) return [];

    return predictionData
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map(pred => ({
        time: new Date(pred.created_at).toLocaleTimeString(),
        probability: pred.probability * 100,
        prediction: pred.prediction
      }));
  }, [predictionData]);

  // Daten für Histogramm vorbereiten
  const histogramData = React.useMemo(() => {
    if (predictionData.length === 0) return [];

    const bins: Record<string, number> = {};
    predictionData.forEach(pred => {
      const bin = Math.floor(pred.probability * 10) / 10; // 0.1 Schritte
      const binKey = bin.toFixed(1);
      bins[binKey] = (bins[binKey] || 0) + 1;
    });

    return Object.entries(bins)
      .sort(([a], [b]) => parseFloat(a) - parseFloat(b))
      .map(([probability, count]) => ({
        probability: parseFloat(probability),
        count
      }));
  }, [predictionData]);

  const formatPercentage = (value: number, decimals: number = 1): string => {
    return `${(value * 100).toFixed(decimals)}%`;
  };

  if (isLoading) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body1">Vorhersagen werden geladen...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        Fehler beim Laden der Vorhersagen: {error.message}
      </Alert>
    );
  }

  if (predictionData.length === 0) {
    return (
      <Alert severity="info">
        ℹ️ Noch keine Vorhersagen für dieses Modell vorhanden
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
        🔮 Vorhersage-Analyse
      </Typography>

      {/* Live-Statistiken */}
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
        📊 Live-Statistiken
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
              {stats?.positive}/{stats?.total}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Positive Vorhersagen
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ textAlign: 'center' }}>
          <CardContent>
            <Typography variant="h4" color="success.main" sx={{ fontWeight: 700 }}>
              {stats ? formatPercentage(stats.positiveRate) : 'N/A'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Positive Rate
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ textAlign: 'center' }}>
          <CardContent>
            <Typography variant="h4" color="info.main" sx={{ fontWeight: 700 }}>
              {stats ? formatPercentage(stats.avgProb) : 'N/A'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Ø Wahrscheinlichkeit
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ textAlign: 'center' }}>
          <CardContent>
            <Typography variant="h4" color="warning.main" sx={{ fontWeight: 700 }}>
              {stats ? formatPercentage(stats.stdDev) : 'N/A'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Standardabweichung
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Zeitliche Entwicklung */}
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
        📈 Zeitliche Entwicklung
      </Typography>
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box sx={{ height: 300, width: '100%' }}>
            <ResponsiveContainer>
              <LineChart data={timeChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="time"
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  domain={[0, 100]}
                  label={{ value: 'Wahrscheinlichkeit (%)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip
                  formatter={(value: any) => [`${value?.toFixed(1)}%`, 'Wahrscheinlichkeit']}
                  labelFormatter={(label) => `Zeit: ${label}`}
                />
                <ReferenceLine y={50} stroke="red" strokeDasharray="5 5" />
                <Line
                  type="monotone"
                  dataKey="probability"
                  stroke="#1976d2"
                  strokeWidth={2}
                  dot={{ fill: '#1976d2', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </CardContent>
      </Card>

      {/* Wahrscheinlichkeitsverteilung */}
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
        📊 Wahrscheinlichkeitsverteilung
      </Typography>
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box sx={{ height: 300, width: '100%' }}>
            <ResponsiveContainer>
              <BarChart data={histogramData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="probability"
                  label={{ value: 'Wahrscheinlichkeit', position: 'insideBottom', offset: -5 }}
                />
                <YAxis label={{ value: 'Anzahl', angle: -90, position: 'insideLeft' }} />
                <Tooltip
                  formatter={(value: any) => [value || 0, 'Anzahl']}
                  labelFormatter={(label) => `Wahrscheinlichkeit: ${label}`}
                />
                <ReferenceLine x={0.5} stroke="red" strokeDasharray="5 5" />
                <Bar dataKey="count" fill="#1976d2" />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </CardContent>
      </Card>

      {/* Detail-Tabelle */}
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
        📋 Letzte Vorhersagen
      </Typography>
      <Card>
        <CardContent>
          <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Zeit</TableCell>
                  <TableCell>Coin</TableCell>
                  <TableCell align="center">Vorhersage</TableCell>
                  <TableCell align="right">Wahrscheinlichkeit</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {predictionData.slice(0, 20).map((pred: Prediction) => (
                  <TableRow key={pred.id}>
                    <TableCell>
                      {new Date(pred.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>{pred.coin_id}</TableCell>
                    <TableCell align="center">
                      <Typography
                        sx={{
                          color: pred.prediction === 1 ? 'success.main' : 'error.main',
                          fontWeight: 600
                        }}
                      >
                        {pred.prediction === 1 ? 'POS' : 'NEG'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {formatPercentage(pred.probability)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
};

export default PredictionsTab;
