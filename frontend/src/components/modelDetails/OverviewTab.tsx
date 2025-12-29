/**
 * OverviewTab Component
 * Übersicht-Tab für Modell-Details
 */
import React from 'react';
import {
  Typography,
  Box,
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import {
  Psychology as BrainIcon,
  Timeline as TimelineIcon,
  BarChart as ChartIcon
} from '@mui/icons-material';
import type { Model } from '../../types/model';

interface OverviewTabProps {
  model: Model;
}

const OverviewTab: React.FC<OverviewTabProps> = ({ model }) => {
  // Feature-Kategorien berechnen
  const featureCategories = React.useMemo(() => {
    if (!model.features || model.features.length === 0) return {};

    const categories: Record<string, number> = {};
    model.features.forEach(feature => {
      const category = feature.split('_')[0] || 'other';
      categories[category] = (categories[category] || 0) + 1;
    });

    return categories;
  }, [model.features]);

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
        📊 Modell-Übersicht
      </Typography>

      {/* Modell-Eigenschaften */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <BrainIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Modell-Eigenschaften
            </Typography>
          </Box>

          <List dense>
            <ListItem>
              <ListItemText primary="Name" secondary={model.name} />
            </ListItem>
            <ListItem>
              <ListItemText primary="Typ" secondary={model.model_type} />
            </ListItem>
            <ListItem>
              <ListItemText primary="Zielvariable" secondary={model.target_variable} />
            </ListItem>
            <ListItem>
              <ListItemText primary="Richtung" secondary={model.target_direction?.toUpperCase()} />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Status"
                secondary={
                  <Chip
                    size="small"
                    label={model.is_active ? 'Aktiv' : 'Inaktiv'}
                    color={model.is_active ? 'success' : 'default'}
                  />
                }
              />
            </ListItem>
          </List>
        </CardContent>
      </Card>

      {/* Timing & Konfiguration */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <TimelineIcon sx={{ mr: 1, color: 'secondary.main' }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Timing & Konfiguration
            </Typography>
          </Box>

          <List dense>
            <ListItem>
              <ListItemText primary="Vorhersage-Fenster" secondary={`${model.future_minutes} Minuten`} />
            </ListItem>
            <ListItem>
              <ListItemText primary="Mindest-Änderung" secondary={`${model.price_change_percent}%`} />
            </ListItem>
            <ListItem>
              <ListItemText primary="Alert-Schwelle" secondary={`${(model.alert_threshold * 100).toFixed(1)}%`} />
            </ListItem>
            <ListItem>
              <ListItemText primary="Coin-Filter" secondary={model.coin_filter_mode === 'all' ? 'Alle Coins' : 'Whitelist'} />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Ignore-Timing"
                secondary={`${model.ignore_bad_seconds}s / ${model.ignore_positive_seconds}s / ${model.ignore_alert_seconds}s`}
              />
            </ListItem>
          </List>
        </CardContent>
      </Card>

      {/* Features */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <ChartIcon sx={{ mr: 1, color: 'info.main' }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Feature-Informationen
            </Typography>
          </Box>

          {model.features && model.features.length > 0 ? (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Gesamt: {model.features.length} Features
              </Typography>

              {/* Feature-Kategorien */}
              {Object.keys(featureCategories).length > 1 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                    Feature-Verteilung:
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {Object.entries(featureCategories).map(([category, count]) => (
                      <Chip
                        key={category}
                        label={`${category}: ${count}`}
                        size="small"
                        variant="outlined"
                        color="primary"
                      />
                    ))}
                  </Box>
                </Box>
              )}

              {/* Feature-Liste (erweiterbar) */}
              <details>
                <summary style={{ cursor: 'pointer', fontWeight: '500' }}>
                  📋 Alle Features anzeigen ({model.features.length})
                </summary>
                <Box sx={{ mt: 2, maxHeight: 300, overflow: 'auto' }}>
                  <List dense>
                    {model.features.map((feature, index) => (
                      <ListItem key={index}>
                        <ListItemText primary={`• ${feature}`} />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              </details>
            </>
          ) : (
            <Typography variant="body2" color="text.secondary">
              ⚠️ Keine Feature-Informationen verfügbar
            </Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default OverviewTab;
