/**
 * PageContainer Component
 * Vereinfachter Container für Seiten-Content im neuen Layout
 */
import React from 'react';
import { Container } from '@mui/material';

interface PageContainerProps {
  children: React.ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
  sx?: object;
}

export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  maxWidth = 'xl',
  sx = {}
}) => {
  return (
    <Container
      maxWidth={maxWidth}
      sx={{
        width: '100%',
        ...sx
      }}
    >
      {children}
    </Container>
  );
};

export default PageContainer;
