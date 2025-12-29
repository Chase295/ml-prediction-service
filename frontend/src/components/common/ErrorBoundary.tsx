/**
 * Enhanced Error Boundary Component
 * Improved error handling with retry functionality and error reporting
 */
import { Component, ErrorInfo, ReactNode } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Chip
} from '@mui/material';
import {
  Error as ErrorIcon,
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  BugReport as BugReportIcon
} from '@mui/icons-material';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  showDetails?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
  retryCount: number;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private maxRetries = 3;

  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
    errorId: '',
    retryCount: 0,
  };

  public static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.error('ErrorBoundary caught an error:', error);
    console.error('Error ID:', errorId);

    return {
      hasError: true,
      error,
      errorId
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Report to analytics if available
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'exception', {
        description: error.toString(),
        fatal: false,
      });
    }
  }

  private handleReload = () => {
    this.setState({ retryCount: 0 });
    window.location.reload();
  };

  private handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: '',
        retryCount: prevState.retryCount + 1,
      }));
    } else {
      this.handleReload();
    }
  };

  private handleReportError = () => {
    const errorDetails = {
      errorId: this.state.errorId,
      message: this.state.error?.message,
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      retryCount: this.state.retryCount,
    };

    navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2))
      .then(() => {
        alert('✅ Fehlerdetails wurden in die Zwischenablage kopiert!\n\nBitte senden Sie diese an den Support.');
      })
      .catch(() => {
        alert('❌ Fehler beim Kopieren der Details.\n\nBitte machen Sie einen Screenshot der technischen Details.');
      });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const canRetry = this.state.retryCount < this.maxRetries;

      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '80vh',
            p: 3,
            bgcolor: 'grey.50',
          }}
        >
          <Paper
            elevation={6}
            sx={{
              p: 4,
              textAlign: 'center',
              maxWidth: 700,
              width: '100%',
              borderRadius: 3
            }}
          >
            <ErrorIcon sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />

            <Typography variant="h4" color="error.main" gutterBottom sx={{ fontWeight: 600 }}>
              Oops! Etwas ist schief gelaufen
            </Typography>

            <Typography variant="body1" color="text.secondary" sx={{ mb: 2, lineHeight: 1.6 }}>
              Es gab einen unerwarteten Fehler in der Anwendung.
              {this.state.retryCount > 0 && (
                <span> (Versuch {this.state.retryCount} von {this.maxRetries})</span>
              )}
            </Typography>

            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', mb: 3 }}>
              <Chip
                label={`Fehler-ID: ${this.state.errorId}`}
                size="small"
                variant="outlined"
                color="error"
              />
              {this.state.retryCount > 0 && (
                <Chip
                  label={`${this.state.retryCount} Versuche`}
                  size="small"
                  variant="outlined"
                  color="warning"
                />
              )}
            </Box>

            <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
              <strong>Was Sie tun können:</strong>
              <br />• <strong>Erneut versuchen:</strong> Automatischer Neustart der Komponente
              <br />• <strong>Seite neu laden:</strong> Kompletter Neustart der Anwendung
              <br />• <strong>Fehler melden:</strong> Technische Details für den Support
            </Alert>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap', mb: 3 }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<RefreshIcon />}
                onClick={this.handleRetry}
                disabled={!canRetry}
              >
                {canRetry ? 'Erneut versuchen' : 'Max. Versuche erreicht'}
              </Button>

              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={this.handleReload}
              >
                Seite neu laden
              </Button>

              <Button
                variant="text"
                color="secondary"
                startIcon={<BugReportIcon />}
                onClick={this.handleReportError}
              >
                Fehler melden
              </Button>
            </Box>

            {/* Error Details (Collapsible) */}
            {this.props.showDetails !== false && (this.state.error || this.state.errorInfo) && (
              <Accordion sx={{ mt: 3 }}>
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  aria-controls="error-details-content"
                  id="error-details-header"
                  sx={{ px: 0 }}
                >
                  <Typography variant="body2" color="text.secondary">
                    🔧 Technische Details (für Support)
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ px: 0, textAlign: 'left' }}>
                  <Box sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 1, mb: 2 }}>
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>Error ID:</Typography>
                      <Typography variant="caption">{this.state.errorId}</Typography>

                      <Typography variant="caption" sx={{ fontWeight: 600 }}>Zeitstempel:</Typography>
                      <Typography variant="caption">{new Date().toLocaleString('de-DE')}</Typography>

                      <Typography variant="caption" sx={{ fontWeight: 600 }}>Browser:</Typography>
                      <Typography variant="caption">{navigator.userAgent}</Typography>

                      <Typography variant="caption" sx={{ fontWeight: 600 }}>URL:</Typography>
                      <Typography variant="caption">{window.location.href}</Typography>
                    </Box>

                    {this.state.error && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>
                          Fehler-Message:
                        </Typography>
                        <Box
                          sx={{
                            bgcolor: 'error.light',
                            color: 'error.contrastText',
                            p: 1,
                            borderRadius: 1,
                            fontSize: '0.7rem',
                            maxHeight: 80,
                            overflow: 'auto'
                          }}
                        >
                          {this.state.error.toString()}
                        </Box>
                      </Box>
                    )}

                    {this.state.errorInfo?.componentStack && (
                      <Box>
                        <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>
                          Component Stack:
                        </Typography>
                        <Box
                          sx={{
                            bgcolor: 'grey.100',
                            p: 1,
                            borderRadius: 1,
                            fontSize: '0.7rem',
                            maxHeight: 120,
                            overflow: 'auto'
                          }}
                        >
                          {this.state.errorInfo.componentStack}
                        </Box>
                      </Box>
                    )}
                  </Box>
                </AccordionDetails>
              </Accordion>
            )}
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;