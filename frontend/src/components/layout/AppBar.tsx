/**
 * AppBar Component
 * Haupt-Navigation der Anwendung mit professionellem Design
 */
import React from 'react';
import {
  AppBar as MuiAppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Home as HomeIcon,
  Notifications as NotificationsIcon,
  Psychology as BrainIcon,
  UploadFile as UploadIcon,
  Settings as SettingsIcon,
  Brightness4 as DarkIcon,
  Brightness7 as LightIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { ThemeContext } from '../../App';

export const AppBar: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const { toggleTheme, isDarkMode } = React.useContext(ThemeContext);

  const navigationItems = [
    { path: '/overview', label: 'Übersicht', icon: HomeIcon },
    { path: '/alert-system', label: 'Alert-System', icon: NotificationsIcon },
    { path: '/model-import', label: 'Modell-Import', icon: UploadIcon },
    { path: '/settings', label: 'Einstellungen', icon: SettingsIcon },
  ];

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <MuiAppBar
      position="sticky"
      elevation={2}
      sx={{
        backgroundColor: 'background.paper',
        color: 'text.primary',
        borderBottom: 1,
        borderColor: 'divider'
      }}
    >
      <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }}>
        {/* Logo/Brand - links */}
        <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <BrainIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography
            variant="h6"
            component="div"
            sx={{
              fontWeight: 700,
              background: 'linear-gradient(45deg, #1976d2, #42a5f5)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              display: { xs: 'none', sm: 'block' } // Auf Mobile ausblenden für mehr Platz
            }}
          >
            ML Prediction Service
          </Typography>
          <Typography
            variant="h6"
            component="div"
            sx={{
              fontWeight: 700,
              display: { xs: 'block', sm: 'none' } // Nur auf Mobile anzeigen
            }}
          >
            ML Service
          </Typography>
        </Box>

        {/* Horizontale Navigation - zentriert */}
        <Box sx={{
          display: 'flex',
          gap: { xs: 0.5, sm: 1 },
          flexGrow: 1,
          justifyContent: 'center',
          mx: 2
        }}>
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <Button
                key={item.path}
                startIcon={!isMobile ? <Icon /> : undefined}
                onClick={() => navigate(item.path)}
                variant={active ? 'contained' : 'text'}
                size={isMobile ? 'small' : 'small'}
                sx={{
                  px: { xs: 1, sm: 2 },
                  py: 1,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: active ? 600 : 400,
                  minWidth: 'auto',
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  '&:hover': {
                    backgroundColor: active ? 'primary.main' : 'action.hover'
                  }
                }}
              >
                {isMobile ? <Icon fontSize="small" /> : item.label}
              </Button>
            );
          })}
        </Box>

        {/* Theme Toggle & Status - rechts */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
          {/* Theme Toggle */}
          <Tooltip title={`Zu ${isDarkMode ? 'Hell' : 'Dunkel'}modus wechseln`}>
            <IconButton
              color="inherit"
              onClick={toggleTheme}
              size={isMobile ? 'small' : 'medium'}
            >
              {isDarkMode ? <LightIcon /> : <DarkIcon />}
            </IconButton>
          </Tooltip>

          {/* Status Indicator - nur auf Desktop */}
          {!isMobile && (
            <>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: 'success.main',
                  animation: 'pulse 2s infinite'
                }}
              />
              <Typography variant="body2" color="text.secondary">
                API Online
              </Typography>
            </>
          )}
        </Box>
      </Toolbar>

      {/* Add pulse animation */}
      <style>
        {`
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
          }
        `}
      </style>
    </MuiAppBar>
  );
};

export default AppBar;
