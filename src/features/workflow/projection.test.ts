import { expect, it } from 'vitest';
import { defaultDecisions, resolveAt } from '../../core';
import { lockDecision, synchronizeDecision } from './engine';
import { FLOW_STEPS, approve, emptyFlow, isReviewed, reviewKey, type FlowState } from './model';
import { projectWorkflowDecisions, snapshotEditorProjection } from './projection';

const step = (width: number, family = 'desktop') => FLOW_STEPS.find(s => s.ctx === 'html' && s.family === family && s.device.w === width && s.group === 'headings')!;

it('represents all desktop widths and projects by family and width while isolating TV', () => {
  const d = defaultDecisions();
  let f = emptyFlow();
  for (const [i, width] of [1920, 2048, 2560, 3440, 3840].entries()) {
    const s = step(width);
    expect(s, `desktop ${width}`).toBeDefined();
    f = lockDecision(f, d, s, 'h1', { size: 50 + i, mode: 'static' });
    f = lockDecision(f, d, step(width === 2048 ? 1920 : width, 'tv'), 'h1', { size: 99 });
  }
  const projected = projectWorkflowDecisions(f, d);
  for (const [i, width] of [1920, 2048, 2560, 3440, 3840].entries()) {
    if(width===2048)continue; // v2 has no 2048 breakpoint; keep this profile isolated.
    expect(resolveAt(projected, 'html', 'h1', width).size).toBe(50 + i);
    expect(snapshotEditorProjection(f, projected)).toHaveProperty(reviewKey(step(width), 'h1'));
  }
  expect(Object.keys(snapshotEditorProjection(f, projected)).some(key => key.includes(':tv:'))).toBe(false);
});

it('excludes automatic drafts from both projection and editor handoff', () => {
  const d = defaultDecisions(), s = step(320, 'mobile');
  const f = synchronizeDecision(emptyFlow(), d, s, 'h1');
  expect(projectWorkflowDecisions(f, d)).toEqual(d);
  expect(snapshotEditorProjection(f, d)).toEqual({});
});

it('projects reviewed legacy drafts and manual profiles but excludes undone drafts', () => {
  const d = defaultDecisions(), s = step(320, 'mobile');
  let f = synchronizeDecision(emptyFlow(), d, s, 'h1');
  f = { ...f, profiles: { ...f.profiles, [reviewKey(s,'h1')]: { ...f.profiles?.[reviewKey(s,'h1')], lh:1.25 } } };
  f = approve(f, d, s, 'h1');
  expect(isReviewed(f,d,s,'h1')).toBe(true);
  expect(snapshotEditorProjection(f, projectWorkflowDecisions(f, d))).toHaveProperty(reviewKey(s, 'h1'));
  const key = reviewKey(s, 'h1');
  const undone: FlowState = { ...f, reviews: {}, engine: { version: 1, entries: { [key]: { ...f.engine!.entries[key], state: 'undone' } } } };
  expect(projectWorkflowDecisions(undone, d)).toEqual(d);
  expect(snapshotEditorProjection(undone, d)).toEqual({});
});

it('does not leak an excluded HTML draft through an accepted product profile', () => {
  const d = defaultDecisions(), s = step(320, 'mobile');
  let f = synchronizeDecision(emptyFlow(), d, s, 'h1');
  f = { ...f, profiles: { ...f.profiles, [reviewKey(s, 'h1')]: { size: 99, mode: 'static' } } };
  const product = FLOW_STEPS.find(s => s.ctx === 'admin' && s.device.w === 320 && s.group === 'headings')!;
  f = { ...f, profiles: { ...f.profiles, [reviewKey(product, 'h1')]: { w: 700 } } };
  expect(resolveAt(projectWorkflowDecisions(f, d), 'admin', 'h1', 320).size).toBe(32);
});

it('projects accepted auto while skipping stale auto sources, stale and conflict entries', () => {
  const d = defaultDecisions(), source = step(320,'mobile'), target = step(360,'mobile');
  let f = lockDecision(emptyFlow(),d,source,'h1',{size:32,lh:1.25});
  f = approve(f,d,source,'h1');
  f = synchronizeDecision(f,d,target,'h1');
  const key=reviewKey(target,'h1'), entry=f.engine!.entries[key];
  f={...f,engine:{version:1,entries:{...f.engine!.entries,[key]:{...entry,state:'auto'}}}};
  const accepted=projectWorkflowDecisions(f,d);
  expect(snapshotEditorProjection(f,accepted)).toHaveProperty(key);
  for(const state of ['stale','conflict'] as const){
    const blocked={...f,engine:{version:1 as const,entries:{...f.engine!.entries,[key]:{...entry,state}}}};
    expect(snapshotEditorProjection(blocked,projectWorkflowDecisions(blocked,d))).not.toHaveProperty(key);
  }
  const changed=lockDecision(f,d,source,'h1',{size:30});
  expect(snapshotEditorProjection(changed,projectWorkflowDecisions(changed,d))).not.toHaveProperty(key);
});
