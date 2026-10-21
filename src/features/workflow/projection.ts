import { lockDecision } from './engine';
import { applyOverrideAt, BREAKPOINTS, contrastInfo, CONTEXTS, grayHex, resolveAt, rolesOf, sizeAt, PROPS, eqProp, type Decisions, type RoleProps } from '../../core';
import { decisionStatus, decisionsForStep, REVIEW_TARGETS, type FlowState } from './model';

const projectedProfiles=new WeakMap<FlowState,WeakMap<Decisions,NonNullable<FlowState['profiles']>>>();

/** v2 represents family + width, not shell IDs. Unrepresented widths remain workflow-only. */
function projectionProfiles(f:FlowState,d:Decisions):NonNullable<FlowState['profiles']>{
  return Object.fromEntries(Object.entries(f.profiles??{}).filter(([key])=>{
    const target=REVIEW_TARGETS.get(key);
    if(!target || target.step.family==='tv' || !BREAKPOINTS.includes(target.step.device.w))return false;
    const status=decisionStatus(f,d,target.step,target.role);
    return status==='approved' || status==='manual' || status==='auto';
  }));
}
/** v2 has shared role colors/mode, while workflow retains exact family/viewport profiles.
 * Project standard device decisions into its existing contract; never collapse TV/monitor profiles. */
export function projectWorkflowDecisions(f:FlowState,d:Decisions):Decisions{
  const profiles=projectionProfiles(f,d), accepted={...f,profiles};
  const entries=Object.keys(profiles).flatMap(key=>{const target=REVIEW_TARGETS.get(key);return target?[target]:[];})
    .sort((a,b)=>CONTEXTS.findIndex(c=>c.id===a.step.ctx)-CONTEXTS.findIndex(c=>c.id===b.step.ctx) || a.step.device.w-b.step.device.w);
  let out=d;
  const colors=new Map<string,{ctx:typeof entries[number]['step']['ctx'];id:string;values:RoleProps}>();
  for(const {step,role} of entries){
    const values=resolveAt(decisionsForStep(accepted,d,step),step.ctx,role,step.device.w);
    const applied=Math.round(sizeAt(values,d.contexts[step.ctx].settings,role,step.device.w));
    out=applyOverrideAt(out,step.ctx,role,{...values,size:applied,max:applied,mode:'static',sizes:null,gr:1},step.device.w);
    const key=`${step.ctx}:${role}`;if(!colors.has(key))colors.set(key,{ctx:step.ctx,id:role,values});
  }
  for(const {ctx,id,values} of colors.values()){
    const c={...values.c};
    for(const theme of ['light','dark'] as const){
      // Shared v2 colors must also remain safe at smaller exported font sizes.
      const safe=(hex:string)=>CONTEXTS.filter(context=>ctx==='html'?rolesOf(context.id).some(role=>role.id===id):context.id===ctx).every(context=>BREAKPOINTS.every(width=>{
        const r=resolveAt(out,context.id,id,width);return contrastInfo({...r,c:{...r.c,[theme]:hex}},id,theme).pass;
      }));
      if(!safe(c[theme])){
        const original=parseInt(c[theme].slice(1,3),16);
        const candidates=Array.from({length:128},(_,i)=>grayHex(theme==='light'?i:128+i)).filter(safe);
        c[theme]=candidates.reduce((best,hex)=>Math.abs(parseInt(hex.slice(1,3),16)-original)<Math.abs(parseInt(best.slice(1,3),16)-original)?hex:best,theme==='light'?'#000000':'#ffffff');
      }
    }
    out=applyOverrideAt(out,ctx,id,{c},320);
  }
  let cache=projectedProfiles.get(f);if(!cache)projectedProfiles.set(f,(cache=new WeakMap()));
  cache.set(out,profiles);
  return out;
}

/** Snapshot only projected workflow targets, not an entire second decision store. */
export function snapshotEditorProjection(f:FlowState,d:Decisions):NonNullable<FlowState['editorBaseline']>{
  return Object.fromEntries(Object.keys(projectedProfiles.get(f)?.get(d)??projectionProfiles(f,d)).flatMap(key=>{
    const target=REVIEW_TARGETS.get(key);if(!target)return [];
    return [[key,structuredClone(resolveAt(d,target.step.ctx,target.role,target.step.device.w))]];
  }));
}
/** Merge only fields actually edited since handoff; keep exact workflow-only fields. */
export function reconcileEditorChanges(f:FlowState,d:Decisions):FlowState{
  if(!f.editorBaseline)return f;
  let next=f;
  for(const [key,baseline] of Object.entries(f.editorBaseline)){
    const target=REVIEW_TARGETS.get(key);if(!target)continue;
    const current=resolveAt(d,target.step.ctx,target.role,target.step.device.w);
    const patch=Object.fromEntries(PROPS.filter(prop=>!eqProp(prop,baseline[prop],current[prop])).map(prop=>[prop,current[prop]]));
    if(Object.keys(patch).length)next=lockDecision(next,d,target.step,target.role,patch);
  }
  const {editorBaseline:_baseline,...rest}=next;return rest;
}
