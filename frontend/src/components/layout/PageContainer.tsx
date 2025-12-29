/**
 * PageContainer Component
 * Standard-Layout für alle Seiten mit responsive Design
 */
import React from 'react';
import { Container } from '@mui/material';

interface PageContainerProps {
  children: React.ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
  disableGutters?: boolean;
  sx?: object;
}

export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  maxWidth = false,
  disableGutters = true,
  sx = {}
}) => {
  return (
    <Container
      maxWidth={maxWidth}
      disableGutters={disableGutters}
      sx={{
        width: '100%',
        maxWidth: '100% !important',
        py: 3,
        px: { xs: 2, md: 3 },
        ...sx
      }}
    >
      {children}
    </Container>
  );
};

export default PageContainer;
