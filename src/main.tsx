import './app/bootstrap';
import '@mantine/core/styles.layer.css';
import '@mantine/spotlight/styles.layer.css';
import '@mantine/notifications/styles.layer.css';
import './theme/global.scss';
import './features/canvas/canvas.scss';

import { MantineProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import { RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { router } from './app/router';
import { installFocusMode } from './theme/focus-mode';
import { resolver, theme } from './theme/theme';
import { MOTION } from './theme/tokens';

installFocusMode();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={theme} cssVariablesResolver={resolver} defaultColorScheme="auto">
      <ModalsProvider>
        <Notifications position="bottom-right" limit={3} transitionDuration={MOTION.slow} zIndex={400} />
        <RouterProvider router={router} />
      </ModalsProvider>
    </MantineProvider>
  </StrictMode>,
);
