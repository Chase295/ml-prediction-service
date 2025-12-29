/**
 * NavigationDrawer Component
 * Mobile Navigation Drawer für kleinere Bildschirme
 */
import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
  Typography
} from '@mui/material';
import {
  Home as HomeIcon,
  BarChart as ChartIcon,
  Settings as SettingsIcon,
  Psychology as BrainIcon,
  CloudUpload as UploadIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

interface NavigationDrawerProps {
  open: boolean;
  onClose: () => void;
}

export const NavigationDrawer: React.FC<NavigationDrawerProps> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const navigationItems = [
    { path: '/overview', label: 'Übersicht', icon: HomeIcon },
    { path: '/alert-system', label: 'Alert-System', icon: BrainIcon },
    { path: '/model-import', label: 'Modell-Import', icon: UploadIcon },
    { path: '/analytics', label: 'Analytics', icon: ChartIcon },
    { path: '/settings', label: 'Einstellungen', icon: SettingsIcon },
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
    onClose();
  };

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <>
      {/* Mobile Drawer (Overlay) */}
      <Drawer
        anchor="left"
        open={open}
        onClose={onClose}
        variant="temporary"
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: 280,
            backgroundColor: 'background.paper',
            borderRight: 1,
            borderColor: 'divider'
          }
        }}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
      >
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <BrainIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            ML Prediction Service
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          Control Panel
        </Typography>
      </Box>

      {/* Navigation Items */}
      <List sx={{ pt: 1 }}>
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <ListItem key={item.path} disablePadding>
              <ListItemButton
                onClick={() => handleNavigation(item.path)}
                selected={active}
                sx={{
                  mx: 1,
                  mb: 0.5,
                  borderRadius: 2,
                  '&.Mui-selected': {
                    backgroundColor: 'primary.main',
                    color: 'primary.contrastText',
                    '&:hover': {
                      backgroundColor: 'primary.dark'
                    },
                    '& .MuiListItemIcon-root': {
                      color: 'primary.contrastText'
                    }
                  }
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <Icon />
                </ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Divider sx={{ my: 2 }} />

      {/* Footer */}
      <Box sx={{ p: 2, mt: 'auto' }}>
        <Typography variant="caption" color="text.secondary">
          Version 2.0 - React Frontend
        </Typography>
      </Box>
      </Drawer>

      {/* Desktop Drawer (Permanent) */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            width: 280,
            backgroundColor: 'background.paper',
            borderRight: 1,
            borderColor: 'divider',
            position: 'fixed',
            top: 64, // Under AppBar
            height: 'calc(100vh - 64px)',
            zIndex: 1000
          }
        }}
      >
        {/* Content für permanente Sidebar */}
        {/* Header */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <BrainIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              ML Prediction Service
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            Control Panel
          </Typography>
        </Box>

        {/* Navigation Items */}
        <List sx={{ pt: 1 }}>
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <ListItem key={item.path} disablePadding>
                <ListItemButton
                  onClick={() => handleNavigation(item.path)}
                  selected={active}
                  sx={{
                    mx: 1,
                    my: 0.5,
                    borderRadius: 2,
                    '&.Mui-selected': {
                      backgroundColor: 'primary.main',
                      color: 'primary.contrastText',
                      '&:hover': {
                        backgroundColor: 'primary.dark',
                      },
                      '& .MuiListItemIcon-root': {
                        color: 'primary.contrastText',
                      }
                    }
                  }}
                >
                  <ListItemIcon>
                    <Icon />
                  </ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>

        <Divider sx={{ my: 2 }} />

        {/* Footer */}
        <Box sx={{ p: 2, mt: 'auto' }}>
          <Typography variant="caption" color="text.secondary">
            Version 2.0 - React Frontend
          </Typography>
        </Box>
      </Drawer>
    </>
  );
};

export default NavigationDrawer;
