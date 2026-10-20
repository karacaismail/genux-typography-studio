import { CHOICES, CONTEXTS, HARD, MAX_MAX, RANGES, SIZE_MAX, TIER_IDS } from './constants';
import { normalizeGray } from './color';
import { ROLE, noClamp } from './roles';
import { minSizeFor } from './size';
import type { ContextId, ContextSettings, RoleProps, SizeMode, TierId } from './types';
import { clampNum, isObj, round } from './util';

const MODES: SizeMode[] = ['static', 'tiers', 'fluid', 'relative'];
const CHOICE_KEYS = ['ff', 'fst', 'tt', 'td', 'num', 'ta', 'wrap'] as const;
const RANGE_KEYS = ['lh', 'ls', 'ws', 'mt', 'mb', 'mw'] as const;
const num = (v: unknown, fb: number) => (v !== null && v !== '' && typeof v !== 'boolean' && Number.isFinite(Number(v)) ? Number(v) : fb);

/** Kesin kurallar: her düzenleme, içe aktarma ve çözümleme bu süzgeçten geçer.
 *  Girdiyi değiştirmez; temiz, eksiksiz bir RoleProps döner. */
export function enforceRole(id: string, raw: unknown): RoleProps {
  const def = ROLE[id].def;
  const src = isObj(raw) ? raw : {};
  const long = ROLE[id].kind === 'long';
  const min = minSizeFor(id);
  let size = clampNum(round(num(src.size, def.size), 1), min, SIZE_MAX);
  let mode: SizeMode = MODES.includes(src.mode as SizeMode) ? (src.mode as SizeMode) : src.fluid === true ? 'fluid' : 'static';
  const em = clampNum(round(num(src.em, def.em), 3), RANGES.em.min, RANGES.em.max);
  const gr = long ? 1 : clampNum(round(num(src.gr, def.gr), 3), RANGES.gr.min, RANGES.gr.max);
  if (long) { size = HARD.longReading; mode = 'static'; }
  // Ekran başına boyutlar: her biri aynı kurallardan geçer; mod değişse de değerler korunur.
  let sizes: Record<TierId, number> | null = null;
  if (isObj(src.sizes)) {
    const s = src.sizes;
    sizes = Object.fromEntries(TIER_IDS.map((t) => [t, long ? HARD.longReading : clampNum(round(num(s[t], size), 1), min, SIZE_MAX)])) as Record<TierId, number>;
  } else if (mode === 'tiers') {
    sizes = Object.fromEntries(TIER_IDS.map((t) => [t, size])) as Record<TierId, number>;
  }
  const max = long ? HARD.longReading : Math.max(clampNum(round(num(src.max, def.max), 1), HARD.minReadable, MAX_MAX), size);
  const wRaw = num(src.w, def.w);
  const w = wRaw >= RANGES.w.min && wRaw <= RANGES.w.max && wRaw % 100 === 0 ? wRaw : def.w;
  const out = { ...def, size, mode, sizes, em, gr, max, w } as RoleProps;
  for (const k of RANGE_KEYS) {
    const g = RANGES[k];
    out[k] = clampNum(round(num(src[k], def[k]), k === 'mw' ? 0 : 3), g.min, g.max);
  }
  out.clamp = noClamp(id) ? 0 : clampNum(Math.round(num(src.clamp, def.clamp)), 0, 4);
  for (const k of CHOICE_KEYS) {
    const v = src[k];
    (out as unknown as Record<string, unknown>)[k] = (CHOICES[k] as readonly (readonly [string, string])[]).some(([c]) => c === v) ? v : def[k];
  }
  const c = isObj(src.c) ? src.c : {};
  out.c = { light: normalizeGray(c.light) ?? def.c.light, dark: normalizeGray(c.dark) ?? def.c.dark };
  return out;
}

export function enforceSettings(ctx: ContextId, raw: unknown): ContextSettings {
  const s = isObj(raw) ? raw : {};
  const set = s.set === 'productive' || s.set === 'expressive' ? s.set : CONTEXTS.find((c) => c.id === ctx)!.set;
  const basis = s.basis === 'container' ? 'container' : 'viewport';
  const minW = clampNum(Math.round(Number(s.minW) || 320), 240, 1200);
  const maxW = clampNum(Math.round(Number(s.maxW) || 1280), minW + 80, 2560);
  return { set, basis, minW, maxW };
}
