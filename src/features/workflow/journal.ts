import { CONTEXT_IDS } from '../../core';
import { REVIEW_TARGETS, parseFlow, type FlowState } from './model';
// A new document owns a fresh journal even when an opener clones sessionStorage.
const owner = crypto.randomUUID();
let previousOwner: string | null = null;
try {
    previousOwner = sessionStorage.getItem('genux-workflow-tab');
}
catch {
    // Recovery cannot resume without session storage; writes retain a unique document key.
}
export const JOURNAL_KEY = `genux-typography-workflow-journal-v1:${owner}`;
const previousKey = previousOwner ? `genux-typography-workflow-journal-v1:${previousOwner}` : null;
export function readJournal(): string | null {
    const text = localStorage.getItem(JOURNAL_KEY) ?? (previousKey ? localStorage.getItem(previousKey) : null);
    if (text !== null)
        localStorage.setItem(JOURNAL_KEY, text);
    sessionStorage.setItem('genux-workflow-tab', owner);
    return text;
}
export function clearJournal(expected: string): void {
    for (const key of [JOURNAL_KEY, previousKey])
        if (key && localStorage.getItem(key) === expected)
            localStorage.removeItem(key);
}
export interface JournalWorkspace {
    flow: FlowState;
    notes: Record<string, string>;
    commit?: string;
}
type Change = {
    area: 'profiles' | 'reviews' | 'entries' | 'notes' | 'policies';
    key: string;
    before: string;
    after: unknown;
};
export interface WorkflowJournal {
    version: 1;
    revision?: string;
    baseCommit?: string;
    ancestors?: string[];
    changes: Change[];
    cursor: string;
    role: string;
}
const canonical = (value: unknown): unknown => {
    if (Array.isArray(value))
        return value.map(canonical);
    if (value && typeof value === 'object')
        return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined && !(Array.isArray(v) && !v.length)).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, canonical(v)]));
    return value ?? null;
};
const encoded = (value: unknown) => JSON.stringify(canonical(value));
/** Emergency journal contains user-owned deltas, never a second copy of the complete ledger. */
export function makeJournal(before: JournalWorkspace, after: JournalWorkspace, inFlight: JournalWorkspace[] = []): WorkflowJournal {
    const changes: Change[] = [];
    for (const key of new Set([...Object.keys(before.flow.profiles ?? {}), ...Object.keys(after.flow.profiles ?? {}), ...Object.keys(after.flow.reviews)])) {
        const state = after.flow.engine?.entries[key]?.state;
        if (!['manual', 'undone'].includes(state ?? '') && before.flow.reviews[key] === after.flow.reviews[key])
            continue;
        for (const area of ['profiles', 'reviews', 'entries'] as const) {
            const a = area === 'entries' ? before.flow.engine?.entries : before.flow[area], b = area === 'entries' ? after.flow.engine?.entries : after.flow[area];
            if (encoded(a?.[key]) !== encoded(b?.[key]))
                changes.push({
                    area, key, before: encoded(a?.[key]), after: b?.[key] ?? null
                });
        }
    }
    for (const key of new Set([...Object.keys(before.notes), ...Object.keys(after.notes)]))
        if (before.notes[key] !== after.notes[key])
            changes.push({
                area: 'notes', key, before: encoded(before.notes[key]), after: after.notes[key] ?? null
            });
    for (const key of new Set([...Object.keys(before.flow.policies ?? {}), ...Object.keys(after.flow.policies ?? {})])) {
        const a = before.flow.policies?.[key as keyof NonNullable<FlowState['policies']>], b = after.flow.policies?.[key as keyof NonNullable<FlowState['policies']>];
        if (encoded(a) !== encoded(b))
            changes.push({
                area: 'policies', key, before: encoded(a), after: b ?? null
            });
    }
    return {
        version: 1, baseCommit: before.commit, ancestors: inFlight.flatMap(value => value.commit ? [value.commit] : []).slice(-16), changes, cursor: after.flow.cursor, role: after.flow.role
    };
}
export function restoreJournal(current: JournalWorkspace, raw: unknown): {
    workspace: JournalWorkspace;
    conflicts: number;
    keys: string[];
} {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw))
        throw new Error('Kurtarma kaydı tanınmadı.');
    const j = raw as WorkflowJournal;
    if (j.version !== 1 || !Array.isArray(j.changes) || j.changes.length > 1024)
        throw new Error('Kurtarma kaydı sınırı aşıldı.');
    const profiles = { ...current.flow.profiles }, reviews = { ...current.flow.reviews }, entries = { ...current.flow.engine?.entries }, notes = { ...current.notes }, policies = { ...current.flow.policies };
    const maps = {
        profiles, reviews, entries, notes, policies
    } as Record<string, Record<string, unknown>>;
    if (j.ancestors && (!Array.isArray(j.ancestors) || j.ancestors.length > 16 || j.ancestors.some(id => typeof id !== 'string' || id.length > 128)))
        throw new Error('Kurtarma kökeni geçersiz.');
    const intermediate = !!current.commit && !!j.ancestors?.includes(current.commit);
    const foreign = current.commit !== j.baseCommit && !intermediate;
    let conflicts = 0;
    const keys = new Set<string>();
    for (const c of j.changes) {
        if (!c || typeof c.key !== 'string' || !Object.hasOwn(maps, c.area) || typeof c.before !== 'string' || (c.area !== 'policies' && !REVIEW_TARGETS.has(c.key)))
            throw new Error('Kurtarma hedefi geçersiz.');
        if (c.area === 'policies' && !CONTEXT_IDS.includes(c.key as typeof CONTEXT_IDS[number]))
            throw new Error('Kurtarma politikası geçersiz.');
        if (c.area === 'notes' && c.after !== null && (typeof c.after !== 'string' || c.after.length > 4000))
            throw new Error('Kurtarma notu geçersiz.');
        if (c.area !== 'notes' && c.after !== null && (!c.after || typeof c.after !== 'object' || Array.isArray(c.after)))
            throw new Error('Kurtarma değeri geçersiz.');
        const map = maps[c.area], now = encoded(map[c.key]);
        const generated = ['automatic', 'auto', 'conflict', 'stale'].includes(current.flow.engine?.entries[c.key]?.state ?? '') && !current.flow.reviews[c.key] && (c.area === 'profiles' || c.area === 'entries');
        if (now !== encoded(c.after) && (foreign || (now !== c.before && !generated && !intermediate))) {
            conflicts++;
            continue;
        }
        if (c.after === null)
            delete map[c.key];
        else
            map[c.key] = c.after;
        keys.add(c.key);
    }
    const flow = parseFlow({
        ...current.flow, profiles, reviews, engine: { version: 1, entries }, policies, cursor: j.cursor, role: j.role
    });
    return {
        workspace: {
            flow, notes, commit: current.commit
        }, conflicts, keys: [...keys].filter(key => REVIEW_TARGETS.has(key))
    };
}
export function writeJournal(before: JournalWorkspace, after: JournalWorkspace, inFlight: JournalWorkspace[] = []): string {
    const journal = { ...makeJournal(before, after, inFlight), revision: crypto.randomUUID() }, text = JSON.stringify(journal);
    if (text.length > 1024 * 1024)
        throw new Error('Kurtarma farkı 1 MiB sınırını aşıyor; JSON yedeği indir.');
    localStorage.setItem(JOURNAL_KEY, text);
    sessionStorage.setItem('genux-workflow-tab', owner);
    return text;
}
