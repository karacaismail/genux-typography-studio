import { PROPS, eqProp, type ContextId, type Decisions } from '../../core';
import { evaluateDecision, hasExplicitDecision, inheritedValue } from './engine';
import { ENGINE_VERSION, dependencyToken, type DecisionEvent, type EngineEntry } from './engineState';
import { decisionStatus, FLOW_STEPS, REVIEW_TARGETS, reviewKey, type Family, type FlowState, type FlowStep } from './model';
export interface DecisionScope {
    ctx: ContextId;
    family?: Family;
    width?: number;
    group?: string;
}
export interface EngineEvent {
    type: DecisionEvent;
    sourceKey?: string;
    scope?: DecisionScope;
    accept?: boolean;
    existingOnly?: boolean;
}
const rank = {
    mobile: 0, tablet: 1, laptop: 2, desktop: 3, tv: 4
};
/** Reverse dependencies contain human sources only; automatic values never become evidence. */
export function dependencyIndex(f: FlowState): Map<string, Set<string>> {
    const index = new Map<string, Set<string>>();
    for (const [target, entry] of Object.entries(f.engine?.entries ?? {}))
        for (const source of entry.sources) {
            const list = index.get(source.key) ?? new Set<string>();
            list.add(target);
            index.set(source.key, list);
        }
    return index;
}
function eligible(s: FlowStep, event: EngineEvent): boolean {
    const scope = event.scope;
    if (scope)
        return s.ctx === scope.ctx && (!scope.family || s.family === scope.family) && (!scope.width || s.device.w === scope.width) && (!scope.group || s.group === scope.group);
    const source = event.sourceKey ? REVIEW_TARGETS.get(event.sourceKey) : undefined;
    return !!source && (s.ctx === source.step.ctx || source.step.ctx === 'html') && s.group === source.step.group && s.device.w >= source.step.device.w && rank[s.family] >= rank[source.step.family];
}
/** Event agenda is bounded by the known target registry. One source snapshot makes firing deterministic. */
export function runDecisionEvent(f: FlowState, d: Decisions, event: EngineEvent): FlowState {
    if (event.type === 'step-entered')
        return f;
    const index = dependencyIndex(f), affected = new Set<string>();
    const agenda = event.sourceKey ? [event.sourceKey] : [];
    // Finite fixpoint over the reverse graph; cycles cannot fire a target twice.
    for (let cursor = 0; cursor < agenda.length && cursor <= REVIEW_TARGETS.size; cursor++) {
        for (const key of index.get(agenda[cursor]) ?? [])
            if (!affected.has(key)) {
                affected.add(key);
                agenda.push(key);
            }
    }
    const targets = event.type === 'decision-changed'
        ? [...(affected ?? [])].flatMap(key => {
            const t = REVIEW_TARGETS.get(key);
            return t ? [t] : [];
        })
        : FLOW_STEPS.filter(s => eligible(s, event)).flatMap(step => step.roles.map(role => ({ step, role })));
    if (!targets.length)
        return f;
    const entries = { ...f.engine?.entries }, profiles = { ...f.profiles };
    let changed = false;
    for (const { step, role } of targets) {
        const key = reviewKey(step, role), previous = entries[key];
        if (event.existingOnly && !previous)
            continue;
        // A human record is immutable. Its source validation marks it stale without replacing it.
        if (f.reviews[key] || previous?.state === 'manual' || previous?.state === 'undone' || (!previous && hasExplicitDecision(f, d, step, role)))
            continue;
        const prediction = evaluateDecision(f, d, step, role, event.type);
        const failed = prediction.checks.filter(c => !c.pass && c.blocking !== false);
        const strong = prediction.sources.length > 0;
        const state: EngineEntry['state'] = failed.length || !strong ? 'conflict' : event.accept || event.type === 'decision-approved' || previous?.state === 'auto' ? 'auto' : 'automatic';
        const issues = [...failed.map(c => c.detail), ...(!strong ? ['Geçerli insan kanıtı yok; inceleme gerekiyor.'] : [])];
        const signature = dependencyToken(JSON.stringify({
            version: ENGINE_VERSION, values: prediction.values, sources: prediction.sources, issues
        }));
        if (previous?.signature === signature && previous.state === state && previous.ruleVersion === ENGINE_VERSION)
            continue;
        const base = inheritedValue(f, d, step, role);
        const patch = Object.fromEntries(PROPS.filter(prop => !eqProp(prop, base[prop], prediction.values[prop])).map(prop => [prop, prediction.values[prop]]));
        if (state === 'auto' || state === 'automatic')
            profiles[key] = patch;
        else if (previous?.state === 'auto')
            delete profiles[key];
        const { undo: _undo, past: _past, future: _future, ...snapshot } = previous ?? {};
        const realChange = !!previous && JSON.stringify(f.profiles?.[key] ?? null) !== JSON.stringify(profiles[key] ?? null);
        entries[key] = {
            version: 1, ruleVersion: ENGINE_VERSION, event: event.type, state, original: previous?.original ?? null, signature, sources: prediction.sources, trace: prediction.trace, evidence: prediction.evidence, issues,
            past: realChange ? [...(previous.past ?? []), { profile: f.profiles?.[key] ?? null, entry: snapshot as Omit<EngineEntry, 'undo' | 'past' | 'future'> }].slice(-20) : previous?.past ?? (state === 'auto' ? [{ profile: f.profiles?.[key] ?? null, entry: null }] : undefined),
            future: realChange ? [] : previous?.future
        };
        changed = true;
    }
    return changed ? {
        ...f, profiles, engine: { version: 1, entries }
    } : f;
}
export function engineCounts(f: FlowState, d?: Decisions) {
    let auto = 0, pending = 0;
    for (const key of new Set([...Object.keys(f.engine?.entries ?? {}), ...Object.keys(f.reviews)])) {
        const target = REVIEW_TARGETS.get(key);
        if (!target)
            continue;
        const state = d ? decisionStatus(f, d, target.step, target.role) : f.engine?.entries[key]?.state;
        if (state === 'auto')
            auto++;
        if (state === 'stale' || state === 'conflict')
            pending++;
    }
    return { auto, pending };
}
/** Rule upgrades refresh existing automatic records; human records remain untouched. */
export function refreshEngine(f: FlowState, d: Decisions): FlowState {
    const contexts = new Set(Object.entries(f.engine?.entries ?? {}).flatMap(([key, entry]) => {
        const target = REVIEW_TARGETS.get(key);
        return target && entry.state === 'auto' && entry.ruleVersion !== ENGINE_VERSION ? [target.step.ctx] : [];
    }));
    let next = f;
    for (const ctx of contexts)
        next = runDecisionEvent(next, d, {
            type: 'recalculate', scope: { ctx }, accept: true, existingOnly: true
        });
    return next;
}
