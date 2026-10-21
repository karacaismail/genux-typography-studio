/** Studio arayüzünün tek token kaynağı. CSS değişkenleri (cssVariablesResolver) ve
 *  Mantine bileşen süreleri (JS) buradan beslenir. */

/** Kalıcı UX hareket sözleşmesi: simetrik easeInOut Cubic. Giriş ve çıkış aynı eğri. */
export const MOTION = {
  ease: 'cubic-bezier(.65, 0, .35, 1)',
  fast: 120,
  base: 180,
  slow: 240,
} as const;
/** Normal durumda süre aralığı (ms). Kapı bu aralığın dışını reddeder. */
export const MOTION_RANGE = { min: 80, max: 320 } as const;

type Scheme = Record<string, string>;
export const COLOR_TOKENS: { light: Scheme; dark: Scheme } = {
  light: {
    bg: '#f7f7f6',
    surface: '#ffffff',
    sunken: '#f1f1f0',
    hover: '#ececea',
    pressed: '#e3e3e0',
    line: '#e4e4e1',
    'line-field': '#8e8e8a',
    text: '#1c1c1b',
    'text-2': '#52524f',
    'text-3': '#6b6b67',
    accent: '#2457d6',
    'accent-hover': '#1b47b5',
    'accent-soft': '#e8eefc',
    'accent-text': '#1e4fc4',
    'on-accent': '#ffffff',
    focus: '#1c1c1b',
    'focus-on-accent': '#ffffff',
    warn: '#8a5300',
    'warn-soft': '#fbf0de',
    pass: '#2b6b3a',
    'step-border': '#c53030',
    'pass-soft': '#e5f1e7',
    scrim: 'rgba(20, 20, 19, .32)',
    shadow: '0 1px 2px rgba(20, 20, 19, .06), 0 8px 24px rgba(20, 20, 19, .08)',
    frame: '#d9d9d6',
  },
  dark: {
    bg: '#141413',
    surface: '#1b1b1a',
    sunken: '#111110',
    hover: '#262624',
    pressed: '#2e2e2c',
    line: '#2c2c2a',
    'line-field': '#74746f',
    text: '#ededec',
    'text-2': '#b9b9b5',
    'text-3': '#9d9d99',
    accent: '#2f63e6',
    'accent-hover': '#3f70ea',
    'accent-soft': '#1f2a45',
    'accent-text': '#9db8ff',
    'on-accent': '#ffffff',
    focus: '#ededec',
    'focus-on-accent': '#ffffff',
    warn: '#f0b55a',
    'warn-soft': '#3a2c14',
    pass: '#7cc48a',
    'step-border': '#ff7b7b',
    'pass-soft': '#1c2e20',
    scrim: 'rgba(0, 0, 0, .5)',
    shadow: '0 1px 2px rgba(0, 0, 0, .4), 0 8px 24px rgba(0, 0, 0, .35)',
    frame: '#3a3a37',
  },
};

/** Önizleme tuvali: uygulama temasından bağımsız; çıktı kuralı gereği metin ve zeminler yalnız gri.
 *  pv-hl*: seçim vurgusu (arayüz katmanı, çıktıya girmez). */
export const CANVAS_TOKENS: { light: Scheme; dark: Scheme } = {
  light: {
    canvas: '#ffffff', 'canvas-2': '#f4f4f4', 'canvas-field': '#ececec', 'canvas-stroke': 'rgba(0, 0, 0, .12)', 'canvas-text': '#262626',
    'canvas-guide': 'rgba(0, 0, 0, .05)', 'pv-hl': 'rgba(36, 87, 214, .1)', 'pv-hl-bar': '#2457d6', 'pv-hl-on': '#ffffff',
    // Tuval içindeki odak çizgisi tuval temasına göre (uygulama teması farklı olabilir).
    'gx-focus': '#141414',
  },
  dark: {
    canvas: '#1a1a1a', 'canvas-2': '#0e0e0e', 'canvas-field': '#262626', 'canvas-stroke': 'rgba(255, 255, 255, .14)', 'canvas-text': '#e0e0e0',
    'canvas-guide': 'rgba(255, 255, 255, .06)', 'pv-hl': 'rgba(122, 162, 255, .16)', 'pv-hl-bar': '#7aa2ff', 'pv-hl-on': '#0e0e0e',
    'gx-focus': '#f2f2f2',
  },
};

/** Odak göstergesi: 3 px alt çizgi. Çevreleyen halka kullanılmaz. */
export const FOCUS_BAR = '3px';

/** Fiziksel cihaz kasası: ekran içeriğine uygulanmayan sabit malzeme. */
export const DEVICE_MATERIAL = {
  shell: '#090a0c', lens: '#030408', edge: '#a0a3a7',
  finish: 'linear-gradient(100deg, #25272b 0%, #8d9094 1%, #e8e9eb 1.5%, #45474b 2.2%, #121316 4%, #181a1d 48%, #2c2e32 94%, #b5b8bb 98%, #55585c 99%, #151619 100%)',
  glass: 'linear-gradient(124deg, rgba(255,255,255,.13) 0%, rgba(255,255,255,.025) 17%, transparent 33%, rgba(0,0,0,.25) 72%, rgba(255,255,255,.04) 100%), #08090b',
  'body-shadow': '0 2px 3px rgba(0,0,0,.28), 0 12px 20px -10px rgba(0,0,0,.45), inset 0 0 0 1px rgba(255,255,255,.5), inset 0 0 0 3px rgba(0,0,0,.8)',
  'edge-light': 'inset 0 1px 1px rgba(255,255,255,.6), inset 1px 0 1px rgba(255,255,255,.24), inset -1px 0 1px rgba(0,0,0,.9)',
  'screen-depth': 'inset 0 2px 4px rgba(0,0,0,.65), inset 2px 0 4px rgba(0,0,0,.35), inset -2px 0 3px rgba(0,0,0,.3), inset 0 0 0 1px rgba(0,0,0,.8)',
  'lens-finish': 'radial-gradient(circle at 38% 30%, #8b9caf 0%, #25394c 13%, #070d19 28%, #161d2a 48%, #020307 58%, #1e2228 75%, #08090d 100%)',
  'speaker-finish': 'linear-gradient(180deg, #070809, #252629 48%, #090a0c)',
  'home-finish': 'radial-gradient(ellipse at 50% 100%, #24262a, #050608 72%)',
  'home-ring': 'inset 0 1px 2px rgba(0,0,0,.95), 0 1px 1px rgba(255,255,255,.22)',
  'key-finish': 'linear-gradient(90deg, #303236, #b4b6ba 45%, #3a3c40)',
  indicator: '#808186',
} as const;
