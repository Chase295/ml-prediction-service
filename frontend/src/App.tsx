/**
 * Haupt-Applikation
 * Routing, Theme und globale Provider
 */
import React, { useState, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';

// Provider
import { queryClient } from './services/queryClient';

// Components
import ErrorBoundary from './components/common/ErrorBoundary';
import LoadingSpinner from './components/common/LoadingSpinner';
import AppBar from './components/layout/AppBar';

// Pages (werden später implementiert)
const Overview = React.lazy(() => import('./pages/Overview'));
const ModelDetails = React.lazy(() => import('./pages/ModelDetails'));
const AlertConfig = React.lazy(() => import('./pages/AlertConfig'));
const AlertSystem = React.lazy(() => import('./pages/AlertSystem'));
const ModelImport = React.lazy(() => import('./pages/ModelImport'));
const Settings = React.lazy(() => import('./pages/Settings'));

// Theme Context für Darkmode
export const ThemeContext = React.createContext({
  toggleTheme: () => {},
  isDarkMode: false
});

function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Load from localStorage or default to dark mode
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true; // Default to dark mode for eye protection
  });

  const toggleTheme = () => {
    setIsDarkMode(prev => {
      const newMode = !prev;
      localStorage.setItem('theme', newMode ? 'dark' : 'light');
      return newMode;
    });
  };

  const theme = useMemo(() => createTheme({
    palette: {
      mode: isDarkMode ? 'dark' : 'light',
      primary: {
        main: '#1976d2',
      },
      secondary: {
        main: '#dc004e',
      },
      background: {
        default: isDarkMode ? '#121212' : '#fafafa',
        paper: isDarkMode ? '#1e1e1e' : '#ffffff',
      },
    },
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      h4: {
        fontWeight: 600,
      },
      h5: {
        fontWeight: 600,
      },
      h6: {
        fontWeight: 600,
      },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 8,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 12,
          },
        },
      },
    },
  }), [isDarkMode]);


  return (
    <ThemeContext.Provider value={{ toggleTheme, isDarkMode }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <Router>
              <Box sx={{
                minHeight: '100vh',
                width: '100vw',
                backgroundColor: 'background.default',
                margin: 0,
                padding: 0
              }}>
                {/* Navigation */}
                <AppBar />

                {/* Main Content */}
                <Box
                  component="main"
                  sx={{
                    pt: '64px',
                    width: '100%',
                    minHeight: 'calc(100vh - 64px)'
                  }}
                >
                  <React.Suspense fallback={<LoadingSpinner message="Seite wird geladen..." />}>
                    <Routes>
                      {/* Redirect root to overview */}
                      <Route path="/" element={<Navigate to="/overview" replace />} />

                      {/* Main routes */}
                      <Route path="/overview" element={<Overview />} />
                      <Route path="/model/:id" element={<ModelDetails />} />
                      <Route path="/model/:id/alert-config" element={<AlertConfig />} />
                      <Route path="/alert-system" element={<AlertSystem />} />
                      <Route path="/model-import" element={<ModelImport />} />
                      <Route path="/settings" element={<Settings />} />

                      {/* Fallback für ungültige Routen */}
                      <Route path="*" element={<Navigate to="/overview" replace />} />
                    </Routes>
                  </React.Suspense>
                </Box>
              </Box>
            </Router>
          </QueryClientProvider>
        </ErrorBoundary>
      </ThemeProvider>
    </ThemeContext.Provider>
  );
}

export default App;