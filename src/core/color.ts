import { BG, BG_NAME } from './constants';
import { ROLE } from './roles';
import { minSizeOf } from './size';
import type { RoleProps, Theme } from './types';
import { clampNum } from './util';

/** Yalnız siyah, beyaz ve gri kabul edilir (R = G = B). Geçersizse null. */
export function normalizeGray(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  let h = value.trim().toLowerCase();
  if (!h.startsWith('#')) h = `#${h}`;
  if (/^#[0-9a-f]{3}$/.test(h)) h = `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`;
  if (!/^#[0-9a-f]{6}$/.test(h)) return null;
  return h.slice(1, 3) === h.slice(3, 5) && h.slice(3, 5) === h.slice(5, 7) ? h : null;
}
export const grayHex = (v: number) => {
  const h = clampNum(Math.round(v), 0, 255).toString(16).padStart(2, '0');
  return `#${h}${h}${h}`;
};
export const grayValue = (hex: string) => parseInt(hex.slice(1, 3), 16);
const channel = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
export const luminance = (hex: string) => {
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(channel(hex, 0)) + 0.7152 * lin(channel(hex, 1)) + 0.0722 * lin(channel(hex, 2));
};
export const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
/** WCAG büyük metin: 24 px, ya da 18,66 px ve kalın (700+). */
export const isLargeText = (size: number, w: number) => size >= 24 || (size >= 18.66 && w >= 700);

export interface ContrastInfo { ratio: number; on: string; need: number; pass: boolean; aaa: boolean }
/** Türün durduğu en zayıf zemine göre kontrast. */
export function contrastInfo(r: RoleProps, id: string, theme: Theme): ContrastInfo {
  const worst = (ROLE[id].bgs.length ? ROLE[id].bgs : (['surface'] as const))
    .map((k) => ({ k, ratio: contrast(r.c[theme], BG[theme][k]) }))
    .sort((a, b) => a.ratio - b.ratio)[0];
  const need = isLargeText(minSizeOf(r, id), r.w) ? 3 : 4.5;
  return { ratio: worst.ratio, on: BG_NAME[worst.k], need, pass: worst.ratio >= need, aaa: worst.ratio >= (need === 3 ? 4.5 : 7) };
}
