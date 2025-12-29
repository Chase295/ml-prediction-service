/**
 * AlertSettingsForm Component
 * Erweiterte Formular für N8N Alert-Konfiguration mit React Hook Form + Zod
 */
import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardContent,
  Typography,
  Box,
  TextField,
  Switch,
  FormControlLabel,
  RadioGroup,
  Radio,
  FormControl,
  FormLabel,
  Slider,
  MenuItem,
  Alert,
  Chip
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Webhook as WebhookIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import type { Model } from '../../types/model';

// Zod Schema für Form-Validierung
const alertSettingsSchema = z.object({
  n8n_webhook_url: z.string().url('Ungültige URL-Format').optional().or(z.literal('')),
  n8n_enabled: z.boolean(),
  n8n_send_mode: z.enum(['all', 'alerts_only', 'positive_only', 'negative_only']),
  alert_threshold: z.number().min(0).max(1),
  coin_filter_mode: z.enum(['all', 'whitelist']),
  coin_whitelist: z.array(z.string().min(1, 'Coin-Adresse darf nicht leer sein')).optional()
});

type AlertSettingsFormData = z.infer<typeof alertSettingsSchema>;

interface AlertSettingsFormProps {
  model: Model;
  onChange?: (data: AlertSettingsFormData) => void;
  disabled?: boolean;
}

const AlertSettingsForm: React.FC<AlertSettingsFormProps> = ({
  model,
  onChange,
  disabled = false
}) => {
  const {
    control,
    watch,
    formState: { errors, isDirty, isValid }
  } = useForm<AlertSettingsFormData>({
    resolver: zodResolver(alertSettingsSchema),
    defaultValues: {
      n8n_webhook_url: model.n8n_webhook_url || '',
      n8n_enabled: model.n8n_enabled,
      n8n_send_mode: model.n8n_send_mode || 'all',
      alert_threshold: model.alert_threshold,
      coin_filter_mode: model.coin_filter_mode || 'all',
      coin_whitelist: model.coin_whitelist || []
    },
    mode: 'onChange'
  });

  const coinFilterMode = watch('coin_filter_mode');
  const n8nEnabled = watch('n8n_enabled');

  // Form-Änderungen an Parent weitergeben
  React.useEffect(() => {
    if (onChange && isDirty) {
      const subscription = watch((data) => {
        onChange(data as AlertSettingsFormData);
      });
      return () => subscription.unsubscribe();
    }
  }, [watch, onChange, isDirty]);

  const sendModeOptions = [
    { value: 'all', label: 'Alle Vorhersagen senden' },
    { value: 'alerts_only', label: 'Nur Alerts senden (über Schwelle)' },
    { value: 'positive_only', label: 'Nur positive Vorhersagen' },
    { value: 'negative_only', label: 'Nur negative Vorhersagen' },
  ];

  return (
    <Card variant="outlined">
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <NotificationsIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            N8N Webhook & Alert Einstellungen
          </Typography>
          {isDirty && (
            <Chip
              label="Ungespeicherte Änderungen"
              size="small"
              color="warning"
              sx={{ ml: 'auto' }}
            />
          )}
        </Box>

        {/* N8N Webhook URL */}
        <Controller
          name="n8n_webhook_url"
          control={control}
          render={({ field, fieldState: { error } }) => (
            <TextField
              {...field}
              label="N8N Webhook URL"
              fullWidth
              margin="normal"
              placeholder="https://your-n8n-instance/webhook/..."
              helperText={error ? error.message : "Leer lassen um globale URL zu verwenden"}
              error={!!error}
              disabled={disabled}
              InputProps={{
                startAdornment: <WebhookIcon sx={{ mr: 1, color: 'action.active' }} />
              }}
            />
          )}
        />

        {/* N8N Aktiviert */}
        <Controller
          name="n8n_enabled"
          control={control}
          render={({ field }) => (
            <FormControlLabel
              control={
                <Switch
                  {...field}
                  checked={field.value}
                  disabled={disabled}
                />
              }
              label="N8N Benachrichtigungen aktivieren"
              sx={{ mt: 2, mb: 2 }}
            />
          )}
        />

        {/* Send-Modus */}
        {n8nEnabled && (
          <Controller
            name="n8n_send_mode"
            control={control}
            render={({ field, fieldState: { error } }) => (
              <TextField
                {...field}
                select
                label="Send-Modus"
                fullWidth
                margin="normal"
                helperText={error ? error.message : "Was soll an N8N gesendet werden?"}
                error={!!error}
                disabled={disabled}
              >
                {sendModeOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
        )}

        {/* Alert-Schwelle */}
        <Box sx={{ mt: 3, mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <FilterIcon sx={{ mr: 1, fontSize: 16 }} />
            Alert-Schwelle
          </Typography>
          <Controller
            name="alert_threshold"
            control={control}
            render={({ field }) => (
              <Box>
                <Slider
                  {...field}
                  value={field.value * 100}
                  onChange={(_, value) => field.onChange(Number(value) / 100)}
                  aria-labelledby="alert-threshold-slider"
                  valueLabelDisplay="auto"
                  valueLabelFormat={(value) => `${value.toFixed(1)}%`}
                  min={0}
                  max={100}
                  step={5}
                  marks={[
                    { value: 0, label: '0%' },
                    { value: 50, label: '50%' },
                    { value: 100, label: '100%' }
                  ]}
                  disabled={disabled}
                  sx={{ mt: 2, mb: 1 }}
                />
                <Typography variant="caption" color="text.secondary">
                  Aktueller Wert: {(field.value * 100).toFixed(1)}%
                </Typography>
              </Box>
            )}
          />
        </Box>

        {/* Coin-Filter */}
        <FormControl component="fieldset" margin="normal" fullWidth>
          <FormLabel component="legend" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <FilterIcon sx={{ mr: 1, fontSize: 16 }} />
            Coin-Filter Modus
          </FormLabel>
          <Controller
            name="coin_filter_mode"
            control={control}
            render={({ field }) => (
              <RadioGroup {...field} row>
                <FormControlLabel
                  value="all"
                  control={<Radio disabled={disabled} />}
                  label="Alle Coins"
                />
                <FormControlLabel
                  value="whitelist"
                  control={<Radio disabled={disabled} />}
                  label="Whitelist (nur ausgewählte Coins)"
                />
              </RadioGroup>
            )}
          />
        </FormControl>

        {/* Coin Whitelist */}
        {coinFilterMode === 'whitelist' && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Coin-Whitelist (eine Adresse pro Zeile)
            </Typography>
            <Controller
              name="coin_whitelist"
              control={control}
              render={({ field, fieldState: { error } }) => (
                <Box>
                  <TextField
                    {...field}
                    multiline
                    rows={4}
                    fullWidth
                    placeholder="Coin-Adressen (z.B. ABCxyz123...)"
                    disabled={disabled}
                    error={!!error}
                    helperText={error ? error.message : `${field.value?.length || 0} Coins in der Whitelist`}
                    value={field.value ? field.value.join('\n') : ''}
                    onChange={(e) => {
                      const lines = e.target.value.split('\n').map(line => line.trim()).filter(line => line.length > 0);
                      field.onChange(lines);
                    }}
                  />
                  {field.value && field.value.length > 0 && (
                    <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {field.value.map((coin, index) => (
                        <Chip
                          key={index}
                          label={coin}
                          size="small"
                          variant="outlined"
                          color="primary"
                        />
                      ))}
                    </Box>
                  )}
                </Box>
              )}
            />
          </Box>
        )}

        {/* Validierungs-Hinweise */}
        {!isValid && Object.keys(errors).length > 0 && (
          <Alert severity="error" sx={{ mt: 2 }}>
            Bitte korrigieren Sie die Fehler im Formular.
          </Alert>
        )}

        {isDirty && isValid && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Ihre Änderungen sind bereit zum Speichern.
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default AlertSettingsForm;