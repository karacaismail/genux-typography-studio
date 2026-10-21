import { expect, it } from 'vitest';
import { CONTEXTS, RECOMMENDED_LINE_HEIGHTS, ROLE, contrastInfo, defaultDecisions, minSizeFor, resolveAt, type ContextId, type RoleProps } from '../../core';
import { evaluateDecision, lockDecision, synchronizeDecision } from './engine';
import { FLOW_STEPS, REVIEW_TARGETS, approve, decisionsForStep, emptyFlow, isReviewed, reviewKey, type FlowState } from './model';
import { resolvePolicy } from './policy';
import { matchesDependency } from './engineState';
import { runDecisionEvent } from './propagation';

// Replayable property cases; no extra dependency, random global state, or timing assertions.
function generator(seed: number) {
  let value = seed >>> 0;
  return (min: number, max: number) => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return min + value % (max - min + 1);
  };
}
const target = (ctx: ContextId, width: number) => FLOW_STEPS.find(step => step.ctx === ctx && step.device.w === width && step.family === (width < 600 ? 'mobile' : 'desktop') && step.group === 'headings')!;
const fixedDate = new Date('2026-10-21T12:00:00.000Z');

function checkValues(values: RoleProps, role: string) {
  expect(Number.isInteger(values.size)).toBe(true);
  expect(values.size).toBeGreaterThanOrEqual(minSizeFor(role));
  expect(values.w).toBeGreaterThanOrEqual(300);
  expect(values.w).toBeLessThanOrEqual(900);
  expect(values.w % 100).toBe(0);
  expect(RECOMMENDED_LINE_HEIGHTS).toContain(values.lh);
  expect(Number.isFinite(values.ls)).toBe(true);
  expect(values.mode).toBe('static');
  if (ROLE[role].kind === 'long') expect(values.size).toBe(18);
  for (const theme of ['light','dark'] as const) {
    expect(contrastInfo(values, role, theme).pass).toBe(true);
    expect(values.c[theme]).toMatch(/^#([\da-f]{2})\1\1$/i);
  }
}

it('learns seeded randomized live human anchors deterministically and preserves human decisions', () => {
  const random = generator(0xeca2026);
  let predictions = 0, anchors = 0, conflicts = 0;
  for (let trial = 0; trial < 24; trial++) {
    const ctx = CONTEXTS[trial % CONTEXTS.length].id;
    const d = { ...defaultDecisions(), ratio: [1.125, 1.2, 1.333][random(0,2)] };
    let f: FlowState = emptyFlow();
    for (const width of [320,360,430]) {
      const s = target(ctx,width);
      f = lockDecision(f,d,s,'h1', {
        size: random(32,44), w: random(3,9)*100, lh: 1.25, mode: 'static', gr: 1,
        ls: random(-2,2)/100, ff: 'sans', tt: 'none',
        ta: ['start','center','end'][random(0,2)] as RoleProps['ta'],
        c: {light:'#000000',dark:'#ffffff'},
      });
      f = approve(f,d,s,'h1',fixedDate);
      expect(isReviewed(f,d,s,'h1'), `trial=${trial}, width=${width}`).toBe(true);
      anchors++;
    }
    const saved = structuredClone(f);
    const s = target(ctx,430);
    for (const id of ['h1','h2','h3','h4','h5','h6']) {
      const prediction = evaluateDecision(f,d,s,id,'recalculate');
      expect(evaluateDecision(f,d,s,id,'recalculate')).toEqual(prediction);
      expect(prediction.sources.length).toBeGreaterThan(0);
      checkValues(prediction.values,id);
      for (const source of prediction.sources) {
        const item = REVIEW_TARGETS.get(source.key)!;
        expect(item.step.device.w).toBeLessThanOrEqual(s.device.w);
        expect(matchesDependency(f.reviews[source.key].fingerprint,source.fingerprint)).toBe(true);
        expect(isReviewed(f,d,item.step,item.role)).toBe(true);
      }
      if (id !== 'h1') {
        const upper = resolveAt(decisionsForStep(f,d,s),ctx,'h1',s.device.w).size;
        const need = resolvePolicy(f,d,ctx).headingRatio ** (Number(id.slice(1))-1);
        const obeys = upper / prediction.values.size + 1e-9 >= need;
        const conflict = prediction.checks.some(check => check.id === 'heading-ratio' && !check.pass && check.blocking !== false);
        expect(obeys || conflict, `trial=${trial}, ${id}, ratio=${d.ratio}`).toBe(true);
        if (conflict) conflicts++;
      }
      predictions++;
    }
    const humanKey = reviewKey(s,'h1');
    expect(synchronizeDecision(f,d,s,'h1','recalculate',true)).toBe(f);
    const propagated = runDecisionEvent(f,d,{type:'recalculate',scope:{ctx,family:'mobile',width:430,group:'headings'},accept:true});
    expect(propagated.reviews).toEqual(saved.reviews);
    expect(propagated.profiles?.[humanKey]).toEqual(saved.profiles?.[humanKey]);
    expect(f).toEqual(saved);
  }
  console.info('Seeded ECA properties', JSON.stringify({seed:'0xeca2026',trials:24,anchors,predictions,ratioConflicts:conflicts}));
});

it('ignores randomized tampered review snapshots as learning values and rejects stale live sources', () => {
  const random = generator(0x59c839f);
  for (let trial=0; trial<12; trial++) {
    const d=defaultDecisions(), s=target('html',320), destination=target('html',360);
    let f=lockDecision(emptyFlow(),d,s,'h1',{size:random(32,44),lh:1.25,c:{light:'#000000',dark:'#ffffff'}});
    f=approve(f,d,s,'h1',fixedDate);
    expect(isReviewed(f,d,s,'h1')).toBe(true);
    const expected=evaluateDecision(f,d,destination,'h1');
    expect(expected.sources.length).toBeGreaterThan(0);
    const key=reviewKey(s,'h1');
    // Deliberately corrupt snapshot fields only. The valid source remains its live profile + fingerprint.
    const tampered:FlowState={...f,reviews:{...f.reviews,[key]:{...f.reviews[key],appliedFontSizePx:random(90,120),values:{...f.reviews[key].values,size:random(90,120),w:100,ta:'end'}}}};
    expect(evaluateDecision(tampered,d,destination,'h1')).toEqual(expected);
    const changed=lockDecision(tampered,d,s,'h1',{size:24});
    expect(isReviewed(changed,d,s,'h1')).toBe(false);
    expect(evaluateDecision(changed,d,destination,'h1').sources.some(source=>source.key===key)).toBe(false);
  }
});
