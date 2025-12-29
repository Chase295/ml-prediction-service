/**
 * Enhanced Loading Spinner Component
 * Multiple loading variants with improved UX
 */
import React from 'react';
import {
  Box,
  CircularProgress,
  Typography,
  LinearProgress,
  Paper,
  Skeleton,
  Fade
} from '@mui/material';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'spinner' | 'linear' | 'skeleton' | 'dots';
  fullScreen?: boolean;
  showSkeleton?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Lade Daten...',
  size = 'medium',
  variant = 'spinner',
  fullScreen = false,
  showSkeleton = false
}) => {
  const getSpinnerSize = () => {
    switch (size) {
      case 'small': return 32;
      case 'large': return 80;
      default: return 56;
    }
  };

  const getTypographyVariant = () => {
    switch (size) {
      case 'small': return 'body2';
      case 'large': return 'h5';
      default: return 'h6';
    }
  };

  const containerSx = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    p: 3,
    ...(fullScreen && {
      minHeight: '100vh',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9999,
      bgcolor: 'rgba(255, 255, 255, 0.9)',
    })
  };

  if (variant === 'linear') {
    return (
      <Fade in={true} timeout={300}>
        <Box sx={{ width: '100%', mb: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {message}
          </Typography>
          <LinearProgress />
        </Box>
      </Fade>
    );
  }

  if (variant === 'dots') {
    return (
      <Fade in={true} timeout={300}>
        <Box sx={containerSx}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {[0, 1, 2].map((i) => (
              <Box
                key={i}
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: 'primary.main',
                  animation: `bounce 1.4s ease-in-out ${i * 0.16}s infinite both`,
                  '@keyframes bounce': {
                    '0%, 80%, 100%': {
                      transform: 'scale(0)',
                      opacity: 0.5,
                    },
                    '40%': {
                      transform: 'scale(1)',
                      opacity: 1,
                    },
                  },
                }}
              />
            ))}
          </Box>
          <Typography
            variant={getTypographyVariant() as any}
            color="text.secondary"
            sx={{ mt: 2, textAlign: 'center' }}
          >
            {message}
          </Typography>
        </Box>
      </Fade>
    );
  }

  if (showSkeleton || variant === 'skeleton') {
    return (
      <Fade in={true} timeout={300}>
        <Box sx={{ p: 3, width: '100%' }}>
          <Skeleton variant="text" width="60%" height={40} sx={{ mb: 2 }} />
          <Skeleton variant="rectangular" height={200} sx={{ mb: 2, borderRadius: 2 }} />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Skeleton variant="text" width="40%" height={30} />
            <Skeleton variant="text" width="30%" height={30} />
          </Box>
          <Skeleton variant="text" width="80%" height={20} sx={{ mt: 1 }} />
          <Skeleton variant="text" width="60%" height={20} />
        </Box>
      </Fade>
    );
  }

  // Default spinner variant
  const content = (
    <Paper
      elevation={2}
      sx={{
        p: 4,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        borderRadius: 3,
        minWidth: size === 'large' ? 300 : 250,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Background animation */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.05,
          background: `linear-gradient(45deg, transparent 30%, rgba(25, 118, 210, 0.1) 50%, transparent 70%)`,
          animation: 'shimmer 2s infinite',
          '@keyframes shimmer': {
            '0%': { transform: 'translateX(-100%)' },
            '100%': { transform: 'translateX(100%)' },
          },
        }}
      />

      <CircularProgress
        size={getSpinnerSize()}
        thickness={4}
        sx={{
          mb: 3,
          color: 'primary.main',
          position: 'relative',
          zIndex: 1
        }}
      />

      <Typography
        variant={getTypographyVariant() as any}
        color="text.secondary"
        sx={{
          textAlign: 'center',
          position: 'relative',
          zIndex: 1,
          mb: 2
        }}
      >
        {message}
      </Typography>

      {/* Subtle progress dots */}
      <Box sx={{ display: 'flex', gap: 0.5, position: 'relative', zIndex: 1 }}>
        {[0, 1, 2].map((i) => (
          <Box
            key={i}
            sx={{
              width: 4,
              height: 4,
              borderRadius: '50%',
              bgcolor: 'primary.light',
              animation: `pulse 1.5s ease-in-out ${i * 0.2}s infinite both`,
              '@keyframes pulse': {
                '0%, 100%': { opacity: 0.3 },
                '50%': { opacity: 1 },
              },
            }}
          />
        ))}
      </Box>
    </Paper>
  );

  return (
    <Fade in={true} timeout={300}>
      <Box sx={containerSx}>
        {content}
      </Box>
    </Fade>
  );
};

export default LoadingSpinner;