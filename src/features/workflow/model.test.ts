import { expect, it } from 'vitest';
import { applyOverrideAt, defaultDecisions, rolesOf } from '../../core';
import { FLOW_STEPS, approve, emptyFlow, isReviewed, parseFlow, reviewKey } from './model';
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
  const s = FLOW_STEPS[0]; const d = defaultDecisions();
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
