import { expect, it } from 'vitest';
import { applyOverrideAt, defaultDecisions, rolesOf } from '../../core';
import { FLOW_STEPS, approve, canApproveDecision, emptyFlow, isReviewed, parseFlow, reviewKey } from './model';
it('orders HTML, mobile widths, groups, other devices, then products; covers every role once', () => {
  expect(FLOW_STEPS[0].key).toBe('html:mobile:320:headings');
  expect(FLOW_STEPS[1].key).toBe('html:mobile:320:subtitle');
  expect([...new Set(FLOW_STEPS.filter((s) => s.ctx === 'html' && s.family === 'mobile').map((s) => s.device.w))]).toEqual([320,360,375,390,414,430]);
  expect(FLOW_STEPS.find((s) => s.family === 'tv')?.ctx).toBe('html');
  for (const ctx of ['html','admin','marketing','ecommerce','bi','ai'] as const) {
    const all = FLOW_STEPS.filter((s) => s.ctx === ctx && s.device.w === 320).flatMap((s) => s.roles);
    expect(new Set(all).size).toBe(rolesOf(ctx).length);
    expect(all.length).toBe(rolesOf(ctx).length);
  }
});
it('records snapshots, persists progress and invalidates inherited or edited decisions', () => {
  const s = FLOW_STEPS[0]; const d = applyOverrideAt(defaultDecisions(),'html','h1',{lh:1.25},320);
  const f = approve(emptyFlow(), d, s, 'h1');
  expect(isReviewed(f,d,s,'h1')).toBe(true);
  expect(isReviewed(parseFlow(JSON.parse(JSON.stringify(f))),d,s,'h1')).toBe(true);
  const changed = applyOverrideAt(d,'html','h1',{size:36},320);
  expect(isReviewed(f,changed,s,'h1')).toBe(false);
  expect(f.reviews[reviewKey(s,'h1')].values.size).toBe(32);
});
it('inherits matching HTML TV profiles into products and keeps monitor decisions separate', async () => {
  const { decisionsForStep, reviewKey, isReviewed, approve } = await import('./model');
  const base = FLOW_STEPS.find((s)=>s.ctx==='html' && s.family==='tv' && s.device.w===1920)!;
  const product = FLOW_STEPS.find((s)=>s.ctx==='admin' && s.family==='tv' && s.device.w===1920)!;
  const monitor = FLOW_STEPS.find((s)=>s.ctx==='admin' && s.family==='desktop' && s.device.w===1920)!;
  const d=defaultDecisions();
  const f={...emptyFlow(),profiles:{[reviewKey(base,'h1')]:{size:60,mode:'static' as const}}};
  const { resolveAt }=await import('../../core');
  expect(resolveAt(decisionsForStep(f,d,product),'admin','h1',1920).size).toBe(60);
  expect(resolveAt(decisionsForStep(f,d,monitor),'admin','h1',1920).size).toBe(40);
  const reviewed=approve(f,d,product,'h1');
  expect(isReviewed(reviewed,d,product,'h1')).toBe(true);
  expect(isReviewed({...reviewed,profiles:{[reviewKey(base,'h1')]:{size:64,mode:'static'}}},d,product,'h1')).toBe(false);
});

it('bounds review metadata and sanitizes imported partial profiles', () => {
  const d = applyOverrideAt(defaultDecisions(),'html','h1',{lh:1.25},320), s = FLOW_STEPS[0], key = reviewKey(s, 'h1');
  const f = approve(emptyFlow(), d, s, 'h1');
  const loaded = parseFlow({ ...f, profiles: { [key]: { size: 9999, arbitrary: 'discard' } }, reviews: { [key]: { ...f.reviews[key], fingerprint: 'x'.repeat(20000), at: 'x'.repeat(500) } } });
  expect(loaded.reviews[key]).toBeUndefined();
  expect(loaded.profiles?.[key]).toEqual({ size: 120 });
  expect(parseFlow({ ...f, profiles: { [key]: [] } }).profiles?.[key]).toBeUndefined();
});

it('reports manual, draft, human approval and stale review independently', async () => {
  const { decisionStatus } = await import('./model');
  const { lockDecision, synchronizeDecision } = await import('./engine');
  const d = applyOverrideAt(defaultDecisions(),'html','h1',{lh:1.25},320), s = FLOW_STEPS[0];
  expect(decisionStatus(emptyFlow(), d, s, 'h1')).toBe('draft');
  const draft = synchronizeDecision(emptyFlow(), d, s, 'h1');
  expect(decisionStatus(draft, d, s, 'h1')).toBe('draft');
  const manual = lockDecision(draft, d, s, 'h1', { size: 32, lh:1.25 });
  expect(decisionStatus(manual, d, s, 'h1')).toBe('manual');
  const reviewed = approve(manual, d, s, 'h1');
  expect(decisionStatus(reviewed, d, s, 'h1')).toBe('approved');
  const edited = lockDecision(reviewed, d, s, 'h1', { size: 42 });
  expect(decisionStatus(edited, d, s, 'h1')).toBe('manual');
  const key = reviewKey(s, 'h1');
  expect(decisionStatus({ ...reviewed, engine: undefined, profiles: { [key]: { size: 42 } } }, d, s, 'h1')).toBe('stale');
});

it('requires a substantive reason for ratio/link exceptions and never waives contrast', async () => {
  const { lockDecision } = await import('./engine');
  const { approve: accept, reviewKey: key } = await import('./model');
  const d = applyOverrideAt(defaultDecisions(),'html','h1',{lh:1.25},320), s = FLOW_STEPS[0];
  let f = lockDecision(emptyFlow(), d, s, 'h1', { size: 32, lh:1.25 });
  f = accept(f, d, s, 'h1');
  f = lockDecision(f, d, s, 'h2', { size: 32, lh:1.25 });
  expect(canApproveDecision(f,d,s,'h2')).toBe(false);
  expect(canApproveDecision(f,d,s,'h2',{reason:'Intentional equal headings'})).toBe(true);
  expect(accept(f, d, s, 'h2')).toBe(f);
  expect(accept(f, d, s, 'h2', { reason: 'short' })).toBe(f);
  const approved = accept(f, d, s, 'h2', { reason: 'Intentional equal headings' });
  expect(approved.reviews[key(s, 'h2')].reason).toBe('Intentional equal headings');
  expect(isReviewed(approved,d,s,'h2')).toBe(true);
  expect(isReviewed(approved,d,s,'h1')).toBe(true);
  expect(parseFlow(JSON.parse(JSON.stringify(approved))).reviews[key(s, 'h2')].reason).toBe('Intentional equal headings');
  const links = FLOW_STEPS.find(step => step.ctx === 'html' && step.device.w === 320 && step.roles.includes('link'))!;
  const link = lockDecision(emptyFlow(), d, links, 'link', { td: 'none' });
  expect(accept(link,d,links,'link')).toBe(link);
  expect(accept(link,d,links,'link',{ reason: 'Separate navigation link' }).reviews[key(links,'link')]).toBeDefined();
  const bad = lockDecision(f,d,s,'h2',{ c: { light: '#ffffff', dark: '#000000' } });
  expect(canApproveDecision(bad,d,s,'h2',{ reason: 'Cannot waive contrast' })).toBe(false);
  expect(accept(bad,d,s,'h2',{ reason: 'Cannot waive contrast' })).toBe(bad);
  const oversized=lockDecision(emptyFlow(),d,s,'h1',{size:120,lh:1.25});
  expect(canApproveDecision(oversized,d,s,'h1')).toBe(false);
  const at=new Date('2026-10-21T12:00:00Z');
  expect(accept(f,d,s,'h2',at,{reason:'Intentional equal headings'}).reviews[key(s,'h2')].at).toBe(at.toISOString());
});

it('parses per-context policies and invalidates approval when nonwaivable policy changes', () => {
  const d = applyOverrideAt(defaultDecisions(),'html','h1',{lh:1.25},320), s=FLOW_STEPS[0];
  const f=approve(emptyFlow(),d,s,'h1');
  const loaded=parseFlow({...f,policies:{html:{growth:1.4},bogus:{growth:1.2}}});
  expect(loaded.policies).toEqual({html:{growth:1.4}});
  expect(isReviewed({...f,policies:{html:{backgrounds:{light:['#000000'],dark:['#ffffff']}}}},d,s,'h1')).toBe(false);
});
