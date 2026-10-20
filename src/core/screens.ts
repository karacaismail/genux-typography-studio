import { BASE_BP, BASE_CTX, BREAKPOINTS, autoScale, breakpointAt } from './constants';
import { enforceRole } from './enforce';
import { PROPS, applyOverride, defaultRole, eqProp, inheritsFromBase, overridesOf, propSource, resetProps } from './resolve';
import { CTX_DEF, rolesOf } from './roles';
import type { ContextId, Decisions, PropKey, RoleOverrides, RoleProps } from './types';
import { has } from './util';

/** Kırılım zincirine girmeyen özellikler: renk (açık ve koyu ayrı, bütün ekranlarda aynı), boyut modu,
 *  ekran sınıfı listesi ve ekranla büyüme katsayısı. */
export const SCREEN_EXCLUDED: PropKey[] = ['c', 'mode', 'sizes', 'gr'];
export const SCREEN_KEYS: PropKey[] = PROPS.filter((k) => !SCREEN_EXCLUDED.includes(k));
export const isScreenKey = (k: PropKey) => !SCREEN_EXCLUDED.includes(k);

export const screensOf = (dec: Decisions, ctx: ContextId, id: string): Record<string, RoleOverrides> => dec.contexts[ctx].screens?.[id] ?? {};
const layerAt = (dec: Decisions, ctx: ContextId, id: string, bp: number): RoleOverrides => screensOf(dec, ctx, id)[String(bp)] ?? {};
/** Boyut çapası: o genişliğe kadarki en büyük kırılımda kullanıcının girdiği boyut. */
function screenAnchor(dec: Decisions, ctx: ContextId, id: string, bp: number): { w: number; size: number } | null {
  for (const b of [...BREAKPOINTS].reverse()) {
    if (b <= BASE_BP || b > bp) continue;
    const l = layerAt(dec, ctx, id, b);
    if (typeof l.size === 'number') return { w: b, size: l.size };
  }
  return null;
}
/** Bu bağlamın kendi temel boyutu var mı (ezme ya da ürün türü farkı)? Yoksa ürün türündeki element boyutu HTML'den hazır alır. */
const ownBaseSize = (dec: Decisions, ctx: ContextId, id: string) =>
  !inheritsFromBase(ctx, id) || has(overridesOf(dec, ctx, id), 'size') || has(overridesOf(dec, ctx, id), 'gr') || has(CTX_DEF[ctx][id] ?? {}, 'size');
/** Bu bağlamda türün kendi kırılım ezmesi olan kırılımlar. */
export const screenBreakpoints = (dec: Decisions, ctx: ContextId, id: string) =>
  BREAKPOINTS.filter((b) => b > BASE_BP && Object.keys(layerAt(dec, ctx, id, b)).length);

const cache = new WeakMap<Decisions, Map<string, RoleProps>>();

/** Bir ekran genişliğinde çözümlenmiş değer: üst katman (o genişlikte) ⊕ temel ezmeler ⊕ kırılım ezmeleri (küçükten büyüğe). */
export function resolveAt(dec: Decisions, ctx: ContextId, id: string, w: number): RoleProps {
  const bp = breakpointAt(w);
  let map = cache.get(dec);
  if (!map) cache.set(dec, (map = new Map()));
  const key = `${ctx}|${id}|${bp}`;
  const hit = map.get(key);
  if (hit) return hit;
  const parent = inheritsFromBase(ctx, id)
    ? enforceRole(id, { ...resolveAt(dec, BASE_CTX, id, bp), ...(CTX_DEF[ctx][id] ?? {}) })
    : defaultRole(ctx, id);
  // Her kırılımda önce katalog varsayılanı, sonra kullanıcı ayarı (aynı kırılımda kullanıcı kazanır; büyük kırılım küçüğü ezer).
  const layers = [overridesOf(dec, ctx, id), ...BREAKPOINTS.filter((b) => b > BASE_BP && b <= bp).map((b) => layerAt(dec, ctx, id, b))];
  let out = layers.some((l) => Object.keys(l).length) ? enforceRole(id, Object.assign({ ...parent, c: { ...parent.c } }, ...layers)) : parent;
  // İki uç modu: ara ekranlardaki eski size/max ezmeleri uygulanmaz.
  if (out.mode === 'endpoints' && bp > BASE_BP) {
    const base = resolveAt(dec, ctx, id, BASE_BP);
    out = enforceRole(id, { ...out, size: base.size, max: base.max });
  }
  // "Ekrana göre" listesi bütün ekranlar için ortaktır: üst kırılımlarda temel ekrandaki (320) liste kullanılır.
  if (out.mode === 'tiers' && bp > BASE_BP) {
    const baseSizes = resolveAt(dec, ctx, id, BASE_BP).sizes;
    if (JSON.stringify(baseSizes) !== JSON.stringify(out.sizes)) out = enforceRole(id, { ...out, sizes: baseSizes });
  }
  // Otomatik ölçek (yalnız sabit modda): en yakın alt çapadan genişlik oranıyla.
  if (out.mode === 'static' && bp > BASE_BP && out.gr !== 1) {
    const a = screenAnchor(dec, ctx, id, bp);
    let size: number | null = null;
    if (a) size = autoScale(a.size, a.w, bp, out.gr);
    else if (ownBaseSize(dec, ctx, id)) {
      const base = enforceRole(id, { ...(inheritsFromBase(ctx, id) ? enforceRole(id, { ...resolveAt(dec, BASE_CTX, id, BASE_BP), ...(CTX_DEF[ctx][id] ?? {}) }) : defaultRole(ctx, id)), ...overridesOf(dec, ctx, id) });
      size = autoScale(base.size, BASE_BP, bp, out.gr);
    }
    if (size !== null && size !== out.size) out = enforceRole(id, { ...out, size });
  }
  map.set(key, out);
  return out;
}
export function resolveContextAt(dec: Decisions, ctx: ContextId, w: number): Record<string, RoleProps> {
  return Object.fromEntries(rolesOf(ctx).map((r) => [r.id, resolveAt(dec, ctx, r.id, w)]));
}

/** Bir ekranda ezme: temel ekranda (320) bugünkü ezme; üst kırılımda yalnız o kırılımın katmanı.
 *  Zincir dışı özellikler (renk, mod, liste) her zaman temel katmana yazılır. */
export function applyOverrideAt(dec: Decisions, ctx: ContextId, id: string, patch: RoleOverrides, w: number): Decisions {
  const bp = breakpointAt(w);
  if (bp === BASE_BP) return applyOverride(dec, ctx, id, patch);
  if ((patch.mode ?? resolveAt(dec, ctx, id, w).mode) === 'endpoints') {
    const shared: RoleOverrides = {};
    const rest = { ...patch };
    for (const k of ['mode', 'size', 'max'] as const) if (k in rest) { (shared as Record<string, unknown>)[k] = rest[k]; delete rest[k]; }
    if (Object.keys(shared).length) {
      const next = applyOverride(dec, ctx, id, shared);
      return Object.keys(rest).length ? applyOverrideAt(next, ctx, id, rest, w) : next;
    }
  }
  const basePatch: RoleOverrides = {};
  const screenPatch: RoleOverrides = {};
  for (const k of Object.keys(patch) as PropKey[]) (isScreenKey(k) ? screenPatch : basePatch)[k] = patch[k] as never;
  let next = Object.keys(basePatch).length ? applyOverride(dec, ctx, id, basePatch) : dec;
  if (!Object.keys(screenPatch).length) return next;
  const enforced = enforceRole(id, { ...resolveAt(next, ctx, id, bp), ...screenPatch });
  const layer: RoleOverrides = { ...layerAt(next, ctx, id, bp) };
  for (const k of Object.keys(screenPatch) as PropKey[]) (layer as Record<string, unknown>)[k] = enforced[k];
  next = withLayer(next, ctx, id, bp, layer);
  return next;
}
export function resetPropsAt(dec: Decisions, ctx: ContextId, id: string, keys: PropKey[], w: number): Decisions {
  const bp = breakpointAt(w);
  if (bp === BASE_BP) return resetProps(dec, ctx, id, keys);
  const layer: RoleOverrides = { ...layerAt(dec, ctx, id, bp) };
  keys.forEach((k) => delete layer[k]);
  return withLayer(dec, ctx, id, bp, layer);
}
/** Türün bütün kırılım ezmelerini kaldırır (temel ezmeler kalır). */
export function clearScreens(dec: Decisions, ctx: ContextId, id: string): Decisions {
  const screens = { ...(dec.contexts[ctx].screens ?? {}) };
  delete screens[id];
  return { ...dec, contexts: { ...dec.contexts, [ctx]: { ...dec.contexts[ctx], screens } } };
}
export function withLayer(dec: Decisions, ctx: ContextId, id: string, bp: number, layer: RoleOverrides): Decisions {
  const all = { ...(dec.contexts[ctx].screens ?? {}) };
  const role = { ...(all[id] ?? {}) };
  if (Object.keys(layer).length) role[String(bp)] = layer;
  else delete role[String(bp)];
  if (Object.keys(role).length) all[id] = role;
  else delete all[id];
  return { ...dec, contexts: { ...dec.contexts, [ctx]: { ...dec.contexts[ctx], screens: all } } };
}

/** Değerin bu ekranda nereden geldiği. */
export type ScreenSource =
  | { kind: 'here' }                         // bu ekranda (ya da temel ekranda temel ezmeyle) değiştirildi
  | { kind: 'screen'; from: number }         // bu bağlamın daha küçük bir kırılımından
  | { kind: 'auto'; from: number }           // otomatik ölçek: bu kırılımdan (çapa) hesaplandı
  | { kind: 'html-screen'; from: number }    // HTML katmanının bir kırılımından (ürün türündeki element)
  | { kind: 'base' }                         // temel ekranda (320) değiştirilmiş değerden
  | { kind: 'context' | 'inherited' | 'default' };
export function screenSource(dec: Decisions, ctx: ContextId, id: string, k: PropKey, w: number): ScreenSource {
  const bp = breakpointAt(w);
  if (bp === BASE_BP || !isScreenKey(k)) {
    const s = propSource(dec, ctx, id, k);
    return s === 'overridden' ? { kind: 'here' } : { kind: s };
  }
  if (has(layerAt(dec, ctx, id, bp), k)) return { kind: 'here' };
  // Boyut otomatik ölçekleniyorsa kaynak çapadır.
  if (k === 'size') {
    const r = resolveAt(dec, ctx, id, bp);
    if (r.mode === 'static' && r.gr !== 1) {
      const a = screenAnchor(dec, ctx, id, bp);
      if (a) return { kind: 'auto', from: a.w };
      if (ownBaseSize(dec, ctx, id)) return { kind: 'auto', from: BASE_BP };
    }
  }
  const lower = [...BREAKPOINTS].reverse().find((b) => b > BASE_BP && b < bp && has(layerAt(dec, ctx, id, b), k));
  if (lower) return { kind: 'screen', from: lower };
  if (has(overridesOf(dec, ctx, id), k)) return { kind: 'base' };
  if (inheritsFromBase(ctx, id)) {
    const h = [...BREAKPOINTS].reverse().find((b) => b > BASE_BP && b <= bp && has(layerAt(dec, BASE_CTX, id, b), k));
    if (h) return { kind: 'html-screen', from: h };
    if (k === 'size') {
      const hr = resolveAt(dec, BASE_CTX, id, bp);
      if (hr.mode === 'static' && hr.gr !== 1) return { kind: 'html-screen', from: screenAnchor(dec, BASE_CTX, id, bp)?.w ?? BASE_BP };
    }
  }
  const s = propSource(dec, ctx, id, k);
  return { kind: s === 'overridden' ? 'base' : s };
}

/** Değişiklik sayısı: temel ezmeler + kırılım ezmeleri (gezgin noktası, sıfırla düğmesi, "yalnız değişenler"). */
export function changeCount(dec: Decisions, ctx: ContextId, id: string) {
  return Object.keys(overridesOf(dec, ctx, id)).length
    + Object.values(screensOf(dec, ctx, id)).reduce((n, l) => n + Object.keys(l).length, 0);
}

/** Kırılımda bir öncekine göre değişen çözümlenmiş özellikler (dışa aktarımın duyarlı listesi). */
export function responsiveChanges(dec: Decisions, ctx: ContextId, id: string) {
  const out: { bp: number; changes: Partial<RoleProps> }[] = [];
  let prev = resolveAt(dec, ctx, id, BASE_BP);
  for (const bp of BREAKPOINTS.slice(1)) {
    const cur = resolveAt(dec, ctx, id, bp);
    const changes: Partial<RoleProps> = {};
    for (const k of SCREEN_KEYS) if (!eqProp(k, cur[k], prev[k])) (changes as Record<string, unknown>)[k] = cur[k];
    if (Object.keys(changes).length) out.push({ bp, changes });
    prev = cur;
  }
  return out;
}
