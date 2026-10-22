import { MONITOR_MODELS, TV_MODELS } from '../../core/hardware';
import { accessibilityChecks, headingRatioCheck, parsePolicies, resolvePolicy, type PolicyOverrides } from './policy';
import { ENGINE_VERSION, dependencyToken, matchesDependency, parseEngine, type EngineState } from './engineState';
import { CATEGORIES, DEFAULT_RATIO, CONTEXTS, DEVICES, contrastInfo, resolveAt, rolesOf, applyOverrideAt, enforceRole, PROPS, sizeAt, type ContextId, type Decisions, type Device, type RoleOverrides } from '../../core';
export const FLOW_KEY = 'genux-typography-workflow-v1';
export const FAMILY_LABEL = {
    mobile: 'Mobil', tablet: 'Tablet', laptop: 'Laptop', desktop: 'Bilgisayar', tv: 'Televizyon'
} as const;
export type Family = keyof typeof FAMILY_LABEL;
export interface FlowStep {
    key: string;
    ctx: ContextId;
    family: Family;
    device: Device;
    group: string;
    label: string;
    roles: string[];
}
export interface Review {
    reason?: string;
    appliedFontSizePx: number;
    at: string;
    fingerprint: string;
    values: ReturnType<typeof resolveAt>;
}
export interface FlowState {
    version: 1;
    cursor: string;
    role: string;
    reviews: Record<string, Review>;
    profiles?: Record<string, RoleOverrides>;
    policies?: PolicyOverrides;
    engine?: EngineState;
    editorBaseline?: Record<string, ReturnType<typeof resolveAt>>;
}
export const emptyFlow = (): FlowState => ({
    version: 1, cursor: '', role: 'h1', reviews: {}
});
export const familyOf = (d: Device): Family => d.group;
const subtitle = new Set(['hgroupSub', 'lead', 'overline']);
/** context → family → ascending viewport → group; each role occurs once per viewport. */
export const WORKFLOW_DEVICES: {
    device: Device;
    family: Family;
}[] = [
    ...DEVICES.filter((d) => d.w < 2560).map((device) => ({ device, family: familyOf(device) })),
    ...MONITOR_MODELS.filter(model=>model.id.startsWith('monitor')).map(model=>({family:'desktop' as const,device:{id:model.id,name:model.name,group:'desktop' as const,w:model.width,h:model.height}})),
    ...TV_MODELS.map(model=>({family:'tv' as const,device:{id:model.id,name:model.name,group:'desktop' as const,w:model.width,h:model.height}})),
];
export function makeSteps(): FlowStep[] {
    return CONTEXTS.flatMap(({ id: ctx }) => WORKFLOW_DEVICES.flatMap(({ device, family }) => {
        const roles = rolesOf(ctx);
        const groups = [
            {
                id: 'headings', label: 'Headings', items: roles.filter((r) => r.category === 'headings' && !subtitle.has(r.id))
            },
            {
                id: 'subtitle', label: 'Sub-title', items: roles.filter((r) => subtitle.has(r.id))
            },
            ...CATEGORIES.filter((c) => c.id !== 'headings').map((c) => ({
                id: c.id, label: c.label, items: roles.filter((r) => r.category === c.id && !subtitle.has(r.id))
            })),
        ];
        return groups.filter((g) => g.items.length).map((g) => ({
            key: `${ctx}:${family}:${device.w}:${g.id}`, ctx, family, device, group: g.id, label: g.label, roles: g.items.map((r) => r.id)
        }));
    }));
}
export const FLOW_STEPS = makeSteps();
export const reviewKey = (s: FlowStep, role: string) => `${s.ctx}:${s.family}:${s.device.w}:${role}`;
export const REVIEW_TARGETS = new Map(FLOW_STEPS.flatMap(s => s.roles.map(role => [reviewKey(s, role), { step: s, role }] as const)));
const profileCache = new WeakMap<FlowState, WeakMap<Decisions, Map<string, Decisions>>>();
export function decisionsForStep(f: FlowState, d: Decisions, s: FlowStep): Decisions {
    let byDecisions = profileCache.get(f);
    if (!byDecisions)
        profileCache.set(f, (byDecisions = new WeakMap()));
    let cache = byDecisions.get(d);
    if (!cache)
        byDecisions.set(d, (cache = new Map()));
    const key = `${s.ctx}:${s.family}:${s.device.w}`;
    const cached = cache.get(key);
    if (cached)
        return cached;
    let out = d;
    if (s.ctx !== 'html')
        out = decisionsForStep(f, d, { ...s, ctx: 'html' });
    for (const role of rolesOf(s.ctx)) {
        const patch = f.profiles?.[reviewKey(s, role.id)];
        if (patch) {
            const checked = enforceRole(role.id, { ...resolveAt(out, s.ctx, role.id, s.device.w), ...patch });
            const clean = Object.fromEntries(Object.keys(patch).filter((k) => PROPS.includes(k as keyof RoleOverrides)).map((k) => [k, checked[k as keyof RoleOverrides]]));
            out = applyOverrideAt(out, s.ctx, role.id, clean, s.device.w);
        }
    }
    cache.set(key, out);
    return out;
}
export function fingerprint(d: Decisions, s: FlowStep, role: string, f?: FlowState, legacyKeys = false) {
    const entry = f?.engine?.entries[reviewKey(s, role)];
    return JSON.stringify({
        ...(legacyKeys ? {} : { ratio: d.ratio }), ...(f?.policies && Object.keys(f.policies).length ? { policy: resolvePolicy(f, d, s.ctx) } : {}), ...((entry?.state === 'automatic' || entry?.state === 'auto') && entry.sources.length ? { sources: entry.sources.map(({ key, fingerprint }) => ({ key: legacyKeys ? key : dependencyToken(key), fingerprint: dependencyToken(fingerprint) })) } : {}), values: resolveAt(d, s.ctx, role, s.device.w), settings: d.contexts[s.ctx].settings
    });
}
const reviewCache = new WeakMap<FlowState, WeakMap<Decisions, Map<string, boolean>>>();
export function isReviewed(f: FlowState, d: Decisions, s: FlowStep, role: string, visiting = new Set<string>()): boolean {
    const key = reviewKey(s, role);
    let byDecision = reviewCache.get(f);
    if (!byDecision)
        reviewCache.set(f, (byDecision = new WeakMap()));
    let cache = byDecision.get(d);
    if (!cache)
        byDecision.set(d, (cache = new Map()));
    const cached = cache.get(key);
    if (cached !== undefined)
        return cached;
    if (visiting.size >= 256 || visiting.has(key))
        return false;
    const stored = f.reviews[key]?.fingerprint;
    if (stored !== fingerprint(decisionsForStep(f, d, s), s, role, f) && (d.ratio !== DEFAULT_RATIO || stored !== fingerprint(decisionsForStep(f, d, s), s, role, f, true)))
        return false;
    const resolved = resolveAt(decisionsForStep(f, d, s), s.ctx, role, s.device.w);
    const px = Math.round(sizeAt(resolved, d.contexts[s.ctx].settings, role, s.device.w));
    if (!(['light', 'dark'] as const).every(theme => contrastInfo({
        ...resolved, size: px, max: px, mode: 'static', sizes: null
    }, role, theme).pass)) {
        cache.set(key, false);
        return false;
    }
    if (!approvalAllowed(f, d, s, role, f.reviews[key]?.reason, false)) {
        cache.set(key, false);
        return false;
    }
    const entry = f.engine?.entries[key];
    if (entry?.state === 'stale' || entry?.state === 'conflict') {
        cache.set(key, false);
        return false;
    }
    if (!entry || (entry.state !== 'automatic' && entry.state !== 'auto')) {
        cache.set(key, true);
        return true;
    }
    const next = new Set(visiting).add(key);
    const valid = entry.sources.every(source => {
        const target = REVIEW_TARGETS.get(source.key);
        return !!target && matchesDependency(f.reviews[source.key]?.fingerprint, source.fingerprint) && isReviewed(f, d, target.step, target.role, next);
    });
    cache.set(key, valid);
    return valid;
}
export type DecisionStatus = 'approved' | 'manual' | 'auto' | 'stale' | 'draft';
/** Human approval and accepted motor decisions are distinct; legacy automatic is a draft. */
export function decisionStatus(f: FlowState, d: Decisions, s: FlowStep, id: string): DecisionStatus {
    const key = reviewKey(s, id);
    if (isReviewed(f, d, s, id))
        return 'approved';
    const entry = f.engine?.entries[key];
    if (entry?.state === 'manual')
        return 'manual';
    if (f.reviews[key])
        return 'stale';
    if (entry?.state === 'stale' || entry?.state === 'conflict')
        return 'stale';
    if (entry?.state === 'auto') {
        if (entry.ruleVersion !== ENGINE_VERSION || !entry.sources.length || entry.issues?.length || !approvalAllowed(f, d, s, id))
            return 'stale';
        const valid = entry.sources.every(source => {
            const target = REVIEW_TARGETS.get(source.key);
            return !!target && matchesDependency(f.reviews[source.key]?.fingerprint, source.fingerprint) && isReviewed(f, d, target.step, target.role);
        });
        return valid ? 'auto' : 'stale';
    }
    if (!entry && f.profiles?.[key])
        return 'manual';
    return 'draft';
}
export const stepSettled = (f: FlowState, d: Decisions, s: FlowStep) => s.roles.every(id => ['approved', 'auto'].includes(decisionStatus(f, d, s, id)));
export const stepDone = (f: FlowState, d: Decisions, s: FlowStep) => s.roles.every((id) => isReviewed(f, d, s, id));
export interface ApprovalOptions {
    reason?: string;
}
/** Nonwaivable diagnostics plus explicit human exceptions; no dependency on engine.ts. */
function approvalAllowed(f: FlowState, d: Decisions, s: FlowStep, id: string, reason?: string, relationships = true): boolean {
    const effective = decisionsForStep(f, d, s), raw = resolveAt(effective, s.ctx, id, s.device.w);
    const values = { ...raw, size: Math.round(sizeAt(raw, d.contexts[s.ctx].settings, id, s.device.w)) };
    // Custom policy backgrounds supplement the application specimen contrast gate.
    if (!(['light', 'dark'] as const).every(theme => contrastInfo({
        ...values, max: values.size, mode: 'static', sizes: null
    }, id, theme).pass))
        return false;
    const policy = resolvePolicy(f, d, s.ctx);
    const checks = accessibilityChecks(values, id, s.device.w, policy);
    if (relationships && /^h[1-6]$/.test(id)) {
        const level = Number(id.slice(1));
        for (const other of s.roles.filter(role => /^h[1-6]$/.test(role) && role !== id)) {
            const key = reviewKey(s, other), review = f.reviews[key];
            // Only existing explicit decisions constrain a human; catalog defaults are not approvals.
            const state = f.engine?.entries[key]?.state;
            if (state === 'automatic' || state === 'undone' || state === 'stale' || state === 'conflict' || (!f.profiles?.[key] && !review))
                continue;
            const otherRaw = resolveAt(effective, s.ctx, other, s.device.w);
            const px = Math.round(sizeAt(otherRaw, d.contexts[s.ctx].settings, other, s.device.w));
            const otherLevel = Number(other.slice(1));
            checks.push(headingRatioCheck(level < otherLevel ? values.size : px, level < otherLevel ? px : values.size, policy, Math.abs(level - otherLevel)));
        }
    }
    const explained = typeof reason === 'string' && reason.trim().length >= 8 && reason.trim().length <= 1000;
    return checks.every(check => check.pass || check.blocking === false || (explained && ['heading-ratio', 'link-underline'].includes(check.id)));
}
export function canApproveDecision(f: FlowState, d: Decisions, s: FlowStep, id: string, options: ApprovalOptions = {}): boolean {
    return s.roles.includes(id) && approvalAllowed(f, d, s, id, options.reason);
}
export function approve(f: FlowState, d: Decisions, s: FlowStep, role: string, nowOrOptions: Date | ApprovalOptions = new Date(), options: ApprovalOptions = {}): FlowState {
    const now = nowOrOptions instanceof Date ? nowOrOptions : new Date();
    const reason = (nowOrOptions instanceof Date ? options : nowOrOptions).reason?.trim();
    if (!canApproveDecision(f, d, s, role, { reason }))
        return f;
    const resolved = resolveAt(decisionsForStep(f, d, s), s.ctx, role, s.device.w);
    const applied = Math.round(sizeAt(resolved, d.contexts[s.ctx].settings, role, s.device.w));
    if (!(['light', 'dark'] as const).every(theme => contrastInfo({
        ...resolved, size: applied, max: applied, mode: 'static', sizes: null
    }, role, theme).pass))
        return f;
    const key = reviewKey(s, role), entry = f.engine?.entries[key];
    const brokenSources = (entry?.state === 'automatic' || entry?.state === 'auto') && entry.sources.some(source => {
        const target = REVIEW_TARGETS.get(source.key);
        return !target || !matchesDependency(f.reviews[source.key]?.fingerprint, source.fingerprint) || !isReviewed(f, d, target.step, target.role);
    });
    const accepted = brokenSources || entry?.state === 'conflict' || entry?.state === 'stale' ? { ...f, engine: { version: 1 as const, entries: { ...f.engine?.entries, [key]: {
                    ...entry, state: 'manual' as const, sources: [], issues: [], trace: [...entry.trace, { rule: 'explicit-reapproval', reason: 'Kaynak değişti; mevcut değerler kullanıcı tarafından yeniden onaylandı.' }]
                } } } } : f;
    return { ...accepted, reviews: { ...f.reviews, [reviewKey(s, role)]: {
                ...(reason ? { reason } : {}), appliedFontSizePx: Math.round(sizeAt(resolveAt(decisionsForStep(f, d, s), s.ctx, role, s.device.w), d.contexts[s.ctx].settings, role, s.device.w)), at: now.toISOString(), fingerprint: fingerprint(decisionsForStep(f, d, s), s, role, accepted), values: structuredClone(resolveAt(decisionsForStep(f, d, s), s.ctx, role, s.device.w))
            } } };
}
export function parseFlow(raw: unknown): FlowState {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw))
        throw new Error('Akış kaydı nesne olmalı.');
    const x = raw as Partial<FlowState>;
    if (x.version !== 1 || !x.reviews || typeof x.reviews !== 'object' || Array.isArray(x.reviews))
        throw new Error('Akış biçimi tanınmadı.');
    const allowed = new Set(FLOW_STEPS.flatMap((s) => s.roles.map((id) => reviewKey(s, id))));
    const reviews: FlowState['reviews'] = {};
    for (const [k, v] of Object.entries(x.reviews)) {
        if (allowed.has(k) && v && typeof v.fingerprint === 'string' && v.fingerprint.length <= 16384 && typeof v.at === 'string' && v.at.length <= 64 && Number.isFinite(Date.parse(v.at)) && Number.isFinite(v.appliedFontSizePx) && v.appliedFontSizePx > 0 && v.appliedFontSizePx <= 160 && v.values && typeof v.values === 'object' && !Array.isArray(v.values)) {
            reviews[k] = {
                ...(typeof v.reason === 'string' && v.reason.trim().length >= 8 && v.reason.trim().length <= 1000 ? { reason: v.reason.trim() } : {}), fingerprint: v.fingerprint, at: v.at, appliedFontSizePx: v.appliedFontSizePx, values: { ...enforceRole(REVIEW_TARGETS.get(k)!.role, v.values), ...Object.fromEntries((['size', 'max'] as const).flatMap(prop => {
                        const value = v.values[prop];
                        return typeof value === 'number' && Number.isFinite(value) && value >= 12 && value <= 160 ? [[prop, value]] : [];
                    })) }
            };
        }
    }
    const step = FLOW_STEPS.find((s) => s.key === x.cursor) ?? FLOW_STEPS[0];
    return {
        version: 1, policies: parsePolicies(x.policies), cursor: step.key, role: step.roles.includes(x.role ?? '') ? x.role! : step.roles[0], reviews, editorBaseline: x.editorBaseline && typeof x.editorBaseline === 'object' && !Array.isArray(x.editorBaseline) ? Object.fromEntries(Object.entries(x.editorBaseline).filter(([key, value]) => allowed.has(key) && value && typeof value === 'object' && !Array.isArray(value)).map(([key, value]) => [key, enforceRole(REVIEW_TARGETS.get(key)!.role, value)])) : undefined, engine: parseEngine(x.engine, allowed), profiles: x.profiles && typeof x.profiles === 'object' && !Array.isArray(x.profiles) ? Object.fromEntries(Object.entries(x.profiles).filter(([k, v]) => allowed.has(k) && v && typeof v === 'object' && !Array.isArray(v)).map(([key, value]) => {
            const clean = enforceRole(REVIEW_TARGETS.get(key)!.role, value);
            return [key, Object.fromEntries(PROPS.filter(prop => Object.hasOwn(value, prop)).map(prop => [prop, clean[prop]]))];
        })) : {}
    };
}
