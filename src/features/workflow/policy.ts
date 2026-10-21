import { BG, CONTEXT_IDS, DEFAULT_RATIO, FONT_STACK, RECOMMENDED_LINE_HEIGHTS, ROLE, contrast, enforceRole, grayHex, isLargeText, minSizeFor, normalizeGray, resolveAt, sizeAt, type ContextId, type Decisions, type RoleProps } from '../../core';
import { decisionsForStep, isReviewed, REVIEW_TARGETS, type FlowState } from './model';
/** All dimensions are CSS px, except tracking (em), lineLength (ch) and growth (320→1920 multiplier). */
export interface TypographyPolicy {
    headingRatio: number;
    growth: number;
    lineHeightStrategy: 'preserve' | 'reading' | 'target24';
    tracking: number;
    weightStep: number;
    verticalRhythm: number;
    lineLength: number;
    backgrounds: {
        light: string[];
        dark: string[];
    };
}
export type RulePolicy = TypographyPolicy;
export type PolicyOverrides = Partial<Record<ContextId, Partial<TypographyPolicy>>>;
export type PolicyFlow = FlowState & {
    policies?: PolicyOverrides;
    policy?: PolicyOverrides;
};
export interface DecisionCheck {
    id: string;
    pass: boolean;
    detail: string;
    severity?: 'error' | 'warning' | 'info';
    blocking?: boolean;
}
const object = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const bound = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const median = (ns: number[]) => {
    const sorted = [...ns].sort((a, b) => a - b);
    return (sorted[Math.floor((sorted.length - 1) / 2)] + sorted[Math.floor(sorted.length / 2)]) / 2;
};
const reading = (id: string) => ['reading', 'long'].includes(ROLE[id].kind);
/** Invalid fields are discarded atomically; no string/boolean coercion or unknown keys. */
export function parsePolicy(raw: unknown, minimumRatio = DEFAULT_RATIO): Partial<TypographyPolicy> {
    if (!object(raw))
        return {};
    const out: Partial<TypographyPolicy> = {};
    const ranges = {
        headingRatio: [Math.max(DEFAULT_RATIO, finite(minimumRatio) ? minimumRatio : DEFAULT_RATIO), 3], growth: [1, 1.6], tracking: [-.05, .2], weightStep: [0, 600], verticalRhythm: [0, 48], lineLength: [0, 120]
    } as const;
    for (const key of Object.keys(ranges) as (keyof typeof ranges)[]) {
        const value = raw[key], [min, max] = ranges[key];
        if (finite(value) && value >= min && value <= max && (key !== 'weightStep' || value % 100 === 0) && (key !== 'lineLength' || Number.isInteger(value)))
            out[key] = value;
    }
    if (raw.lineHeightStrategy === 'preserve' || raw.lineHeightStrategy === 'reading' || raw.lineHeightStrategy === 'target24')
        out.lineHeightStrategy = raw.lineHeightStrategy;
    if (object(raw.backgrounds)) {
        const parsed = (value: unknown): string[] | null => {
            if (!Array.isArray(value) || !value.length || value.length > 16)
                return null;
            const colors = value.map(normalizeGray);
            return colors.every((c): c is string => c !== null) ? [...new Set(colors)] : null;
        };
        const light = parsed(raw.backgrounds.light), dark = parsed(raw.backgrounds.dark);
        if (light && dark)
            out.backgrounds = { light, dark };
    }
    return out;
}
export function parsePolicies(raw: unknown): PolicyOverrides {
    if (!object(raw))
        return {};
    return Object.fromEntries(CONTEXT_IDS.flatMap(ctx => {
        const p = parsePolicy(raw[ctx]);
        return Object.keys(p).length ? [[ctx, p]] : [];
    }));
}
/** Fresh arrays prevent a consumer mutating inherited defaults. No module-time model calls. */
export function resolvePolicy(flow: PolicyFlow, d: Decisions, ctx: ContextId): TypographyPolicy {
    const policies = parsePolicies(flow.policies ?? flow.policy);
    const p: TypographyPolicy = {
        headingRatio: DEFAULT_RATIO, growth: 1.25, lineHeightStrategy: 'reading', tracking: 0,
        weightStep: 100, verticalRhythm: 0, lineLength: 75,
        backgrounds: { light: [...new Set(Object.values(BG.light))], dark: [...new Set(Object.values(BG.dark))] },
        ...policies.html, ...(ctx === 'html' ? {} : policies[ctx]),
    };
    p.headingRatio = Math.max(p.headingRatio, finite(d.ratio) ? d.ratio : DEFAULT_RATIO);
    p.backgrounds = { light: [...p.backgrounds.light], dark: [...p.backgrounds.dark] };
    return p;
}
/** Inference is a suggestion, never a saved/adopted policy. Only explicit, currently valid review records vote; their prior draft state is irrelevant. */
const inferenceCache = new WeakMap<FlowState, WeakMap<Decisions, Map<string, Partial<TypographyPolicy> | null>>>();
/** Flow and decisions are immutable state identities. Cache both empty and populated results. */
export function inferPolicy(flow: FlowState, d: Decisions, ctx: ContextId, limit?: {
    width: number;
    family: string;
}): Partial<TypographyPolicy> | null {
    let byDecisions = inferenceCache.get(flow);
    if (!byDecisions)
        inferenceCache.set(flow, (byDecisions = new WeakMap()));
    let byContext = byDecisions.get(d);
    if (!byContext)
        byDecisions.set(d, (byContext = new Map()));
    const key = `${ctx}:${limit?.width ?? 'all'}:${limit?.family ?? 'all'}`;
    if (byContext.has(key))
        return structuredClone(byContext.get(key)!);
    const inferred = inferFromReviews(flow, d, ctx, limit);
    byContext.set(key, inferred);
    return structuredClone(inferred);
}
function inferFromReviews(flow: FlowState, d: Decisions, ctx: ContextId, limit?: {
    width: number;
    family: string;
}): Partial<TypographyPolicy> | null {
    const anchors = Object.keys(flow.reviews).flatMap(key => {
        const target = REVIEW_TARGETS.get(key);
        const ranks: Record<string, number> = {
            mobile: 0, tablet: 1, laptop: 2, desktop: 3, tv: 4
        };
        if (limit && target && (target.step.device.w > limit.width || ranks[target.step.family] > ranks[limit.family]))
            return [];
        if (!target || target.step.ctx !== ctx || !isReviewed(flow, d, target.step, target.role))
            return [];
        const { step, role } = target, effective = decisionsForStep(flow, d, step);
        const value = resolveAt(effective, ctx, role, step.device.w);
        return [{
                step, role, value: { ...value, size: Math.round(sizeAt(value, d.contexts[ctx].settings, role, step.device.w)) }
            }];
    });
    return inferPolicyFromAnchors(anchors, d);
}
export interface PolicyAnchor {
    step: {
        device: {
            w: number;
        };
        family: string;
    };
    role: string;
    value: RoleProps;
}
/** Bounded already-validated anchors allow the engine to retain exact rule dependencies. */
export function inferPolicyFromAnchors(anchors: PolicyAnchor[], d: Decisions): Partial<TypographyPolicy> | null {
    if (!anchors.length)
        return null;
    const ratios: number[] = [], growth: number[] = [], weightSteps: number[] = [];
    // One vote per role/width: TV and monitor shells must not multiply observations.
    const unique = [...new Map(anchors.map(a => [`${a.role}:${a.step.device.w}`, a])).values()];
    for (const a of unique) {
        if (/^h[1-5]$/.test(a.role)) {
            const b = unique.find(b => b.role === `h${Number(a.role.slice(1)) + 1}` && b.step.device.w === a.step.device.w && b.step.family === a.step.family);
            if (b) {
                ratios.push(a.value.size / b.value.size);
                weightSteps.push(Math.abs(a.value.w - b.value.w));
            }
        }
        const b = unique.find(b => b.role === a.role && b.step.device.w > a.step.device.w && b.step.device.w <= 1920 && a.step.device.w < 1920 && b.step.family !== 'tv');
        if (b && a.value.size > 0)
            growth.push((b.value.size / a.value.size) ** (Math.log(6) / Math.log(b.step.device.w / a.step.device.w)));
    }
    const inferred: Partial<TypographyPolicy> = { tracking: median(unique.map(a => a.value.ls)) };
    if (ratios.length) {
        const geometric = Math.exp(ratios.reduce((sum, ratio) => sum + Math.log(ratio), 0) / ratios.length);
        const presets = [1.125, 1.2, 1.25, 1.333, 1.414];
        const nearest = presets.reduce((best, n) => Math.abs(n - geometric) < Math.abs(best - geometric) ? n : best, presets[0]);
        // Nearby canonical ratios prevent integer rounding from amplifying itself across viewports.
        inferred.headingRatio = Math.max(d.ratio, DEFAULT_RATIO, Math.abs(nearest - geometric) <= .025 ? nearest : Math.round(geometric * 1000) / 1000);
    }
    if (growth.length)
        inferred.growth = bound(median(growth), 1, 1.6);
    if (weightSteps.length)
        inferred.weightStep = bound(Math.round(median(weightSteps) / 100) * 100, 0, 600);
    const lengths = unique.filter(a => a.value.mw > 0).map(a => a.value.mw);
    if (lengths.length)
        inferred.lineLength = Math.round(median(lengths));
    const margins = unique.flatMap(a => [a.value.mt * a.value.size, a.value.mb * a.value.size]).filter(n => n > 0);
    if (margins.length && margins.every(n => Math.abs(n - Math.round(n)) < .01)) {
        const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : a;
        const rhythm = margins.map(Math.round).reduce(gcd);
        if (rhythm > 0 && rhythm <= 48)
            inferred.verticalRhythm = rhythm;
    }
    const readers = unique.filter(a => reading(a.role));
    if (readers.length)
        inferred.lineHeightStrategy = readers.every(a => a.value.lh >= 1.5) ? 'reading' : 'preserve';
    return parsePolicy(inferred);
}
/** Deterministic font-aware heuristic: approximate glyph advances plus spacing.
 * This estimates catalog sample words, not arbitrary content or a browser reflow proof. */
export function estimateTextWidth(text: string, v: RoleProps, stress = false): number {
    const transformed = v.tt === 'uppercase' ? text.toLocaleUpperCase('tr') : text;
    const chars = Array.from(transformed);
    const count = chars.length;
    const glyphs = chars.reduce((sum, char) => sum + (v.ff === 'mono' ? .6 : /[MW@%\p{Script=Han}\p{Extended_Pictographic}]/u.test(char) ? 1 : /[ilIİı.,:;!|]/u.test(char) ? .28 : /[mwm]/u.test(char) ? .85 : /[A-ZÇĞÖŞÜ]/u.test(char) ? .6 : .5), 0);
    const spaces = (transformed.match(/\s/gu) ?? []).length;
    return Math.max(0, glyphs * v.size + Math.max(0, count - 1) * v.size * Math.max(v.ls, stress ? .12 : v.ls) + spaces * v.size * Math.max(v.ws, stress ? .16 : v.ws));
}
/** Optional browser-only measurement, isolated from the pure fallback. Caller owns canvas/font readiness. */
export function measureTextBrowser(text: string, v: RoleProps, context: {
    font: string;
    measureText: (text: string) => {
        width: number;
    };
}): number {
    const font = context.font;
    try {
        context.font = `${v.fst} ${v.w} ${v.size}px ${FONT_STACK[v.ff]}`;
        const transformed = v.tt === 'uppercase' ? text.toLocaleUpperCase('tr') : text;
        return context.measureText(transformed).width + Math.max(0, Array.from(transformed).length - 1) * v.size * v.ls + (transformed.match(/\s/gu) ?? []).length * v.size * v.ws;
    }
    finally {
        context.font = font;
    }
}
function maxWordWidth(v: RoleProps, id: string, stress = false): number {
    return Math.max(0, ...ROLE[id].sample.split(/\s+/u).map(word => estimateTextWidth(word, v, stress)));
}
const availableWidth = (v: RoleProps, width: number) => Math.max(0, v.mw > 0 ? Math.min(width - 32, v.mw * v.size * .5) : width - 32);
const STRESS_WORDS = ['erişilebilirlik', 'kişiselleştirilebilirlik', 'uluslararasılaştırılabilirlik'];
const resultCheck = (id: string, pass: boolean, detail: string, blocking = true): DecisionCheck => ({
    id, pass, detail, blocking, severity: blocking ? 'error' : 'warning'
});
export function headingRatioCheck(upper: number, lower: number, policy: TypographyPolicy, levels = 1): DecisionCheck {
    const ratio = upper / lower, need = policy.headingRatio ** levels;
    return resultCheck('heading-ratio', finite(upper) && finite(lower) && lower > 0 && levels >= 1 && Number.isInteger(levels) && ratio + 1e-9 >= need, `Başlık oranı ${ratio.toFixed(3)}; gereken ${need.toFixed(3)}.`);
}
export function accessibilityChecks(v: RoleProps, id: string, width: number, policy: TypographyPolicy): DecisionCheck[] {
    const validWidth = finite(width) && width > 0;
    const need = isLargeText(v.size, v.w) ? 3 : 4.5;
    const checks: DecisionCheck[] = [
        resultCheck('project-minimum', finite(v.size) && Number.isInteger(v.size) && v.size >= minSizeFor(id), `Tam sayı boyut; proje alt sınırı ${minSizeFor(id)} px.`),
        resultCheck('weight-step', finite(v.w) && v.w >= 300 && v.w <= 900 && v.w % 100 === 0, 'Ağırlık 300–900; 100 adım.'),
        resultCheck('viewport-width', validWidth, 'Pozitif, sonlu CSS görünüm genişliği.'),
        resultCheck('max-word-width', validWidth && maxWordWidth(v, id) <= availableWidth(v, width), `Örnek en uzun kelime ${Math.ceil(maxWordWidth(v, id))} px; tahmini kullanılabilir alan ${Math.floor(availableWidth(v, width))} px.`),
        resultCheck('actual-word-stress', maxWordWidth(v, id, true) <= availableWidth(v, width), 'Gerçek örnek, metin aralığı override altında taşabilir; tarayıcı ölçümüyle karşılaştır. Otomatik değerlerde bu genişlik sınırı uygulanır.', false),
        resultCheck('synthetic-word-stress', Math.max(...STRESS_WORDS.map(word => estimateTextWidth(word, v, true))) <= availableWidth(v, width), 'Sentetik uzun Türkçe kelimeler ve %12 harf/%16 kelime aralığı: yalnız risk uyarısı; seçilmiş içerik veya gerçek tarayıcı yeniden akış kanıtı değildir.', false),
        resultCheck('reading-clamp', !reading(id) || v.clamp === 0, 'Okuma metninde satır kırpması içerik kaybı yaratabilir.', false),
        resultCheck('allowed-leading', RECOMMENDED_LINE_HEIGHTS.includes(v.lh), 'İzinli satır yüksekliği seçeneği.'),
        resultCheck('policy-ratio', finite(policy.headingRatio) && policy.headingRatio >= DEFAULT_RATIO, 'Başlıklar arası gerçek oran ana motor tarafından denetlenir.'),
    ];
    if (['button', 'cta', 'tab', 'menuItem', 'nav', 'filterChip', 'suggestion', 'input', 'textarea', 'option'].includes(id))
        checks.push(resultCheck('target-linebox24', v.size * v.lh >= 24, 'Gerçek etkileşim hedefi dolguyla en az 24 × 24 CSS px olmalı (geçerli istisnalar ayrıca değerlendirilir). Tipografi tek başına hedef boyutunu garanti etmez.', false));
    if (id === 'link')
        checks.push(resultCheck('link-underline', v.td === 'underline', 'Gri satır içi bağlantı renk dışında alt çizgiyle ayırt edilir.'));
    for (const theme of ['light', 'dark'] as const) {
        const color = normalizeGray(v.c[theme]);
        const ratios = policy.backgrounds[theme].map(bg => color && normalizeGray(bg) ? contrast(color, bg) : 0);
        const ratio = ratios.length ? Math.min(...ratios) : 0;
        checks.push(resultCheck(`contrast-${theme}`, ratio >= need, `${theme}: ${ratio.toFixed(2)}:1 / gereken ${need}:1; yapılandırılan bütün zeminler.`));
    }
    checks.push(resultCheck('line-length', !reading(id) || policy.lineLength === 0 || (v.mw > 0 && v.mw <= policy.lineLength), `Okuma satırı hedefi ${policy.lineLength} ch; gerçek metin ölçümü ayrıca gerekir.`, false));
    return checks;
}
/** Final prediction guard; heading relationships and policy application belong to the engine. */
export function constrainPrediction(values: RoleProps, id: string, width: number, policy: TypographyPolicy): {
    values: RoleProps;
    checks: DecisionCheck[];
} {
    const weight = finite(values.w) ? values.w : ROLE[id].def.w;
    const v = enforceRole(id, {
        ...values, w: bound(Math.round(weight / 100) * 100, 300, 900), size: Math.round(values.size), mode: 'static', sizes: null
    });
    const minimum = Math.ceil(minSizeFor(id));
    v.size = ROLE[id].kind === 'long' ? 18 : Math.max(minimum, Math.round(v.size));
    // Never break project minima to make a word fit. Report the unresolved conflict instead.
    if (finite(width) && width > 0 && ROLE[id].kind !== 'long')
        while (v.size > minimum && maxWordWidth(v, id, true) > availableWidth(v, width))
            v.size--;
    v.max = v.size;
    const allowed = RECOMMENDED_LINE_HEIGHTS.filter(n => !reading(id) || policy.lineHeightStrategy === 'preserve' || n >= 1.5);
    const desired = policy.lineHeightStrategy === 'target24' ? Math.max(v.lh, 24 / v.size) : v.lh;
    v.lh = policy.lineHeightStrategy === 'target24'
        ? allowed.find(n => n >= desired) ?? allowed[allowed.length - 1]
        : allowed.reduce((best, n) => Math.abs(n - desired) < Math.abs(best - desired) ? n : best, allowed[0]);
    if (id === 'link')
        v.td = 'underline';
    for (const theme of ['light', 'dark'] as const) {
        const need = isLargeText(v.size, v.w) ? 3 : 4.5;
        const backgrounds = policy.backgrounds[theme];
        if (backgrounds.length && backgrounds.every(bg => !!normalizeGray(bg) && contrast(v.c[theme], bg) >= need))
            continue;
        const candidates = Array.from({ length: 256 }, (_, i) => grayHex(i)).filter(c => backgrounds.length > 0 && backgrounds.every(bg => !!normalizeGray(bg) && contrast(c, bg) >= need));
        const original = parseInt(v.c[theme].slice(1, 3), 16);
        if (candidates.length)
            v.c[theme] = candidates.reduce((best, c) => Math.abs(parseInt(c.slice(1, 3), 16) - original) < Math.abs(parseInt(best.slice(1, 3), 16) - original) ? c : best, candidates[0]);
    }
    return { values: v, checks: accessibilityChecks(v, id, width, policy) };
}
