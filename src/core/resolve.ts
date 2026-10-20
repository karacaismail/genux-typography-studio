import { BASE_CTX, CONTEXT_IDS, DEFAULT_RATIO, DEFAULT_SETTINGS, TIER_IDS } from './constants';
import { enforceRole } from './enforce';
import { CTX_DEF, ROLE, isEl, rolesOf } from './roles';
import type { ContextId, Decisions, Inheritance, PropKey, RoleOverrides, RoleProps } from './types';
import { has } from './util';

export const PROPS: PropKey[] = ['size', 'mode', 'sizes', 'em', 'gr', 'max', 'w', 'lh', 'ls', 'ws', 'ff', 'fst', 'tt', 'td', 'num', 'ta', 'wrap', 'mw', 'clamp', 'mt', 'mb', 'c'];

export const eqProp = (k: PropKey, a: RoleProps[PropKey], b: RoleProps[PropKey]) =>
  k === 'c' || k === 'sizes' ? JSON.stringify(a) === JSON.stringify(b) : a === b;

export function defaultDecisions(): Decisions {
  return {
    ratio: DEFAULT_RATIO,
    contexts: Object.fromEntries(CONTEXT_IDS.map((c) => [c, { settings: DEFAULT_SETTINGS(c), overrides: {} }])) as Decisions['contexts'],
  };
}

/** Katalog varsayılanı + ürün türü farkı (kullanıcı ezmesi ve devralma yok). "Değişti" ölçütü budur. */
export function defaultRole(ctx: ContextId, id: string): RoleProps {
  return enforceRole(id, { ...ROLE[id].def, ...(CTX_DEF[ctx][id] ?? {}) });
}
/** Element ürün türünde temel katmandan devralır. */
export const inheritsFromBase = (ctx: ContextId, id: string) => ctx !== BASE_CTX && isEl(id);

const cache = new WeakMap<Decisions, Partial<Record<ContextId, Record<string, RoleProps>>>>();
const parentCache = new WeakMap<Decisions, Partial<Record<ContextId, Record<string, RoleProps>>>>();

/** Ezmeden önceki değer: temel katman (element ise) ⊕ ürün türü farkı. */
export function parentRole(dec: Decisions, ctx: ContextId, id: string): RoleProps {
  let byCtx = parentCache.get(dec);
  if (!byCtx) parentCache.set(dec, (byCtx = {}));
  const map = (byCtx[ctx] ??= {});
  if (!map[id]) {
    map[id] = inheritsFromBase(ctx, id)
      ? enforceRole(id, { ...resolveRole(dec, BASE_CTX, id), ...(CTX_DEF[ctx][id] ?? {}) })
      : defaultRole(ctx, id);
  }
  return map[id];
}
/** Çözümlenmiş değer: üst katman ⊕ kullanıcı ezmeleri, kesin kurallardan geçmiş. */
export function resolveRole(dec: Decisions, ctx: ContextId, id: string): RoleProps {
  let byCtx = cache.get(dec);
  if (!byCtx) cache.set(dec, (byCtx = {}));
  const map = (byCtx[ctx] ??= {});
  if (!map[id]) {
    const o = dec.contexts[ctx].overrides[id];
    map[id] = o && Object.keys(o).length ? enforceRole(id, { ...parentRole(dec, ctx, id), ...o }) : parentRole(dec, ctx, id);
  }
  return map[id];
}
export function resolveContext(dec: Decisions, ctx: ContextId): Record<string, RoleProps> {
  return Object.fromEntries(rolesOf(ctx).map((r) => [r.id, resolveRole(dec, ctx, r.id)]));
}

export const overridesOf = (dec: Decisions, ctx: ContextId, id: string): RoleOverrides => dec.contexts[ctx].overrides[id] ?? {};
export const overriddenKeys = (dec: Decisions, ctx: ContextId, id: string) => Object.keys(overridesOf(dec, ctx, id)) as PropKey[];

/** Ezme yokken değerin geleceği katman: ürün türü farkı > temelden devralma > katalog varsayılanı. */
export function baseSource(ctx: ContextId, id: string, k: PropKey): Exclude<Inheritance, 'overridden'> {
  if (has(CTX_DEF[ctx][id] ?? {}, k)) return 'context';
  if (inheritsFromBase(ctx, id)) return 'inherited';
  return 'default';
}
/** Değerin kaynağı: kullanıcı ezmesi önce gelir. */
export function propSource(dec: Decisions, ctx: ContextId, id: string, k: PropKey): Inheritance {
  return has(overridesOf(dec, ctx, id), k) ? 'overridden' : baseSource(ctx, id, k);
}

/** Katalog ve ürün varsayılanına göre değişen özellikler (dışa aktarımın "changed" listesi). */
export function changedProps(dec: Decisions, ctx: ContextId, id: string): PropKey[] {
  const r = resolveRole(dec, ctx, id);
  const d = defaultRole(ctx, id);
  return PROPS.filter((k) => (k === 'sizes'
    ? r.mode === 'tiers' && !!r.sizes && TIER_IDS.some((t) => r.sizes![t] !== (d.sizes?.[t] ?? d.size))
    : !eqProp(k, r[k], d[k])));
}

/** Ezme uygular. Saklanan değer kesin kurallardan geçmiş değerdir. Yeni Decisions döner. */
export function applyOverride(dec: Decisions, ctx: ContextId, id: string, patch: RoleOverrides): Decisions {
  const cur = overridesOf(dec, ctx, id);
  const next = enforceRole(id, { ...parentRole(dec, ctx, id), ...cur, ...patch });
  const o: RoleOverrides = { ...cur };
  for (const k of Object.keys(patch) as PropKey[]) (o as Record<string, unknown>)[k] = next[k];
  return withOverrides(dec, ctx, id, o);
}
export function resetProps(dec: Decisions, ctx: ContextId, id: string, keys: PropKey[]): Decisions {
  const o: RoleOverrides = { ...overridesOf(dec, ctx, id) };
  keys.forEach((k) => delete o[k]);
  return withOverrides(dec, ctx, id, o);
}
/** Türün bütün değişiklikleri: temel ezmeler ve kırılım ezmeleri. */
export function resetRole(dec: Decisions, ctx: ContextId, id: string): Decisions {
  const next = withOverrides(dec, ctx, id, {});
  const screens = { ...(next.contexts[ctx].screens ?? {}) };
  delete screens[id];
  return { ...next, contexts: { ...next.contexts, [ctx]: { ...next.contexts[ctx], screens } } };
}
export function resetContext(dec: Decisions, ctx: ContextId): Decisions {
  return { ...dec, contexts: { ...dec.contexts, [ctx]: { settings: DEFAULT_SETTINGS(ctx), overrides: {} } } };
}
function withOverrides(dec: Decisions, ctx: ContextId, id: string, o: RoleOverrides): Decisions {
  const overrides = { ...dec.contexts[ctx].overrides };
  if (Object.keys(o).length) overrides[id] = o;
  else delete overrides[id];
  return { ...dec, contexts: { ...dec.contexts, [ctx]: { ...dec.contexts[ctx], overrides } } };
}

/** Üst katmandaki değere eşit temel ezmeleri kaldırır (varsayılan olmuş değerler "değişti" görünmesin).
 *  Kayıtlı çalışma alanı yüklenirken uygulanır. */
export function pruneRedundant(dec: Decisions): Decisions {
  let out = dec;
  for (const ctx of CONTEXT_IDS) {
    for (const [id, o] of Object.entries(out.contexts[ctx].overrides)) {
      const parent = parentRole(out, ctx, id);
      const keep = Object.fromEntries(Object.entries(o).filter(([k, v]) => !eqProp(k as PropKey, v as RoleProps[PropKey], parent[k as PropKey])));
      if (Object.keys(keep).length !== Object.keys(o).length) out = withOverrides(out, ctx, id, keep as RoleOverrides);
    }
  }
  return out;
}
