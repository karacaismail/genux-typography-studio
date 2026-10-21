import { expect, it } from 'vitest';
import { applyOverride, defaultDecisions, resolveAt } from '../../core';
import { approve, decisionsForStep, emptyFlow, FLOW_STEPS, isReviewed } from './model';
import { evaluateDecision, lockDecision, synchronizeDecision } from './engine';
const target=(width=320,ctx='html')=>FLOW_STEPS.find(s=>s.ctx===ctx && s.family==='mobile' && s.device.w===width && s.group==='headings')!;
it('does not overwrite inherited editor decisions with catalog values',()=>{
 const d=applyOverride(defaultDecisions(),'html','h1',{size:44,ta:'center',tt:'uppercase',ls:-.02});
 const f=synchronizeDecision(emptyFlow(),d,target(360),'h1');
 const r=resolveAt(decisionsForStep(f,d,target(360)),'html','h1',360);
 expect(r.ta).toBe('center');expect(r.tt).toBe('uppercase');expect(r.ls).toBe(-.02);expect(r.size).toBeGreaterThanOrEqual(44);
});
it('transfers the complete human style to the next viewport',()=>{
 const d=defaultDecisions();let f=lockDecision(emptyFlow(),d,target(),'h1',{size:40,ta:'center',tt:'uppercase',ff:'mono',td:'underline',wrap:'balance'});f=approve(f,d,target(),'h1');
 expect(evaluateDecision(f,d,target(360),'h1').values).toMatchObject({ta:'center',tt:'uppercase',ff:'mono',td:'underline',wrap:'balance'});
});
it('uses HTML human evidence without discarding product inheritance',()=>{
 const d=defaultDecisions();let f=lockDecision(emptyFlow(),d,target(),'h1',{size:44,ta:'center'});f=approve(f,d,target(),'h1');
 const p=evaluateDecision(f,d,target(320,'admin'),'h1');expect(p.values.ta).toBe('center');expect(p.values.size).toBe(44);expect(p.sources.length).toBeGreaterThan(0);
});
it('bounds learned weight at the workflow lower limit',()=>{
 const d=defaultDecisions();let f=lockDecision(emptyFlow(),d,target(),'h1',{size:40,w:300});f=approve(f,d,target(),'h1');
 for(const id of ['h3','h4','h5','h6'])expect(evaluateDecision(f,d,target(),id).values.w).toBeGreaterThanOrEqual(300);
});
it('honors heading ratio or reports an explicit conflict',()=>{
 const d={...defaultDecisions(),ratio:1.333};let f=lockDecision(emptyFlow(),d,target(),'h1',{size:40});f=approve(f,d,target(),'h1');
 const p=evaluateDecision(f,d,target(),'h2');expect(p.values.size<=Math.floor(40/1.333)||p.checks.some(c=>c.id==='heading-ratio'&&!c.pass)).toBe(true);
});
it('human confirmation resolves conflict metadata and empty-source acceptance is not exportable',async()=>{
 const {decisionStatus,parseFlow,isReviewed,reviewKey}=await import('./model');
 const d=defaultDecisions(),s=target(),key=reviewKey(s,'h1');
 let f=synchronizeDecision(emptyFlow(),d,s,'h1');
 for(const state of ['conflict','stale'] as const){
  const dirty={...f,engine:{version:1 as const,entries:{...f.engine!.entries,[key]:{...f.engine!.entries[key],state,issues:['old conflict']}}}};
  const accepted=approve(dirty,d,s,'h1');expect(isReviewed(accepted,d,s,'h1')).toBe(true);
 }
 f={...f,engine:{version:1,entries:{...f.engine!.entries,[key]:{...f.engine!.entries[key],state:'auto',ruleVersion:2,sources:[]}}}};
 expect(decisionStatus(parseFlow(f),d,s,'h1')).not.toBe('auto');
});
it('inferred future policy cannot flow backward and same-role weights do not repeatedly subtract',()=>{
 const d=defaultDecisions(),desktop=FLOW_STEPS.find(s=>s.ctx==='html'&&s.family==='desktop'&&s.device.w===1920&&s.group==='headings')!;
 let f=approve(lockDecision(emptyFlow(),d,desktop,'h1',{size:48,ls:.04}),d,desktop,'h1');
 expect(evaluateDecision(f,d,target(),'h1').values.ls).toBe(evaluateDecision(emptyFlow(),d,target(),'h1').values.ls);
 f=approve(lockDecision(emptyFlow(),d,target(),'h3',{size:24,w:500}),d,target(),'h3');
 expect(evaluateDecision(f,d,target(360),'h3').values.w).toBe(500);
});
it('tracks every inferred policy contributor as a dependency and honors preserve leading',()=>{
 const d=defaultDecisions(),s=target(),next=target(360);let f=emptyFlow();
 for(const [id,size]of [['h1',40],['h2',32],['h3',25]]as const)f=approve(lockDecision(f,d,s,id,{size,lh:1.25}),d,s,id);
 f=synchronizeDecision(f,d,next,'h1');
 const contributor='html:mobile:320:h2';
 expect(f.engine!.entries['html:mobile:360:h1'].sources.some(source=>source.key===contributor)).toBe(true);
 f=approve(f,d,next,'h1');const human=f.reviews['html:mobile:360:h1'];expect(human).toBeDefined();
 f=approve(lockDecision(f,d,s,'h2',{size:31}),d,s,'h2');
 expect(f.reviews['html:mobile:360:h1']).toBe(human);expect(isReviewed(f,d,next,'h1')).toBe(false);
 const reading=FLOW_STEPS.find(step=>step.ctx==='html'&&step.family==='mobile'&&step.device.w===320&&step.roles.includes('paragraph'))!;
 const configured={...emptyFlow(),policies:{html:{lineHeightStrategy:'preserve' as const}}};
 const keep=applyOverride(d,'html','paragraph',{lh:1.1});
 const preserved=evaluateDecision(configured,keep,reading,'paragraph');
 expect(preserved.values.lh).toBe(1.1);
});

it('keeps historical 12px review snapshots while enforcing 14px active output',async()=>{
 const {parseFlow,reviewKey}=await import('./model');const d=defaultDecisions(),s=target(),key=reviewKey(s,'h6');
 const old=resolveAt(d,'html','h6',320);
 const f=parseFlow({...emptyFlow(),profiles:{[key]:{size:12}},reviews:{[key]:{values:{...old,size:12,max:12},appliedFontSizePx:12,at:'2026-10-20T12:00:00.000Z',fingerprint:'legacy'}}});
 expect(f.reviews[key].values.size).toBe(12);expect(resolveAt(decisionsForStep(f,d,s),'html','h6',320).size).toBe(14);
 expect(isReviewed(f,d,s,'h6')).toBe(false);
});
