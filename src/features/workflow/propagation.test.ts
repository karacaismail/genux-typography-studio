import { expect,it } from 'vitest';
import { defaultDecisions,resolveAt } from '../../core';
import { FLOW_STEPS,emptyFlow,approve,reviewKey,decisionsForStep,isReviewed } from './model';
import { lockDecision } from './engine';
import { runDecisionEvent } from './propagation';
const s=FLOW_STEPS.find(x=>x.ctx==='html'&&x.family==='mobile'&&x.device.w===320&&x.group==='headings')!;
it('propagates human approval into separately labelled motor decisions without human approvals',()=>{
 const d=defaultDecisions();let f=lockDecision(emptyFlow(),d,s,'h1',{size:40});f=approve(f,d,s,'h1');
 const before=JSON.stringify(f.reviews);const next=runDecisionEvent(f,d,{type:'decision-approved',sourceKey:reviewKey(s,'h1')});
 const target=FLOW_STEPS.find(x=>x.ctx==='html'&&x.family==='mobile'&&x.device.w===360&&x.group==='headings')!;
 expect(JSON.stringify(next.reviews)).toBe(before);expect(next.engine?.entries[reviewKey(target,'h1')].state).toBe('auto');expect(isReviewed(next,d,target,'h1')).toBe(false);
 expect(resolveAt(decisionsForStep(next,d,target),'html','h1',360).size).toBeGreaterThanOrEqual(40);
});
it('recalculates dependent motor decisions immediately but never mutates a human record',()=>{
 const d=defaultDecisions();let f=approve(lockDecision(emptyFlow(),d,s,'h1',{size:36}),d,s,'h1');f=runDecisionEvent(f,d,{type:'decision-approved',sourceKey:reviewKey(s,'h1')});
 const target=FLOW_STEPS.find(x=>x.ctx==='html'&&x.family==='desktop'&&x.device.w===1920&&x.group==='headings')!;
 const old=resolveAt(decisionsForStep(f,d,target),'html','h1',1920).size;f=approve(lockDecision(f,d,s,'h1',{size:48}),d,s,'h1');
 const next=runDecisionEvent(f,d,{type:'decision-approved',sourceKey:reviewKey(s,'h1')});
 expect(resolveAt(decisionsForStep(next,d,target),'html','h1',1920).size).toBeGreaterThan(old);expect(next.reviews[reviewKey(s,'h1')]).toEqual(f.reviews[reviewKey(s,'h1')]);
});
it('step-entered does not globally approve targets and weak evidence is queued',()=>{
 const d=defaultDecisions();const f=runDecisionEvent(emptyFlow(),d,{type:'recalculate',scope:{ctx:'html',group:'headings',width:320},accept:true});
 expect(Object.keys(f.reviews)).toHaveLength(0);expect(Object.values(f.engine!.entries).every(e=>e.state==='conflict')).toBe(true);
});
it('accepted motor decisions have undo and redo, and rule-version refresh preserves humans',async()=>{
 const {undoDecision,redoDecision}=await import('./engine');const {refreshEngine}=await import('./propagation');
 const d=defaultDecisions();let f=approve(lockDecision(emptyFlow(),d,s,'h1',{size:40}),d,s,'h1');f=runDecisionEvent(f,d,{type:'decision-approved',sourceKey:reviewKey(s,'h1')});
 const target=FLOW_STEPS.find(x=>x.ctx==='html'&&x.family==='mobile'&&x.device.w===360&&x.group==='headings')!;const key=reviewKey(target,'h1');
 const accepted=resolveAt(decisionsForStep(f,d,target),'html','h1',360).size;
 const undone=undoDecision(f,target,'h1');expect(undone.engine!.entries[key].state).toBe('undone');expect(resolveAt(decisionsForStep(undone,d,target),'html','h1',360).size).not.toBe(accepted);
 const redone=redoDecision(undone,target,'h1');expect(resolveAt(decisionsForStep(redone,d,target),'html','h1',360).size).toBe(accepted);
 const old={...f,engine:{version:1 as const,entries:{...f.engine!.entries,[key]:{...f.engine!.entries[key],ruleVersion:1}}}};
 const upgraded=refreshEngine(old,d);expect(upgraded.engine!.entries[key].ruleVersion).toBe(2);expect(upgraded.reviews).toBe(old.reviews);
});
it('closes transitive dependencies across a preserved stale human decision',()=>{
 const d=defaultDecisions();let f=approve(lockDecision(emptyFlow(),d,s,'h1',{size:40}),d,s,'h1');
 f=runDecisionEvent(f,d,{type:'decision-approved',sourceKey:reviewKey(s,'h1')});f=approve(f,d,s,'h2');
 const b=reviewKey(s,'h2'),c=reviewKey(s,'h3');
 f={...f,engine:{version:1,entries:{...f.engine!.entries,[c]:{...f.engine!.entries[c],sources:[{key:b,fingerprint:f.reviews[b].fingerprint,label:'Human H2'}]}}}};
 const review=f.reviews[b];f=lockDecision(f,d,s,'h1',{size:44});
 const next=runDecisionEvent(f,d,{type:'decision-changed',sourceKey:reviewKey(s,'h1')});
 expect(next.reviews[b]).toBe(review);expect(next.engine!.entries[c].event).toBe('decision-changed');expect(next.engine!.entries[c].state).toBe('conflict');
});
