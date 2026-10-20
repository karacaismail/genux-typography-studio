import { BASE_BP, BASE_CTX, BREAKPOINTS, CONTEXT_IDS, CONTEXTS, DECISIONS, DECISION_GROWTH, LONG_READING_CONDITION, SCALE_CAP, decisionAt, TIERS, FONT_STACK, FORMAT, HARD, TIER_IDS, contextLabel, contextName, deviceAtBreakpoint } from './constants';
import { computeChecks, type CheckEnv } from './checks';
import { normalizeGray } from './color';
import { enforceRole, enforceSettings } from './enforce';
import { PROPS, changedProps, defaultDecisions, eqProp, inheritsFromBase, overriddenKeys, parentRole, resolveRole } from './resolve';
import { withLayer, applyOverrideAt, changeCount, isScreenKey, responsiveChanges, screenBreakpoints, screensOf } from './screens';
import { CTX_DEF, ROLE, ROLES, rolesOf } from './roles';
import { endpointSizes, cssSize, cssTiers, isFluid, isTiers, maxOf } from './size';
import type { ContextId, Decisions, PropKey, RoleOverrides } from './types';
import { clampNum, fmt, has, isObj, round } from './util';

export const EXPORT_KEYS: Partial<Record<PropKey, string>> = {
  gr: 'fontSizeGrowth', w: 'fontWeight', lh: 'lineHeight', ls: 'letterSpacingEm', ws: 'wordSpacingEm', ff: 'fontFamily', fst: 'fontStyle',
  tt: 'textTransform', td: 'textDecoration', num: 'numeric', ta: 'textAlign', wrap: 'textWrap',
  mw: 'maxWidthCh', clamp: 'lineClamp', mt: 'spaceBeforeEm', mb: 'spaceAfterEm',
};
export type Scope = 'all' | 'changed';
/** Kırılım katmanlarındaki anahtarlar (renk, mod ve liste kırılıma girmez). */
const SCREEN_EXPORT_KEYS: Partial<Record<PropKey, string>> = { size: 'fontSizePx', max: 'fontSizeMaxPx', em: 'fontSizeEm', ...EXPORT_KEYS };
delete SCREEN_EXPORT_KEYS.gr;
const toScreenExport = (o: Partial<Record<PropKey, unknown>>) =>
  Object.fromEntries((Object.entries(o) as [PropKey, unknown][]).filter(([k]) => SCREEN_EXPORT_KEYS[k]).map(([k, v]) => [SCREEN_EXPORT_KEYS[k], v]));
export type Layer = 'base' | 'inherited' | 'override';

/** Ürün türündeki element: hiçbir ezme ve ürün farkı yoksa temelden devralır. */
export function layerOf(dec: Decisions, ctx: ContextId, id: string): Layer | null {
  if (!ROLE[id].el) return null;
  if (ctx === BASE_CTX) return 'base';
  return overriddenKeys(dec, ctx, id).length || screenBreakpoints(dec, ctx, id).length || has(CTX_DEF[ctx], id) ? 'override' : 'inherited';
}

export function exportRole(dec: Decisions, ctx: ContextId, id: string) {
  const s = dec.contexts[ctx].settings;
  const r = resolveRole(dec, ctx, id);
  const d = ROLE[id];
  const fluid = isFluid(r, s);
  const o: Record<string, unknown> = {
    label: d.label, kind: d.kind, category: d.category, source: d.src,
    changed: changedProps(dec, ctx, id), overrides: overriddenKeys(dec, ctx, id),
    fontSize: {
      mode: r.mode, min: r.size, max: maxOf(r), fluid: r.mode === 'fluid', applied: { fluid, max: fluid ? maxOf(r) : r.size },
      ...(r.mode === 'endpoints' ? { interpolation: 'linear-rounded', fromWidthPx: BASE_BP, toWidthPx: BREAKPOINTS[BREAKPOINTS.length - 1], byDevice: endpointSizes(r, s, id) } : {}),
      perScreen: isTiers(r) ? { ...r.sizes } : null,
      // Etkin olmayan modun değerleri de saklanır (mod değişince kaybolmasın); tüketici `mode` ile hangisinin uygulandığını bilir.
      sizes: r.sizes ? { ...r.sizes } : null,
      em: r.em,
      breakpoints: Object.fromEntries(TIERS.filter((t) => t.min).map((t) => [t.id, t.min])),
      css: isTiers(r) ? cssTiers(r) : cssSize(r, s, id),
    },
    lineHeightPx: round(r.size * r.lh, 2),
  };
  for (const [k, n] of Object.entries(EXPORT_KEYS) as [PropKey, string][]) o[n] = (k === 'mw' || k === 'clamp') && !r[k] ? null : r[k];
  o.color = { light: r.c.light, dark: r.c.dark };
  o.decision = has(DECISIONS, id) ? { basePx: DECISIONS[id], growth: DECISION_GROWTH[id] ?? 1, byScreen: Object.fromEntries(BREAKPOINTS.map((bp) => [bp, decisionAt(id, bp)])) } : null;
  const layer = layerOf(dec, ctx, id);
  if (layer) { o.element = true; o.inherit = layer === 'inherited'; o.layer = layer; }
  // Kırılım zinciri (min-width, küçükten büyüğe). Yukarıdaki değerler temel ekrandır (320 px).
  const own = screensOf(dec, ctx, id);
  if (Object.keys(own).length) o.screenOverrides = Object.fromEntries(Object.entries(own).map(([bp, l]) => [bp, toScreenExport(l)]));
  const resp = responsiveChanges(dec, ctx, id);
  if (resp.length) {
    o.responsive = resp.map(({ bp, changes }) => ({
      minWidthPx: bp, device: deviceAtBreakpoint(bp).name, media: `@media (min-width: ${bp}px)`, changes: toScreenExport(changes),
    }));
  }
  return o;
}

export function buildExport(dec: Decisions, scope: Scope, opts: { ui?: Record<string, unknown>; env?: CheckEnv; now?: Date } = {}) {
  const contexts: Record<string, unknown> = {};
  for (const ctx of CONTEXT_IDS) {
    const s = dec.contexts[ctx].settings;
    const roles: Record<string, unknown> = {};
    for (const d of rolesOf(ctx)) {
      // Yalnız değişenler: kullanıcının ezdiği türler. Devralanlar temelden, diğerleri varsayılandan gelir.
      if (scope === 'changed' && !changeCount(dec, ctx, d.id)) continue;
      roles[d.id] = exportRole(dec, ctx, d.id);
    }
    contexts[ctx] = {
      label: contextName(ctx),
      shortLabel: contextLabel(ctx),
      fluid: {
        set: s.set, basis: s.basis, minWidthPx: s.minW, maxWidthPx: s.maxW,
        formula: 'clamp(min, kesişim(rem) + eğim×100(vw|cqi), max); eğim = (max − min) / (maxGenişlik − minGenişlik)',
        unitNote: 'rem değerleri 16 px tarayıcı kök boyutuna göre; kullanıcı kök boyutunu değiştirirse metin orantılı ölçeklenir.',
        containerNote: s.basis === 'container' ? 'cqi için akışkan metnin bir atasında container-type: inline-size gerekir.' : null,
      },
      roles,
      checks: computeChecks(dec, ctx, opts.env).map(({ status, title, detail }) => ({ status, title, detail })),
    };
  }
  return {
    format: FORMAT, version: 2, exportedAt: (opts.now ?? new Date()).toISOString(), scope,
    screens: {
      basePx: BASE_BP, breakpointsPx: BREAKPOINTS, groupStartsPx: { mobile: BASE_BP, tablet: 600, laptop: 960, desktop: 1920 },
      note: 'Her tür önce temel ekran (320 px) değerlerini alır; screenOverrides/responsive min-width kırılımlarıdır ve küçükten büyüğe kalıtılır. Renk kırılıma girmez (açık ve koyu ayrı).',
    },
    fonts: { sans: FONT_STACK.sans, mono: FONT_STACK.mono, system: FONT_STACK.system },
    hardRules: {
      minReadablePx: HARD.minReadable, defaultPx: HARD.standard, exceptionDefaultPx: HARD.exception, tagPillPx: HARD.tagPill,
      minReadingPx: HARD.minReading, longReadingPx: HARD.longReading,
      minReadableNote: 'GenUX kuralı (2026-10-19): okuma metni 16 (en az 16); istisna varsayılanı 14; etiket ve pill 12; 12 en alt sınır; uzun okuma (makale, blog, politika) 18. Aracın kendi arayüz metni en az 14 px.',
      readingRoles: ROLES.filter((r) => r.kind === 'reading').map((r) => r.id), longRoles: ['long'], longReadingCondition: LONG_READING_CONDITION,
      tagPillRoles: ROLES.filter((r) => r.kind === 'tag').map((r) => r.id),
      screenGroups: TIERS.map((t) => ({ id: t.id, label: t.label, fromPx: t.min || BASE_BP })),
      colorPolicy: 'Çıktı metin renkleri yalnız siyah, beyaz ve gri (R = G = B).',
      headingRatioMin: dec.ratio, maxToBodyRatio: 4,
    },
    decisions: {
      basePx: BASE_BP, base: DECISIONS, growth: DECISION_GROWTH,
      formula: `boyut(w) = çapa × (min(w, ${SCALE_CAP}) / çapa genişliği) ^ (ln(büyüme) / ln(${SCALE_CAP} / ${BASE_BP})), 0,1 px'e yuvarlanır; çapa en yakın alt kırılımdaki kullanıcı değeri ya da ${BASE_BP} px değeridir`,
      byScreen: Object.fromEntries(BREAKPOINTS.map((bp) => [bp, Object.fromEntries(Object.keys(DECISIONS).map((id) => [id, decisionAt(id, bp)]))])),
    },
    contexts,
    ...(opts.ui ? { ui: opts.ui } : {}),
  };
}

export interface ImportReport { adjusted: string[]; rejected: string[]; recognised: number; notes: string[] }

function setOverrides(dec: Decisions, ctx: ContextId, id: string, o: RoleOverrides): Decisions {
  const overrides = { ...dec.contexts[ctx].overrides };
  if (Object.keys(o).length) overrides[id] = o; else delete overrides[id];
  return { ...dec, contexts: { ...dec.contexts, [ctx]: { ...dec.contexts[ctx], overrides } } };
}

function importRole(dec: Decisions, ctx: ContextId, id: string, x: Record<string, unknown>, report: ImportReport): Decisions {
  const label = `${contextLabel(ctx)} ${ROLE[id].label}`;
  report.recognised += 1;
  const listed = Array.isArray(x.overrides) ? (x.overrides as unknown[]).filter((k): k is PropKey => PROPS.includes(k as PropKey)) : null;
  // Eski dosya: devralan element yalnız temeli taşır.
  if (!listed && inheritsFromBase(ctx, id) && x.inherit === true) return setOverrides(dec, ctx, id, {});
  const parent = parentRole(dec, ctx, id);
  const cand: Record<string, unknown> = { ...parent, c: { ...parent.c } };
  let perScreen = false;
  if (isObj(x.fontSize)) {
    const f = x.fontSize;
    if (has(f, 'min')) cand.size = f.min;
    if (has(f, 'max')) cand.max = f.max;
    cand.mode = typeof f.mode === 'string' ? f.mode : f.fluid === true ? 'fluid' : 'static';
    if (has(f, 'em')) cand.em = f.em;
    const ps = isObj(f.sizes) ? f.sizes : isObj(f.perScreen) ? f.perScreen : null;
    if (ps) { cand.sizes = Object.fromEntries(TIER_IDS.map((t) => [t, ps[t]])); perScreen = true; }
  }
  for (const [k, n] of Object.entries(EXPORT_KEYS) as [PropKey, string][]) if (has(x, n)) cand[k] = x[n] === null ? 0 : x[n];
  if (isObj(x.color)) {
    const col = x.color;
    (['light', 'dark'] as const).forEach((t) => {
      if (col[t] === undefined) return;
      if (normalizeGray(col[t])) (cand.c as Record<string, unknown>)[t] = col[t];
      else report.rejected.push(`${label} (${t === 'dark' ? 'koyu' : 'açık'}): ${String(col[t])}`);
    });
  }
  const asked = { size: Number(cand.size), mode: cand.mode };
  const r = enforceRole(id, cand);
  if (Number.isFinite(asked.size) && asked.size !== r.size) report.adjusted.push(`${label} ${fmt(asked.size)}→${fmt(r.size)} px`);
  if (asked.mode === 'fluid' && r.mode !== 'fluid') report.adjusted.push(`${label} akışkan→statik`);
  const keys = listed ?? PROPS.filter((k) => (k === 'sizes' ? perScreen && !eqProp(k, r.sizes, parent.sizes) : !eqProp(k, r[k], parent[k])));
  const o: RoleOverrides = {};
  for (const k of keys) (o as Record<string, unknown>)[k] = r[k];
  dec = setOverrides(dec, ctx, id, o);
  // Kırılım ezmeleri küçükten büyüğe uygulanır; her biri kesin kurallardan geçer.
  if (isObj(x.screenOverrides)) {
    const back = Object.fromEntries(Object.entries(SCREEN_EXPORT_KEYS).map(([k, n]) => [n, k as PropKey]));
    const so = x.screenOverrides;
    for (const bp of BREAKPOINTS.filter((b) => b > BASE_BP && isObj(so[String(b)]))) {
      const patch: RoleOverrides = {};
      for (const [n, v] of Object.entries(so[String(bp)] as Record<string, unknown>)) {
        const k = back[n];
        if (k && isScreenKey(k)) (patch as Record<string, unknown>)[k] = v === null ? 0 : v;
      }
      if (Object.keys(patch).length) {
        if (r.mode === 'endpoints') {
          const checked = enforceRole(id, { ...r, ...patch });
          const layer = Object.fromEntries(Object.keys(patch).map((k) => [k, checked[k as PropKey]]));
          dec = withLayer(dec, ctx, id, bp, layer);
        } else dec = applyOverrideAt(dec, ctx, id, patch, bp);
      }
    }
  }
  return dec;
}

function importContext(dec: Decisions, ctx: ContextId, src: Record<string, unknown>, report: ImportReport): Decisions {
  if (isObj(src.fluid)) {
    const f = src.fluid;
    dec = { ...dec, contexts: { ...dec.contexts, [ctx]: { ...dec.contexts[ctx], settings: enforceSettings(ctx, { set: f.set, basis: f.basis, minW: f.minWidthPx, maxW: f.maxWidthPx }) } } };
  }
  const roles = isObj(src.roles) ? src.roles : {};
  for (const d of rolesOf(ctx)) {
    const x = roles[d.id];
    if (isObj(x)) dec = importRole(dec, ctx, d.id, x, report);
  }
  return dec;
}

/** JSON kararlarını okur. Kesin kurallar uygulanır; düzeltmeler ve redler raporlanır.
 *  `current` yalnız sürüm 1 dosyasında diğer bağlamları korumak için kullanılır. */
export function importData(data: unknown, current: Decisions, activeCtx: ContextId) {
  if (!isObj(data)) throw new Error('JSON nesnesi bekleniyordu.');
  if (data.format !== undefined && data.format !== FORMAT) throw new Error(`Bilinmeyen biçim: ${String(data.format)}.`);
  const report: ImportReport = { adjusted: [], rejected: [], recognised: 0, notes: [] };
  let dec = defaultDecisions();
  if (isObj(data.contexts)) {
    const cs = data.contexts;
    // Temel katman önce: ürün türlerindeki elementler onun üzerine çözülür.
    for (const ctx of CONTEXT_IDS) if (isObj(cs[ctx])) dec = importContext(dec, ctx, cs[ctx] as Record<string, unknown>, report);
  } else if (isObj(data.roles)) {
    dec = { ...dec, ratio: current.ratio, contexts: { ...current.contexts, [activeCtx]: dec.contexts[activeCtx] } };
    dec = importContext(dec, activeCtx, { fluid: data.fluid, roles: data.roles }, report);
    report.notes.push(`Sürüm 1 dosyası ${contextLabel(activeCtx)} bağlamına yüklendi.`);
  } else {
    throw new Error('Dosyada "contexts" ya da "roles" nesnesi yok.');
  }
  if (!report.recognised && data.scope !== 'changed') throw new Error('Tanınan tür bulunamadı.');
  if (data.scope === 'changed') report.notes.push('Dosya yalnız değişenleri taşıyor; dosyada olmayan türler varsayılana döndü.');
  if (isObj(data.hardRules) && Number(data.hardRules.headingRatioMin)) dec = { ...dec, ratio: clampNum(round(Number(data.hardRules.headingRatioMin), 3), 1, 2) };
  const ui = isObj(data.ui) ? data.ui : null;
  return { decisions: dec, ui, report };
}

export const KNOWN_CONTEXTS = CONTEXTS.map((c) => c.id);
