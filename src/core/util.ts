export const clampNum = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const round = (v: number, d: number) => {
  const f = 10 ** d;
  return Math.round(v * f) / f;
};
const nf = new Map<number, Intl.NumberFormat>();
/** Türkçe sayı biçimi (ondalık virgül). */
export const fmt = (v: number, d = 2) => {
  if (!nf.has(d)) nf.set(d, new Intl.NumberFormat('tr-TR', { maximumFractionDigits: d }));
  return nf.get(d)!.format(v);
};
export const remStr = (px: number) => `${round(px / 16, 4)}rem`;
export const has = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);
export const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
/** Kullanıcı girdisini sayıya çevirir: virgül ondalık ayırıcı kabul edilir. */
export const parseNum = (raw: string): number | null => {
  const t = raw.trim().replace(/\s/g, '').replace(',', '.');
  if (!t || !/^-?\d*\.?\d+$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};
