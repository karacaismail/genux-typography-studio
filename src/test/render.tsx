import { MantineProvider } from '@mantine/core';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { theme } from '../theme/theme';

export const renderUi = (ui: ReactElement) => render(<MantineProvider theme={theme}>{ui}</MantineProvider>);
