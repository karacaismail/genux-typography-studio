import { describe, expect, it } from 'vitest';
import { defaultDecisions, resolveAt, ROLE, minSizeFor } from '../../core';
import { FLOW_STEPS, approve, emptyFlow, reviewKey, decisionsForStep, isReviewed } from './model';
import { runDecisionEvent } from './propagation';
import { synchronizeDecision, lockDecision, evaluateDecision, decisionChecks, undoDecision } from './engine';
const step=(width=320)=>FLOW_STEPS.find(s=>s.ctx==='html' && s.family==='mobile' && s.device.w===width && s.group==='headings')!;
describe('mobile-first ECA decision engine',()=>{
  it('learns only confirmed decisions, scales sibling roles and never auto-approves',()=>{
    const d=defaultDecisions(),s=step();
    let f=synchronizeDecision(emptyFlow(),d,s,'h1');
    f=lockDecision(f,d,s,'h1',{size:40,mode:'static'});
    expect(evaluateDecision(f,d,s,'h2').sources).toHaveLength(0);
    f=approve(f,d,s,'h1');
    f=synchronizeDecision(f,d,s,'h2');
    expect(resolveAt(decisionsForStep(f,d,s),'html','h2',320).size).toBe(35);
    expect(isReviewed(f,d,s,'h2')).toBe(false);
  });
  it('preserves manual drafts and confirmed decisions, with explicit undo',()=>{
    const d=defaultDecisions(),s=step();
    let f=synchronizeDecision(emptyFlow(),d,s,'h1');
    f=lockDecision(f,d,s,'h1',{size:39});
    expect(synchronizeDecision(f,d,s,'h1')).toBe(f);
    const confirmed=approve(f,d,s,'h1');
    expect(synchronizeDecision(confirmed,d,s,'h1','recalculate',true)).toBe(confirmed);
    f=undoDecision(f,s,'h1');
    expect(resolveAt(decisionsForStep(f,d,s),'html','h1',320).size).toBe(32);
  });
  it('transfers mobile decisions forward and permits explicit HTML inheritance',()=>{
    const d=defaultDecisions(),s=step();
    let f=lockDecision(emptyFlow(),d,s,'h1',{size:40,mode:'static'});f=approve(f,d,s,'h1');
    const prediction=evaluateDecision(f,d,step(360),'h1');
    expect(prediction.values.size).toBeGreaterThanOrEqual(40);
    expect(prediction.sources[0].key).toBe(reviewKey(s,'h1'));
    const product=FLOW_STEPS.find(s=>s.ctx==='admin' && s.device.w===360)!;
    expect(evaluateDecision(f,d,product,product.roles[0]).sources[0].key).toBe(reviewKey(s,'h1'));
  });
  it('projects both colors to AA and never treats text spacing defaults as WCAG conformance',()=>{
    const d=defaultDecisions(),s=step();
    let f=lockDecision(emptyFlow(),d,s,'h1',{size:32,c:{light:'#808080',dark:'#808080'}});f=approve(f,d,s,'h1');
    const p=evaluateDecision(f,d,s,'h2');
    expect(decisionChecks(p.values,'h2').every(c=>c.pass)).toBe(true);
    expect(p.checks.map(c=>c.id)).toContain('contrast-light');
  });
});

it('invalidates downstream approvals after a source edit without changing their values; explicit reapproval works',()=>{
  const d=defaultDecisions(),s=step();
  let f=lockDecision(emptyFlow(),d,s,'h1',{size:40,mode:'static'});f=approve(f,d,s,'h1');
  f=synchronizeDecision(f,d,s,'h2');f=approve(f,d,s,'h2');
  const before=resolveAt(decisionsForStep(f,d,s),'html','h2',320).size;
  expect(isReviewed(f,d,s,'h2')).toBe(true);
  f=lockDecision(f,d,s,'h1',{size:48});
  expect(isReviewed(f,d,s,'h2')).toBe(false);
  expect(resolveAt(decisionsForStep(f,d,s),'html','h2',320).size).toBe(before);
  expect(synchronizeDecision(f,d,s,'h2')).toBe(f);
  f=approve(f,d,s,'h1');f=approve(f,d,s,'h2');
  expect(isReviewed(f,d,s,'h2')).toBe(true);
});
it('recomputes unapproved drafts idempotently, retaining their original undo value',()=>{
  const d=defaultDecisions(),s=step();
  let f=synchronizeDecision(emptyFlow(),d,s,'h2');
  f=lockDecision(f,d,s,'h1',{size:40,mode:'static'});f=approve(f,d,s,'h1');
  f=synchronizeDecision(f,d,s,'h2');
  expect(resolveAt(decisionsForStep(f,d,s),'html','h2',320).size).toBe(35);
  expect(synchronizeDecision(f,d,s,'h2')).toBe(f);
  f=undoDecision(f,s,'h2');
  expect(resolveAt(decisionsForStep(f,d,s),'html','h2',320).size).toBe(28);
});
it('blocks manual unsafe approvals in both themes and preserves legacy explicit drafts',()=>{
  const d=defaultDecisions(),s=step();
  const f=lockDecision(emptyFlow(),d,s,'h6',{size:16,c:{light:'#808080',dark:'#808080'}});
  expect(approve(f,d,s,'h6')).toBe(f);
  const old={...emptyFlow(),profiles:{[reviewKey(s,'h1')]:{size:47}}};
  expect(synchronizeDecision(old,d,s,'h1')).toBe(old);
});
it('supports bounded trends, fixed long reading and deterministic evaluation',()=>{
  const d=defaultDecisions();let f=emptyFlow();
  for(const w of [320,360]){const s=step(w);f=lockDecision(f,d,s,'h1',{size:40,mode:'static'});f=approve(f,d,s,'h1');}
  const desktop=FLOW_STEPS.find(s=>s.ctx==='html' && s.family==='desktop' && s.device.w===1920 && s.group==='headings')!;
  const p=evaluateDecision(f,d,desktop,'h1');
  expect(p.evidence).toBe('trend');expect(p.values.size).toBe(40); // Stable human anchors infer no growth.
  expect(evaluateDecision(f,d,desktop,'h1')).toEqual(p);
});

it('round trips audit, manual locks and dependencies and bounds imported provenance',async()=>{
  const {parseFlow}=await import('./model');
  const d=defaultDecisions(),s=step();let f=lockDecision(emptyFlow(),d,s,'h1',{size:40});f=approve(f,d,s,'h1');f=synchronizeDecision(f,d,s,'h2');f=approve(f,d,s,'h2');
  const restored=parseFlow(JSON.parse(JSON.stringify(f)));
  expect(isReviewed(restored,d,s,'h2')).toBe(true);
  expect(restored.engine?.entries[reviewKey(s,'h2')].sources).toHaveLength(1);
  const invalid=parseFlow({...f,engine:{version:999,entries:{}}});
  expect(invalid.engine).toBeUndefined();
  expect(Object.keys(invalid.reviews)).toHaveLength(2);
  const key=reviewKey(s,'h2');
  const malformed=parseFlow({...f,engine:{version:1,entries:{wrong:{},[key]:{...f.engine!.entries[key],sources:[{key,fingerprint:'self',label:'self'}]}}}});
  expect(malformed.engine?.entries[key].sources).toHaveLength(0);
});
it('keeps every generated role in project bounds and both themes within contrast thresholds',()=>{
  const d=defaultDecisions(),f=emptyFlow();
  for(const s of FLOW_STEPS.filter(s=>s.device.w===320 || s.device.w===3840))for(const role of s.roles){
    const prediction=evaluateDecision(f,d,s,role);
    expect(Number.isInteger(prediction.values.size)).toBe(true);
    expect(prediction.values.size).toBeGreaterThanOrEqual(ROLE[role].kind==='long'?18:minSizeFor(role));
    expect(prediction.checks.filter(check=>check.id.startsWith('contrast-')||check.id==='project-minimum'||check.id==='weight-step').every(check=>check.pass)).toBe(true);
    for(const check of prediction.checks.filter(check=>!check.pass && check.blocking!==false))expect(['max-word-width','heading-ratio']).toContain(check.id);
    if(ROLE[role].kind==='long')expect(prediction.values.size).toBe(18);
  }
});

it('undo restores the immediately preceding manual draft after forced recalculation',()=>{
  const d=defaultDecisions(),s=step();let f=synchronizeDecision(emptyFlow(),d,s,'h1');
  f=lockDecision(f,d,s,'h1',{size:39});
  f=synchronizeDecision(f,d,s,'h1','recalculate',true);
  expect(resolveAt(decisionsForStep(f,d,s),'html','h1',320).size).toBe(32);
  f=undoDecision(f,s,'h1');
  expect(resolveAt(decisionsForStep(f,d,s),'html','h1',320).size).toBe(39);
  expect(synchronizeDecision(f,d,s,'h1')).toBe(f);
});
it('undo restores a stale approval and its provenance after explicit recalculation',()=>{
  const d=defaultDecisions(),s=step();let f=lockDecision(emptyFlow(),d,s,'h1',{size:40});f=approve(f,d,s,'h1');
  f=synchronizeDecision(f,d,s,'h2');f=approve(f,d,s,'h2');
  f=lockDecision(f,d,s,'h1',{size:48});f=approve(f,d,s,'h1');
  expect(isReviewed(f,d,s,'h2')).toBe(false);
  f=synchronizeDecision(f,d,s,'h2','recalculate',true);
  expect(resolveAt(decisionsForStep(f,d,s),'html','h2',320).size).toBe(42);
  f=undoDecision(f,s,'h2');
  expect(resolveAt(decisionsForStep(f,d,s),'html','h2',320).size).toBe(35);
  expect(isReviewed(f,d,s,'h2')).toBe(false);
});
it('learns validated live values rather than independently edited imported snapshot fields',async()=>{
  const {parseFlow}=await import('./model');const d=defaultDecisions(),s=step();let f=lockDecision(emptyFlow(),d,s,'h1',{size:40});f=approve(f,d,s,'h1');
  const key=reviewKey(s,'h1');const raw=JSON.parse(JSON.stringify(f));raw.reviews[key].values.size=100;raw.reviews[key].appliedFontSizePx=100;
  const loaded=parseFlow(raw);
  expect(evaluateDecision(loaded,d,s,'h2').values.size).toBe(35);
});
it('projects workflow standard widths into v2 export and free-editor decisions without collapsing TV profiles',async()=>{
  const {projectWorkflowDecisions}=await import('./projection');const {buildExport,importData}=await import('../../core');
  const d=defaultDecisions(),s=step();let f=lockDecision(emptyFlow(),d,s,'h1',{size:40,mode:'static'});f=approve(f,d,s,'h1');
  f=runDecisionEvent(f,d,{type:'recalculate',scope:{ctx:'html',family:'mobile',width:360,group:'headings'},accept:true});
  const tv=FLOW_STEPS.find(s=>s.ctx==='html' && s.family==='tv' && s.device.w===1920)!;f=lockDecision(f,d,tv,'h1',{size:99});
  const projected=projectWorkflowDecisions(f,d);
  expect(resolveAt(projected,'html','h1',320).size).toBe(40);
  expect(resolveAt(projected,'html','h1',360).size).toBe(41);
  expect(resolveAt(projected,'html','h1',1920).size).not.toBe(99);
  const roundtrip=importData(buildExport(projected,'all'),defaultDecisions(),'html').decisions;
  expect(resolveAt(roundtrip,'html','h1',320).size).toBe(40);
  expect(resolveAt(roundtrip,'html','h1',360).size).toBe(41);
  expect(isReviewed(f,projected,s,'h1')).toBe(true);
});

it('does not recurse indefinitely through imported dependency cycles',async()=>{
  const {parseFlow}=await import('./model');const d=defaultDecisions(),s=step();let f=lockDecision(emptyFlow(),d,s,'h1',{size:40});f=approve(f,d,s,'h1');
  f=synchronizeDecision(f,d,s,'h2');f=approve(f,d,s,'h2');
  const raw=JSON.parse(JSON.stringify(f));const a=reviewKey(s,'h1'),b=reviewKey(s,'h2');
  raw.engine.entries[a].state='automatic';raw.engine.entries[a].sources=[{key:b,fingerprint:raw.reviews[b].fingerprint,label:'cycle'}];
  const loaded=parseFlow(raw);expect(isReviewed(loaded,d,s,'h1')).toBe(false);expect(isReviewed(loaded,d,s,'h2')).toBe(false);
});
it('bounds dependency fingerprints across a confirmed multi-viewport chain',()=>{
  const d=defaultDecisions();let f=emptyFlow();
  for(const width of [320,360,375,390,414,430]){
    const s=step(width);
    for(const role of s.roles){f=synchronizeDecision(f,d,s,role);f=approve(f,d,s,role,{reason:'Bu zincir testinde başlık oranı istisnası açıkça kabul edildi.'});}
  }
  expect(Object.keys(f.reviews)).toHaveLength(36);
  for(const review of Object.values(f.reviews))expect(review.fingerprint.length).toBeLessThan(2500);
  expect(isReviewed(f,d,step(430),'h6')).toBe(true);
});

it('reconciles free-editor changes instead of overwriting them on subsequent handoffs',async()=>{
  const {projectWorkflowDecisions,snapshotEditorProjection,reconcileEditorChanges}=await import('./projection');
  const {applyOverrideAt}=await import('../../core');
  const d=defaultDecisions(),s=step();let f=lockDecision(emptyFlow(),d,s,'h1',{size:40});f=approve(f,d,s,'h1');
  const projected=projectWorkflowDecisions(f,d);f={...f,editorBaseline:snapshotEditorProjection(f,projected)};
  const edited=applyOverrideAt(projected,'html','h1',{size:42},320);
  const reconciled=reconcileEditorChanges(f,edited);
  expect(resolveAt(decisionsForStep(reconciled,edited,s),'html','h1',320).size).toBe(42);
  expect(isReviewed(reconciled,edited,s,'h1')).toBe(false);
  expect(resolveAt(projectWorkflowDecisions(reconciled,edited),'html','h1',320).size).toBe(42);
});
it.each(['fluid','endpoints','tiers','relative'] as const)('projects the applied size of %s profiles rather than freezing their stored minimum',async(mode)=>{
  const {projectWorkflowDecisions}=await import('./projection');const {sizeAt}=await import('../../core');
  const d=defaultDecisions(),s=step(430);
  const values={size:24,max:64,mode,em:2,sizes:mode==='tiers'?{mobile:29,tablet:36,laptop:42,desktop:48}:null};
  const f={...emptyFlow(),profiles:{[reviewKey(s,'h1')]:values}};
  const effective=decisionsForStep(f,d,s);const r=resolveAt(effective,'html','h1',430);
  const expected=Math.round(sizeAt(r,d.contexts.html.settings,'h1',430));
  expect(resolveAt(projectWorkflowDecisions(f,d),'html','h1',430).size).toBe(expected);
});

it('evaluates a populated confirmation ledger without mutating it',async()=>{
  const {REVIEW_TARGETS,stepDone}=await import('./model');const d=defaultDecisions();let f=emptyFlow();
  for(const {step,role} of [...REVIEW_TARGETS.values()].slice(0,1000))f=approve(f,d,step,role);
  const before=JSON.stringify(f);const started=performance.now();
  const target=FLOW_STEPS.find(s=>s.ctx==='html' && s.family==='desktop' && s.device.w===1920)!;
  for(let i=0;i<10;i++)expect(evaluateDecision(f,d,target,'h1').checks.every(check=>check.pass)).toBe(true);
  const predictionMs=performance.now()-started;
  const progressStart=performance.now();FLOW_STEPS.filter(s=>stepDone(f,d,s));
  console.info(`ECA evidence: ${Object.keys(f.reviews).length} confirmations; 10 evaluations ${predictionMs.toFixed(1)}ms; progress scan ${(performance.now()-progressStart).toFixed(1)}ms`);
  expect(JSON.stringify(f)).toBe(before);
});
