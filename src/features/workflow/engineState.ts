import { PROPS, type RoleOverrides } from '../../core';

export const ENGINE_VERSION = 1;
export type DecisionEvent = 'step-entered' | 'decision-approved' | 'decision-changed' | 'recalculate';
export interface DecisionSource { key: string; fingerprint: string; label: string }
export interface RuleTrace { rule: string; reason: string }
export interface EngineEntry {
  version: 1;
  event: DecisionEvent;
  state: 'automatic' | 'manual' | 'undone';
  original: RoleOverrides | null;
  signature: string;
  sources: DecisionSource[];
  trace: RuleTrace[];
  undo?: { profile:RoleOverrides|null; entry:Omit<EngineEntry,'undo'>|null };
  evidence: 'catalog' | 'related' | 'same-role' | 'trend';
}
export interface EngineState { version: 1; entries: Record<string,EngineEntry> }
const obj=(x:unknown):x is Record<string,unknown>=>!!x && typeof x==='object' && !Array.isArray(x);
/** Imported provenance is bounded and never executes rules or arbitrary text. */
export function parseEngine(raw:unknown,allowed:Set<string>): EngineState | undefined {
  if(!obj(raw) || raw.version!==1 || !obj(raw.entries))return undefined;
  const entries:Record<string,EngineEntry>={};
  for(const [key,value] of Object.entries(raw.entries)){
    if(!allowed.has(key) || !obj(value) || value.version!==1 || !['automatic','manual','undone'].includes(String(value.state)))continue;
    const sources=Array.isArray(value.sources)?value.sources.filter(obj).filter(s=>typeof s.key==='string' && s.key!==key && allowed.has(s.key) && typeof s.fingerprint==='string' && s.fingerprint.length<=16384 && typeof s.label==='string').slice(0,32).map(s=>({key:String(s.key),fingerprint:String(s.fingerprint),label:String(s.label).slice(0,160)})):[];
    const trace=Array.isArray(value.trace)?value.trace.filter(obj).filter(t=>typeof t.rule==='string' && typeof t.reason==='string').slice(0,24).map(t=>({rule:String(t.rule).slice(0,80),reason:String(t.reason).slice(0,500)})):[];
    let undo:EngineEntry['undo'];
    if(obj(value.undo)){
      const profile=obj(value.undo.profile)?Object.fromEntries(Object.entries(value.undo.profile).filter(([k])=>PROPS.includes(k as keyof RoleOverrides))):null;
      const inner=obj(value.undo.entry)?Object.fromEntries(Object.entries(value.undo.entry).filter(([k])=>k!=='undo')):null;
      const entry=inner?parseEngine({version:1,entries:{[key]:inner}},allowed)?.entries[key]??null:null;
      undo={profile,entry};
    }
    entries[key]={undo,version:1,event:['step-entered','decision-approved','decision-changed','recalculate'].includes(String(value.event))?value.event as DecisionEvent:'step-entered',state:value.state as EngineEntry['state'],original:obj(value.original)?Object.fromEntries(Object.entries(value.original).filter(([k])=>PROPS.includes(k as keyof RoleOverrides))):null,signature:typeof value.signature==='string'?value.signature.slice(0,32768):'',sources,trace,evidence:['catalog','related','same-role','trend'].includes(String(value.evidence))?value.evidence as EngineEntry['evidence']:'catalog'};
  }
  return {version:1,entries};
}

/** Bounded identity for dependency snapshots; not a security signature. */
export function dependencyToken(text:string):string {
  let a=2166136261,b=5381;
  for(let i=0;i<text.length;i++){a=Math.imul(a^text.charCodeAt(i),16777619);b=Math.imul(b,33)^text.charCodeAt(i);}
  return `${(a>>>0).toString(16)}${(b>>>0).toString(16)}`;
}
