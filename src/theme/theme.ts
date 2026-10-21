import { createTheme, type CSSVariablesResolver, type MantineColorsTuple } from '@mantine/core';
import { COLOR_TOKENS, DEVICE_MATERIAL, FOCUS_BAR, MOTION } from './tokens';

const accent: MantineColorsTuple = ['#eef3fe', '#dbe5fd', '#b5c8f9', '#8eaaf5', '#6c91f1', '#5580ef', '#2f63e6', '#2457d6', '#1b47b5', '#123791'];
const gray: MantineColorsTuple = ['#f8f8f7', '#f1f1f0', '#e7e7e5', '#d9d9d6', '#bdbdb9', '#9a9a96', '#74746f', '#565653', '#3a3a37', '#1f1f1d'];
const dark: MantineColorsTuple = ['#ededec', '#c9c9c6', '#a8a8a4', '#8c8c88', '#3d3d3b', '#333331', '#2a2a28', '#1d1d1c', '#171716', '#111110'];

const transitionProps = { duration: MOTION.base, timingFunction: MOTION.ease } as const;
const FONT = '"Outfit", system-ui, -apple-system, "Segoe UI", sans-serif';

export const theme = createTheme({
  // Çevreleyen odak halkası yasak: Mantine halkası kapatılır, görünür alternatif global.scss'tedir.
  focusRing: 'never',
  // Basılı durumda kutu kaydırma (translateY) yok.
  activeClassName: '',
  respectReducedMotion: true,
  cursorType: 'pointer',
  fontFamily: FONT,
  fontFamilyMonospace: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  headings: {
    fontFamily: FONT,
    fontWeight: '600',
    sizes: {
      h1: { fontSize: '1.75rem', lineHeight: '1.25' },
      h2: { fontSize: '1.375rem', lineHeight: '1.3' },
      h3: { fontSize: '1.125rem', lineHeight: '1.35' },
      h4: { fontSize: '1rem', lineHeight: '1.4' },
      h5: { fontSize: '0.875rem', lineHeight: '1.45' },
      h6: { fontSize: '0.875rem', lineHeight: '1.45' },
    },
  },
  // Aracın kendi metni en az 14 CSS px (global kural).
  fontSizes: { xs: '0.875rem', sm: '0.875rem', md: '1rem', lg: '1.125rem', xl: '1.25rem' },
  lineHeights: { xs: '1.45', sm: '1.45', md: '1.5', lg: '1.5', xl: '1.45' },
  spacing: { xs: '0.5rem', sm: '0.75rem', md: '1rem', lg: '1.5rem', xl: '2rem' },
  radius: { xs: '0.25rem', sm: '0.375rem', md: '0.5rem', lg: '0.75rem', xl: '1rem' },
  defaultRadius: 'sm',
  colors: { accent, gray, dark },
  primaryColor: 'accent',
  primaryShade: { light: 7, dark: 6 },
  autoContrast: true,
  shadows: { xs: 'none', sm: 'var(--gx-shadow)', md: 'var(--gx-shadow)', lg: 'var(--gx-shadow)', xl: 'var(--gx-shadow)' },
  components: {
    Popover: { defaultProps: { transitionProps, shadow: 'md' } },
    Menu: { defaultProps: { transitionProps, shadow: 'md' } },
    Tooltip: { defaultProps: { transitionProps, openDelay: 300, withArrow: false } },
    HoverCard: { defaultProps: { transitionProps } },
    Combobox: { defaultProps: { transitionProps } },
    Select: { defaultProps: { comboboxProps: { transitionProps, shadow: 'md' }, allowDeselect: false, checkIconPosition: 'right' } },
    Modal: { defaultProps: { transitionProps, overlayProps: { backgroundOpacity: 1, color: 'var(--gx-scrim)' } } },
    Drawer: { defaultProps: { transitionProps, overlayProps: { backgroundOpacity: 1, color: 'var(--gx-scrim)' } } },
    Accordion: { defaultProps: { transitionDuration: MOTION.base } },
    Collapse: { defaultProps: { transitionDuration: MOTION.base, transitionTimingFunction: MOTION.ease } },
    SegmentedControl: { defaultProps: { transitionDuration: MOTION.base, transitionTimingFunction: MOTION.ease } },
    AppShell: { defaultProps: { transitionDuration: MOTION.base, transitionTimingFunction: MOTION.ease } },
    Button: { defaultProps: { size: 'sm', variant: 'default' } },
    ActionIcon: { defaultProps: { size: 'lg', variant: 'subtle', color: 'gray' } },
    Badge: { defaultProps: { variant: 'light', radius: 'sm', size: 'lg' } },
    Kbd: { defaultProps: { size: 'md' } },
    Tabs: { defaultProps: { keepMounted: false } },
  },
  other: { focusBar: FOCUS_BAR },
});

/** Tasarım tokenları CSS değişkeni olarak; Mantine'in kendi anlamsal değişkenleri de bunlara bağlanır. */
export const resolver: CSSVariablesResolver = () => {
  const vars = (scheme: 'light' | 'dark') => ({
    ...Object.fromEntries(Object.entries(COLOR_TOKENS[scheme]).map(([k, v]) => [`--gx-${k}`, v])),
    '--mantine-color-body': 'var(--gx-bg)',
    '--mantine-color-text': 'var(--gx-text)',
    '--mantine-color-dimmed': 'var(--gx-text-2)',
    '--mantine-color-placeholder': 'var(--gx-text-3)',
    '--mantine-color-default': 'var(--gx-surface)',
    '--mantine-color-default-hover': 'var(--gx-hover)',
    '--mantine-color-default-color': 'var(--gx-text)',
    '--mantine-color-default-border': 'var(--gx-line-field)',
    '--mantine-color-anchor': 'var(--gx-accent-text)',
  });
  return {
    variables: {
      ...Object.fromEntries(Object.entries(DEVICE_MATERIAL).map(([key,value])=>[`--device-${key}`,value])),
      '--gx-ease': MOTION.ease,
      '--gx-dur-fast': `${MOTION.fast}ms`,
      '--gx-dur': `${MOTION.base}ms`,
      '--gx-dur-slow': `${MOTION.slow}ms`,
      '--gx-focus-bar': FOCUS_BAR,
      '--gx-toolbar-h': '4rem',
      '--gx-workflow-header-max': '120px',
      '--gx-workflow-header-hit': '44px',
      '--gx-breakpoint-label-h': '28px',
      '--gx-status-h': '2.5rem',
      '--gx-hit': '2.25rem',
    },
    light: vars('light'),
    dark: vars('dark'),
  };
};
