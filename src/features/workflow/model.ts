import { dependencyToken, parseEngine, type EngineState } from './engineState';
import { CATEGORIES, CONTEXTS, DEVICES, contrastInfo, resolveAt, rolesOf, applyOverrideAt, enforceRole, PROPS, sizeAt, type ContextId, type Decisions, type Device, type RoleOverrides } from '../../core';

export const FLOW_KEY = 'genux-typography-workflow-v1';
export const FAMILY_LABEL = { mobile: 'Mobil', tablet: 'Tablet', laptop: 'Laptop', desktop: 'Bilgisayar', tv: 'Televizyon' } as const;
export type Family = keyof typeof FAMILY_LABEL;
export interface FlowStep { key: string; ctx: ContextId; family: Family; device: Device; group: string; label: string; roles: string[] }
export interface Review { appliedFontSizePx: number; at: string; fingerprint: string; values: ReturnType<typeof resolveAt> }
export interface FlowState { version: 1; cursor: string; role: string; reviews: Record<string, Review>; profiles?: Record<string, RoleOverrides>; engine?: EngineState; editorBaseline?: Record<string,ReturnType<typeof resolveAt>> }
export const emptyFlow = (): FlowState => ({ version: 1, cursor: '', role: 'h1', reviews: {} });
export const familyOf = (d: Device): Family => d.w >= 2560 ? 'tv' : d.group;
const subtitle = new Set(['hgroupSub', 'lead', 'overline']);

/** context → family → ascending viewport → group; each role occurs once per viewport. */
export const WORKFLOW_DEVICES: { device: Device; family: Family }[] = [
  ...DEVICES.filter((d) => d.w < 2560).map((device) => ({ device, family: familyOf(device) })),
  ...[2048, 2560].map((w) => ({ family: 'desktop' as const, device: { id: `monitor${w}`, name: `Monitör ${w} px`, group: 'desktop' as const, w, h: Math.round(w * 9 / 16) } })),
  ...[1280,1920,2560,3440,3840].map((w) => ({ family: 'tv' as const, device: { id: `tv${w}`, name: `TV · ${w} px mantıksal görünüm`, group: 'desktop' as const, w, h: Math.round(w * 9 / 16) } })),
];
export function makeSteps(): FlowStep[] {
  return CONTEXTS.flatMap(({ id: ctx }) => WORKFLOW_DEVICES.flatMap(({device, family}) => {
    const roles = rolesOf(ctx);
    const groups = [
      { id: 'headings', label: 'Headings', items: roles.filter((r) => r.category === 'headings' && !subtitle.has(r.id)) },
      { id: 'subtitle', label: 'Sub-title', items: roles.filter((r) => subtitle.has(r.id)) },
      ...CATEGORIES.filter((c) => c.id !== 'headings').map((c) => ({ id: c.id, label: c.label, items: roles.filter((r) => r.category === c.id && !subtitle.has(r.id)) })),
    ];
    return groups.filter((g) => g.items.length).map((g) => ({ key: `${ctx}:${family}:${device.w}:${g.id}`, ctx, family, device, group: g.id, label: g.label, roles: g.items.map((r) => r.id) }));
  }));
}
export const FLOW_STEPS = makeSteps();
export const reviewKey = (s: FlowStep, role: string) => `${s.ctx}:${s.family}:${s.device.w}:${role}`;
export const REVIEW_TARGETS = new Map(FLOW_STEPS.flatMap(s=>s.roles.map(role=>[reviewKey(s,role),{step:s,role}] as const)));
const profileCache = new WeakMap<FlowState, WeakMap<Decisions, Map<string,Decisions>>>();
export function decisionsForStep(f: FlowState, d: Decisions, s: FlowStep): Decisions {
  let byDecisions=profileCache.get(f);
  if(!byDecisions) profileCache.set(f,(byDecisions=new WeakMap()));
  let cache=byDecisions.get(d);
  if(!cache) byDecisions.set(d,(cache=new Map()));
  const key=`${s.ctx}:${s.family}:${s.device.w}`;
  const cached=cache.get(key); if(cached)return cached;
  let out = d;
  if(s.ctx !== 'html') out = decisionsForStep(f,d,{...s,ctx:'html'});
  for (const role of rolesOf(s.ctx)) {
    const patch = f.profiles?.[reviewKey(s, role.id)];
    if (patch) {
      const checked=enforceRole(role.id,{...resolveAt(out,s.ctx,role.id,s.device.w),...patch});
      const clean=Object.fromEntries(Object.keys(patch).filter((k)=>PROPS.includes(k as keyof RoleOverrides)).map((k)=>[k,checked[k as keyof RoleOverrides]]));
      out = applyOverrideAt(out, s.ctx, role.id, clean, s.device.w);
    }
  }
  cache.set(key,out);
  return out;
}
export function fingerprint(d: Decisions, s: FlowStep, role: string, f?:FlowState) {
  const entry=f?.engine?.entries[reviewKey(s,role)];
  return JSON.stringify({ ...(entry?.state==='automatic' && entry.sources.length?{sources:entry.sources.map(({key,fingerprint})=>({key,fingerprint:dependencyToken(fingerprint)}))}:{}), values: resolveAt(d, s.ctx, role, s.device.w), settings: d.contexts[s.ctx].settings });
}
const reviewCache=new WeakMap<FlowState,WeakMap<Decisions,Map<string,boolean>>>();
export function isReviewed(f: FlowState,d: Decisions,s: FlowStep,role:string,visiting=new Set<string>()):boolean {
  const key=reviewKey(s,role);
  let byDecision=reviewCache.get(f);if(!byDecision)reviewCache.set(f,(byDecision=new WeakMap()));
  let cache=byDecision.get(d);if(!cache)byDecision.set(d,(cache=new Map()));
  const cached=cache.get(key);if(cached!==undefined)return cached;
  if(visiting.size>=256 || visiting.has(key) || f.reviews[key]?.fingerprint!==fingerprint(decisionsForStep(f,d,s),s,role,f))return false;
  const resolved=resolveAt(decisionsForStep(f,d,s),s.ctx,role,s.device.w);
  const px=Math.round(sizeAt(resolved,d.contexts[s.ctx].settings,role,s.device.w));
  if(!(['light','dark'] as const).every(theme=>contrastInfo({...resolved,size:px,max:px,mode:'static',sizes:null},role,theme).pass)){cache.set(key,false);return false;}
  const entry=f.engine?.entries[key];
  if(!entry || entry.state!=='automatic'){cache.set(key,true);return true;}
  const next=new Set(visiting).add(key);
  const valid=entry.sources.every(source=>{const target=REVIEW_TARGETS.get(source.key);return !!target && f.reviews[source.key]?.fingerprint===source.fingerprint && isReviewed(f,d,target.step,target.role,next);});
  cache.set(key,valid);return valid;
}
export const stepDone = (f: FlowState, d: Decisions, s: FlowStep) => s.roles.every((id) => isReviewed(f, d, s, id));
export function approve(f: FlowState, d: Decisions, s: FlowStep, role: string, now = new Date()): FlowState {
  if (!s.roles.includes(role)) return f;
  const resolved=resolveAt(decisionsForStep(f,d,s),s.ctx,role,s.device.w);
  const applied=Math.round(sizeAt(resolved,d.contexts[s.ctx].settings,role,s.device.w));
  if(!(['light','dark'] as const).every(theme=>contrastInfo({...resolved,size:applied,max:applied,mode:'static',sizes:null},role,theme).pass))return f;
  const key=reviewKey(s,role),entry=f.engine?.entries[key];
  const brokenSources=entry?.state==='automatic' && entry.sources.some(source=>{const target=REVIEW_TARGETS.get(source.key);return !target || f.reviews[source.key]?.fingerprint!==source.fingerprint || !isReviewed(f,d,target.step,target.role);});
  const accepted=brokenSources ? {...f,engine:{version:1 as const,entries:{...f.engine?.entries,[key]:{...entry,state:'manual' as const,sources:[],trace:[...entry.trace,{rule:'explicit-reapproval',reason:'Kaynak değişti; mevcut değerler kullanıcı tarafından yeniden onaylandı.'}]}}}} : f;
  return { ...accepted, reviews: { ...f.reviews, [reviewKey(s, role)]: { appliedFontSizePx: Math.round(sizeAt(resolveAt(decisionsForStep(f,d,s),s.ctx,role,s.device.w),d.contexts[s.ctx].settings,role,s.device.w)), at: now.toISOString(), fingerprint: fingerprint(decisionsForStep(f,d,s), s, role,accepted), values: structuredClone(resolveAt(decisionsForStep(f,d,s), s.ctx, role, s.device.w)) } } };
}
export function parseFlow(raw: unknown): FlowState {
  if (!raw || typeof raw !== 'object') throw new Error('Akış kaydı nesne olmalı.');
  const x = raw as Partial<FlowState>;
  if (x.version !== 1 || !x.reviews || typeof x.reviews !== 'object' || Array.isArray(x.reviews)) throw new Error('Akış biçimi tanınmadı.');
  const allowed = new Set(FLOW_STEPS.flatMap((s) => s.roles.map((id) => reviewKey(s, id))));
  const reviews: FlowState['reviews'] = {};
  for (const [k, v] of Object.entries(x.reviews)) {
    if (allowed.has(k) && v && typeof v.fingerprint === 'string' && typeof v.at === 'string' && v.values && typeof v.values === 'object') reviews[k] = v;
  }
  const step = FLOW_STEPS.find((s) => s.key === x.cursor) ?? FLOW_STEPS[0];
  return { version: 1, cursor: step.key, role: step.roles.includes(x.role ?? '') ? x.role! : step.roles[0], reviews, editorBaseline:x.editorBaseline && typeof x.editorBaseline==='object'?Object.fromEntries(Object.entries(x.editorBaseline).filter(([key,value])=>allowed.has(key) && value && typeof value==='object').map(([key,value])=>[key,enforceRole(REVIEW_TARGETS.get(key)!.role,value)])):undefined, engine:parseEngine(x.engine,allowed), profiles: x.profiles && typeof x.profiles === 'object' ? Object.fromEntries(Object.entries(x.profiles).filter(([k,v]) => allowed.has(k) && v && typeof v === 'object')) : {} };
}
