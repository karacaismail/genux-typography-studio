import type { CSSProperties } from 'react';
import { CANVAS_TOKENS } from '../../theme/tokens';

const cache = new Map<string, CSSProperties>();
/** Tuval teması değişkenleri (tek kaynak: CANVAS_TOKENS). */
export function canvasVars(theme: 'light' | 'dark'): CSSProperties {
  if (!cache.has(theme)) cache.set(theme, Object.fromEntries(Object.entries(CANVAS_TOKENS[theme]).map(([k, v]) => [`--${k}`, v])) as CSSProperties);
  return cache.get(theme)!;
}
