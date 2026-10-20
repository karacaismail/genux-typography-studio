import { BASE_BP, HARD, TIER_IDS, TIERS, decisionAt, tierOf } from './constants';
import { ROLE, isReading } from './roles';
import type { ContextSettings, RoleProps } from './types';
import { clampNum, fmt, remStr, round } from './util';

export const minSizeFor = (id: string) => (ROLE[id].kind === 'long' ? HARD.longReading : isReading(id) ? HARD.minReading : HARD.minReadable);
export const isFluid = (r: RoleProps, s: ContextSettings) => r.mode === 'fluid' && s.set === 'expressive';
export const isRelative = (r: RoleProps) => r.mode === 'relative';
export const isTiers = (r: RoleProps): r is RoleProps & { sizes: NonNullable<RoleProps['sizes']> } => r.mode === 'tiers' && !!r.sizes;
/** 16 px üst öğede göreli boyutun karşılığı (alt sınırla). */
export const relNominal = (id: string, r: RoleProps) => Math.max(minSizeFor(id), round(r.em * 16, 2));
export const maxOf = (r: RoleProps) => Math.max(r.max, r.size);
export const minSizeOf = (r: RoleProps, id?: string) =>
  isTiers(r) ? Math.min(...TIER_IDS.map((t) => r.sizes[t])) : isRelative(r) && id ? relNominal(id, r) : r.size;

/** Belirli bir ekran genişliğinde uygulanan boyut (px). */
export function sizeAt(r: RoleProps, s: ContextSettings, id: string, w: number) {
  if (isRelative(r)) return relNominal(id, r);
  if (isTiers(r)) return r.sizes[tierOf(w)];
  if (!isFluid(r, s)) return r.size;
  const slope = (maxOf(r) - r.size) / (s.maxW - s.minW);
  return round(clampNum(r.size + slope * (w - s.minW), r.size, maxOf(r)), 2);
}
/** Ekrana göre mod: mobil temel değer + min-width kırılımları. */
export function cssTiers(r: RoleProps & { sizes: NonNullable<RoleProps['sizes']> }) {
  return Object.fromEntries(TIERS.map((t) => [t.min ? `@media (min-width: ${t.min}px)` : 'base', remStr(r.sizes[t.id])]));
}
export function cssSize(r: RoleProps, s: ContextSettings, id: string) {
  if (isRelative(r)) return `max(${remStr(minSizeFor(id))}, ${r.em}em)`;
  if (isTiers(r)) return TIERS.map((t) => `${t.min ? `≥${t.min}px ` : ''}${remStr(r.sizes[t.id])}`).join(' · ');
  if (!isFluid(r, s)) return remStr(r.size);
  const slope = (maxOf(r) - r.size) / (s.maxW - s.minW);
  const intercept = r.size - slope * s.minW;
  const unit = s.basis === 'viewport' ? 'vw' : 'cqi';
  const fluidPart = intercept >= 0
    ? `${remStr(intercept)} + ${round(slope * 100, 4)}${unit}`
    : `${round(slope * 100, 4)}${unit} - ${remStr(-intercept)}`;
  return `clamp(${remStr(r.size)}, ${fluidPart}, ${remStr(maxOf(r))})`;
}
/** Gezgin ve rapor için kısa boyut metni. */
export function valueText(r: RoleProps, s: ContextSettings) {
  if (isRelative(r)) return `${fmt(r.em)}em`;
  if (isTiers(r)) return TIER_IDS.map((t) => fmt(r.sizes[t])).join('/');
  return isFluid(r, s) ? `${fmt(r.size)}→${fmt(maxOf(r))}` : fmt(r.size);
}
/** Karar verilmiş türlerde (H1–H6, gövde, paragraf, uzun okuma) o genişlikteki karardan sapma. */
export function deviates(r: RoleProps, _s: ContextSettings, id: string, w: number = BASE_BP) {
  const dec = decisionAt(id, w);
  if (dec === null) return false;
  if (isRelative(r)) return relNominal(id, r) !== dec;
  if (isTiers(r)) return TIER_IDS.some((t) => r.sizes[t] !== decisionAt(id, TIERS.find((x) => x.id === t)!.min || BASE_BP));
  return r.size !== dec;
}
