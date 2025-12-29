/**
 * CurrentConfigDisplay Component
 * Zeigt die aktuelle Alert-Konfiguration eines Modells an
 */
import React from 'react';
import {
  Typography,
  Box,
  Card,
  CardContent,
  Chip,
  Divider
} from '@mui/material';
import {
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
  Webhook as WebhookIcon,
  Settings as SettingsIcon,
  FilterList as FilterIcon,
  Timer as TimerIcon
} from '@mui/icons-material';
import type { Model } from '../../types/model';

interface CurrentConfigDisplayProps {
  model: Model;
}

const CurrentConfigDisplay: React.FC<CurrentConfigDisplayProps> = ({ model }) => {
  const sendModeLabels = {
    all: 'Alle Vorhersagen',
    alerts_only: 'Nur Alerts',
    positive_only: 'Nur positive',
    negative_only: 'Nur negative'
  };

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
          📊 Aktuelle Konfiguration
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
            gap: 3
          }}
        >
          {/* N8N Status */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <WebhookIcon color="primary" />
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                N8N Integration
              </Typography>
            </Box>
            <Box sx={{ pl: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                {model.n8n_enabled ? (
                  <ActiveIcon color="success" fontSize="small" />
                ) : (
                  <InactiveIcon color="error" fontSize="small" />
                )}
                <Typography variant="body2">
                  {model.n8n_enabled ? 'Aktiviert' : 'Deaktiviert'}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Webhook: {model.n8n_webhook_url || 'Global'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Modus: {sendModeLabels[model.n8n_send_mode]}
              </Typography>
            </Box>
          </Box>

          {/* Alert Settings */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <SettingsIcon color="secondary" />
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                Alert-Einstellungen
              </Typography>
            </Box>
            <Box sx={{ pl: 4 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Schwelle: <strong>{(model.alert_threshold * 100).toFixed(1)}%</strong>
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FilterIcon fontSize="small" color="action" />
                <Typography variant="body2">
                  {model.coin_filter_mode === 'all'
                    ? 'Alle Coins'
                    : `${model.coin_whitelist?.length || 0} Coins (Whitelist)`}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Ignore Settings - Full Width */}
          <Box sx={{ gridColumn: '1 / -1' }}>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <TimerIcon color="warning" />
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                Coin-Ignore-Einstellungen
              </Typography>
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
                gap: 2
              }}
            >
              <Chip
                label={`Schlecht: ${model.ignore_bad_seconds}s`}
                color="error"
                variant="outlined"
                size="small"
              />
              <Chip
                label={`Positiv: ${model.ignore_positive_seconds}s`}
                color="success"
                variant="outlined"
                size="small"
              />
              <Chip
                label={`Alert: ${model.ignore_alert_seconds}s`}
                color="warning"
                variant="outlined"
                size="small"
              />
            </Box>

            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              * Gilt nur für automatische Coin-Metric-Verarbeitung
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default CurrentConfigDisplay;
