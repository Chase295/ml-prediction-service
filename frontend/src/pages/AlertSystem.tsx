/**
 * AlertSystem Page
 * Übersicht über das Alert-System mit Statistiken und Historie
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
  Chip,
  Tabs,
  Tab
} from '@mui/material';
import {
  Notifications as AlertIcon,
  Assessment as StatsIcon,
  History as HistoryIcon
} from '@mui/icons-material';

// Components
import PageContainer from '../components/layout/PageContainer';
import LoadingSpinner from '../components/common/LoadingSpinner';

// Services
import { modelsApi } from '../services/api';

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
      id={`alert-system-tabpanel-${index}`}
      aria-labelledby={`alert-system-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const AlertSystem: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState(0);

  // Alert-Statistiken laden
  const { data: alertStats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['alerts', 'statistics'],
    queryFn: async () => {
      // Hier würden wir die Alert-Statistiken API aufrufen
      // Für jetzt verwenden wir Mock-Daten
      return {
        totalAlerts: 45,
        activeAlerts: 12,
        triggeredToday: 8,
        avgResponseTime: 2.3,
        topCoins: [
          { coin: 'ABC123', alerts: 5 },
          { coin: 'DEF456', alerts: 4 },
          { coin: 'GHI789', alerts: 3 }
        ],
        recentAlerts: [
          { id: 1, coin: 'ABC123', type: 'time_based', status: 'triggered', timestamp: '2024-12-29T10:30:00Z' },
          { id: 2, coin: 'DEF456', type: 'threshold', status: 'pending', timestamp: '2024-12-29T10:25:00Z' },
          { id: 3, coin: 'GHI789', type: 'time_based', status: 'expired', timestamp: '2024-12-29T10:20:00Z' }
        ]
      };
    }
  });

  // Modelle für Alert-Konfiguration laden
  const { data: models, isLoading: modelsLoading } = useQuery({
    queryKey: ['models'],
    queryFn: modelsApi.getAll
  });

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  if (statsLoading || modelsLoading) {
    return <LoadingSpinner message="Alert-System wird geladen..." />;
  }

  if (statsError) {
    return (
      <PageContainer>
        <Alert severity="error" sx={{ mb: 3 }}>
          Fehler beim Laden der Alert-Statistiken: {statsError.message}
        </Alert>
      </PageContainer>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'triggered': return 'success';
      case 'pending': return 'warning';
      case 'expired': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'triggered': return 'Ausgelöst';
      case 'pending': return 'Ausstehend';
      case 'expired': return 'Abgelaufen';
      default: return status;
    }
  };

  return (
    <PageContainer>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
          🚨 Alert-System Übersicht
        </Typography>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Überwache und verwalte Alert-Benachrichtigungen für deine ML-Modelle
        </Typography>

        {/* Quick Stats */}
        {alertStats && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(4, 1fr)'
              },
              gap: 3,
              mb: 3
            }}
          >
            <Card sx={{ textAlign: 'center' }}>
              <CardContent>
                <Typography variant="h4" color="primary.main" sx={{ fontWeight: 700 }}>
                  {alertStats.totalAlerts}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Gesamt Alerts
                </Typography>
              </CardContent>
            </Card>

            <Card sx={{ textAlign: 'center' }}>
              <CardContent>
                <Typography variant="h4" color="success.main" sx={{ fontWeight: 700 }}>
                  {alertStats.activeAlerts}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Aktive Alerts
                </Typography>
              </CardContent>
            </Card>

            <Card sx={{ textAlign: 'center' }}>
              <CardContent>
                <Typography variant="h4" color="warning.main" sx={{ fontWeight: 700 }}>
                  {alertStats.triggeredToday}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Heute ausgelöst
                </Typography>
              </CardContent>
            </Card>

            <Card sx={{ textAlign: 'center' }}>
              <CardContent>
                <Typography variant="h4" color="info.main" sx={{ fontWeight: 700 }}>
                  {alertStats.avgResponseTime}m
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Ø Reaktionszeit
                </Typography>
              </CardContent>
            </Card>
          </Box>
        )}
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label="alert system tabs"
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontSize: '0.95rem',
              fontWeight: 500
            }
          }}
        >
          <Tab label="📊 Dashboard" icon={<StatsIcon />} iconPosition="start" />
          <Tab label="📋 Alert-Historie" icon={<HistoryIcon />} iconPosition="start" />
          <Tab label="⚙️ Konfiguration" icon={<AlertIcon />} iconPosition="start" />
        </Tabs>
      </Box>

      {/* Tab Content */}
      <TabPanel value={activeTab} index={0}>
        {/* Dashboard Tab */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 3, mb: 3 }}>
          {/* Top Coins */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                🔥 Meist-alertete Coins
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Coin</TableCell>
                      <TableCell align="right">Alerts</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {alertStats?.topCoins.map((coin, index) => (
                      <TableRow key={index}>
                        <TableCell>{coin.coin}</TableCell>
                        <TableCell align="right">
                          <Chip
                            label={coin.alerts}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>

          {/* Recent Alerts */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                🕒 Letzte Alerts
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Coin</TableCell>
                      <TableCell>Typ</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {alertStats?.recentAlerts.map((alert) => (
                      <TableRow key={alert.id}>
                        <TableCell>{alert.coin}</TableCell>
                        <TableCell>
                          <Chip
                            label={alert.type === 'time_based' ? 'Zeit' : 'Schwelle'}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={getStatusLabel(alert.status)}
                            size="small"
                            color={getStatusColor(alert.status)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Box>

        {/* Model Alert Status */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              🤖 Modell Alert-Status
            </Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              Die Alert-Konfiguration erfolgt direkt in den Model-Details unter dem "Konfiguration"-Tab.
            </Alert>
            {models && (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {models.map((model) => (
                  <Chip
                    key={model.id}
                    label={`${model.name}: ${model.n8n_enabled ? 'Aktiv' : 'Inaktiv'}`}
                    color={model.n8n_enabled ? 'success' : 'default'}
                    variant="outlined"
                  />
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        {/* Alert-Historie Tab */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              📋 Vollständige Alert-Historie
            </Typography>
            <Alert severity="info" sx={{ mb: 3 }}>
              Die detaillierte Alert-Historie wird über die API-Endpunkte `/api/alerts` und `/api/alerts/statistics` bereitgestellt.
              Eine vollständige Historie-Ansicht kann hier implementiert werden.
            </Alert>
            <Typography variant="body2" color="text.secondary">
              Aktuell werden Alert-Auswertungen im Hintergrund durchgeführt und können über die API abgerufen werden.
            </Typography>
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        {/* Konfiguration Tab */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              ⚙️ Alert-Konfiguration
            </Typography>
            <Alert severity="info" sx={{ mb: 3 }}>
              Die Alert-Konfiguration erfolgt modellspezifisch in den Model-Details.
              Gehe zu einem Modell und öffne den "Konfiguration"-Tab, um N8N-Webhooks,
              Alert-Schwellen und Coin-Filter zu konfigurieren.
            </Alert>
            <Typography variant="body2" color="text.secondary">
              Jedes Modell kann separate Alert-Einstellungen haben, die unabhängig voneinander konfiguriert werden.
            </Typography>
          </CardContent>
        </Card>
      </TabPanel>
    </PageContainer>
  );
};

export default AlertSystem;
