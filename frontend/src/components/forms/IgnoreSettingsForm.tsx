/**
 * IgnoreSettingsForm Component
 * Erweiterte Formular für Coin-Ignore-Einstellungen mit React Hook Form + Zod
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
  Alert,
  Chip,
  InputAdornment
} from '@mui/material';
import {
  Timer as TimerIcon,
  AccessTime as TimeIcon
} from '@mui/icons-material';
import type { Model } from '../../types/model';

// Zod Schema für Form-Validierung
const ignoreSettingsSchema = z.object({
  ignore_bad_seconds: z.number().min(0).max(86400, 'Maximal 24 Stunden (86400 Sekunden)'),
  ignore_positive_seconds: z.number().min(0).max(86400, 'Maximal 24 Stunden (86400 Sekunden)'),
  ignore_alert_seconds: z.number().min(0).max(86400, 'Maximal 24 Stunden (86400 Sekunden)')
});

type IgnoreSettingsFormData = z.infer<typeof ignoreSettingsSchema>;

interface IgnoreSettingsFormProps {
  model: Model;
  onChange?: (data: IgnoreSettingsFormData) => void;
  disabled?: boolean;
}

const IgnoreSettingsForm: React.FC<IgnoreSettingsFormProps> = ({
  model,
  onChange,
  disabled = false
}) => {
  const {
    control,
    watch,
    formState: { errors, isDirty, isValid }
  } = useForm<IgnoreSettingsFormData>({
    resolver: zodResolver(ignoreSettingsSchema),
    defaultValues: {
      ignore_bad_seconds: model.ignore_bad_seconds,
      ignore_positive_seconds: model.ignore_positive_seconds,
      ignore_alert_seconds: model.ignore_alert_seconds
    },
    mode: 'onChange'
  });

  // Form-Änderungen an Parent weitergeben
  React.useEffect(() => {
    if (onChange && isDirty) {
      const subscription = watch((data) => {
        onChange(data as IgnoreSettingsFormData);
      });
      return () => subscription.unsubscribe();
    }
  }, [watch, onChange, isDirty]);

  const formatDuration = (seconds: number): string => {
    if (seconds === 0) return 'Nie ignorieren';
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  const ignoreFields = [
    {
      name: 'ignore_bad_seconds' as const,
      label: 'Schlechte Vorhersagen ignorieren',
      helperText: 'Coins mit schlechten Vorhersagen (prediction=0) für diese Zeit ignorieren',
      color: 'error' as const
    },
    {
      name: 'ignore_positive_seconds' as const,
      label: 'Positive Vorhersagen ignorieren',
      helperText: 'Coins mit positiven Vorhersagen (prediction=1) für diese Zeit ignorieren',
      color: 'success' as const
    },
    {
      name: 'ignore_alert_seconds' as const,
      label: 'Alert-Vorhersagen ignorieren',
      helperText: 'Coins mit Alert-Vorhersagen (probability >= threshold) für diese Zeit ignorieren',
      color: 'warning' as const
    }
  ];

  return (
    <Card variant="outlined">
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <TimerIcon sx={{ mr: 1, color: 'warning.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Coin-Ignore-Einstellungen
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

        <Alert severity="info" sx={{ mb: 3 }}>
          <strong>Hinweis:</strong> Diese Einstellungen gelten nur für automatische Coin-Metric-Verarbeitung,
          nicht für manuelle API-Calls!
        </Alert>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3 }}>
          {ignoreFields.map((field) => (
            <Controller
              key={field.name}
              name={field.name}
              control={control}
              render={({ field: controllerField, fieldState: { error } }) => (
                <Box>
                  <TextField
                    {...controllerField}
                    type="number"
                    label={field.label}
                    fullWidth
                    margin="normal"
                    inputProps={{
                      min: 0,
                      max: 86400,
                      step: 60
                    }}
                    helperText={error ? error.message : field.helperText}
                    error={!!error}
                    disabled={disabled}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <TimeIcon sx={{ color: 'action.active' }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <Chip
                            label={formatDuration(controllerField.value)}
                            size="small"
                            color={field.color}
                            variant="outlined"
                          />
                        </InputAdornment>
                      )
                    }}
                  />
                </Box>
              )}
            />
          ))}
        </Box>

        {/* Beispiele */}
        <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 500 }}>
            Beispiele:
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 1 }}>
            <Typography variant="caption">• 0 = Nie ignorieren (Standard)</Typography>
            <Typography variant="caption">• 20 = 20 Sekunden ignorieren</Typography>
            <Typography variant="caption">• 3600 = 1 Stunde ignorieren</Typography>
            <Typography variant="caption">• 86400 = 24 Stunden ignorieren</Typography>
          </Box>
        </Box>

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

export default IgnoreSettingsForm;