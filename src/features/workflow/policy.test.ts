import { createElement } from 'react';
import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { PolicyEditor } from './PolicyEditor';
import { theme } from '../../theme/theme';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultDecisions, resolveAt } from '../../core';
import { approve, decisionsForStep, emptyFlow, FLOW_STEPS, reviewKey } from './model';
import { accessibilityChecks, constrainPrediction, inferPolicy, measureTextBrowser, headingRatioCheck, parsePolicies, parsePolicy, resolvePolicy, type PolicyFlow } from './policy';
const decisions = () => defaultDecisions();
const policy = () => resolvePolicy(emptyFlow(), decisions(), 'html');
const role = (id = 'body') => resolveAt(decisions(), 'html', id, 320);
const step = FLOW_STEPS.find(s => s.ctx === 'html' && s.device.w === 320 && s.group === 'headings')!;

describe('validated inherited typography policy', () => {
  it('rejects malformed and nonfinite inputs without coercing them', () => {
    expect(parsePolicy({ headingRatio: 1, growth: '1.4', tracking: NaN, weightStep: 50, backgrounds: { light: [] } })).toEqual({});
    expect(parsePolicies({ bogus: { growth: 1.3 }, html: { growth: 1.4 } })).toEqual({ html: { growth: 1.4 } });
    expect(parsePolicies(null)).toEqual({});
    expect(parsePolicy({ backgrounds: { light: ['#fff'], dark: ['#000'] } })).toEqual({ backgrounds: { light: ['#ffffff'], dark: ['#000000'] } });
  });
  it('inherits HTML, overrides per context and preserves the decisions ratio floor', () => {
    const d = { ...decisions(), ratio: 1.3 };
    const f: PolicyFlow = { ...emptyFlow(), policy: { html: { growth: 1.4, headingRatio: 1.2 }, admin: { tracking: .02 } } };
    const p = resolvePolicy(f, d, 'admin');
    expect(p.growth).toBe(1.4); expect(p.tracking).toBe(.02); expect(p.headingRatio).toBe(1.3);
    expect(resolvePolicy(f, d, 'marketing').tracking).toBe(0);
    p.backgrounds.light.push('#000000'); expect(resolvePolicy(f, d, 'admin').backgrounds.light).not.toContain('#000000');
  });
  it('infers valid human reviews from live values, including human-approved automatic drafts', () => {
    const d = decisions();
    expect(inferPolicy(emptyFlow(), d, 'html')).toBeNull();
    let f = { ...emptyFlow(), profiles: { [reviewKey(step, 'h1')]: { ls: .025, w: 800 } } };
    f = approve(f, d, step, 'h1') as typeof f;
    expect(inferPolicy(f, d, 'html')?.tracking).toBe(.025);
    const key = reviewKey(step, 'h1');
    const tampered = { ...f, reviews: { ...f.reviews, [key]: { ...f.reviews[key], values: { ...f.reviews[key].values, ls: .1 } } } };
    expect(inferPolicy(tampered, d, 'html')?.tracking).toBe(.025);
    expect(inferPolicy({ ...f, profiles: { [key]: { ls: .04 } } }, d, 'html')).toBeNull();
    expect(inferPolicy(f, d, 'admin')).toBeNull();
    const automatic = { ...f, engine: { version: 1 as const, entries: { [key]: { version: 1 as const, state: 'automatic' as const, event: 'step-entered' as const, original: resolveAt(decisionsForStep(f,d,step),'html','h1',320), signature: '', sources: [], trace: [], evidence: 'catalog' as const } } } };
    expect(inferPolicy(automatic, d, 'html')?.tracking).toBe(.025);
  });
});

describe('pure constraints and accessibility diagnostics', () => {
  it('quantizes weights, integer size and allowed leading without mutating input', () => {
    const v = { ...role(), size: 16.4, w: 160, lh: 1.43 };
    const before = structuredClone(v);
    const result = constrainPrediction(v, 'body', 320, policy());
    expect(result.values.size).toBe(16); expect(result.values.w).toBe(300); expect(result.values.lh).toBe(1.5);
    expect(v).toEqual(before); expect(constrainPrediction(result.values,'body',320,policy()).values).toEqual(result.values);
    expect(constrainPrediction({ ...v, w: 999 },'body',320,policy()).values.w).toBe(900);
  });
  it('keeps fixed long reading and inline grayscale links underlined', () => {
    expect(constrainPrediction({ ...role('long'), size: 100 },'long',320,policy()).values.size).toBe(18);
    expect(constrainPrediction({ ...role('link'), td: 'none' },'link',320,policy()).values.td).toBe('underline');
    expect(accessibilityChecks({ ...role('link'), td: 'none' },'link',320,policy()).find(c=>c.id==='link-underline')?.pass).toBe(false);
  });
  it('checks every configured background and projects a safe grayscale when possible', () => {
    const p = { ...policy(), backgrounds: { light: ['#eeeeee','#ffffff'], dark: ['#000000','#222222'] } };
    const result = constrainPrediction({ ...role(), c: { light: '#999999', dark: '#555555' } },'body',320,p);
    expect(result.checks.filter(c=>c.id.startsWith('contrast-')).every(c=>c.pass)).toBe(true);
    const impossible = { ...p, backgrounds: { light: ['#000000','#ffffff'], dark: ['#000000'] } };
    expect(constrainPrediction(role(),'body',320,impossible).checks.find(c=>c.id==='contrast-light')?.blocking).toBe(true);
  });
  it('reports reading clamp and linebox24 as advisories, with stressed word fit blocking', () => {
    const checks = accessibilityChecks({ ...role(), clamp: 2, lh: 1 },'body',320,policy());
    expect(checks.find(c=>c.id==='reading-clamp')).toMatchObject({ pass: false, blocking: false });
    expect(accessibilityChecks({ ...role('button'),size:14,lh:1 },'button',320,policy()).find(c=>c.id==='target-linebox24')).toMatchObject({ pass: false, blocking: false });
    const constrained = constrainPrediction({ ...role('h1'), size: 120 },'h1',160,policy());
    expect(constrained.values.size).toBeLessThan(120);
    expect(accessibilityChecks(role('h1'),'h1',1,policy()).find(c=>c.id==='max-word-width')?.pass).toBe(false);
    expect(accessibilityChecks(role(),'body',NaN,policy()).find(c=>c.id==='viewport-width')?.pass).toBe(false);
  });
});

it('caches inference per immutable flow, decisions and context, without scanning on resolve', () => {
  const d=decisions(), f=approve(emptyFlow(),d,step,'h1');
  let scans=0;
  const observed={...f,get reviews(){scans++;return f.reviews;}};
  resolvePolicy(observed,d,'html'); expect(scans).toBe(0);
  const a=inferPolicy(observed,d,'html'), count=scans;
  expect(a).not.toBeNull();
  expect(inferPolicy(observed,d,'html')).toEqual(a); expect(scans).toBe(count);
  inferPolicy(observed,d,'admin');expect(scans).toBeGreaterThan(count);
  expect(resolvePolicy({...emptyFlow(),policies:{html:{growth:1.5}}},d,'admin').growth).toBe(1.5);
});

afterEach(cleanup);
it('keeps the editor controlled and adopts suggestions only by explicit action', () => {
  const value=policy(),onChange=vi.fn(),onAdopt=vi.fn();
  render(createElement(MantineProvider,{theme},createElement(PolicyEditor,{value,onChange,onAdopt,inferred:{growth:1.4}})));
  expect(onChange).not.toHaveBeenCalled(); expect(onAdopt).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Önerilen politikayı benimse'}));
  expect(onAdopt).toHaveBeenCalledOnce(); expect(onChange).not.toHaveBeenCalled();
  fireEvent.click(screen.getByLabelText('24 px satır kutusunu hedefle'));
  expect(onChange).toHaveBeenLastCalledWith({...value,lineHeightStrategy:'target24'});
  const field=screen.getByLabelText('Açık tema zeminleri');
  fireEvent.change(field,{target:{value:'#ff0000'}});fireEvent.blur(field);
  expect(screen.getByText(/Her zemin geçerli/)).toBeTruthy();
  expect(onChange).toHaveBeenCalledTimes(1);
  fireEvent.change(field,{target:{value:'#fff, #eee'}});fireEvent.blur(field);
  expect(onChange).toHaveBeenLastCalledWith({...value,backgrounds:{...value.backgrounds,light:['#ffffff','#eeeeee']}});
  expect(value.backgrounds.light).not.toEqual(['#ffffff','#eeeeee']);
});
it('keeps optional browser measurements separate and restores canvas state', () => {
  const context={font:'original',measureText:vi.fn(()=>({width:10}))};
  expect(measureTextBrowser('AB',{...role(),ls:.1},context)).toBeCloseTo(11.6);
  expect(context.font).toBe('original');
  const throws={font:'original',measureText:()=>{throw new Error('unavailable');}};
  expect(()=>measureTextBrowser('AB',role(),throws)).toThrow('unavailable');
  expect(throws.font).toBe('original');
  expect(headingRatioCheck(32,28,policy())).toMatchObject({pass:true,blocking:true});
  expect(headingRatioCheck(28,28,policy()).pass).toBe(false);
});

it('preserves real H1 40/44 anchors and distinguishes synthetic spacing stress from actual content', () => {
  for(const size of [32,40,44]){
    const v={...role('h1'),size,mode:'static' as const,max:size};
    expect(accessibilityChecks(v,'h1',320,policy()).find(c=>c.id==='max-word-width')?.pass).toBe(true);
    expect(constrainPrediction(v,'h1',320,policy()).values.size).toBe(size);
  }
  for(const ff of ['sans','mono'] as const) expect(accessibilityChecks({...role('h1'),ff,tt:'uppercase',size:40},'h1',320,policy()).find(c=>c.id==='max-word-width')?.pass).toBe(true);
  const unsafe={...role('h1'),size:120};
  expect(accessibilityChecks(unsafe,'h1',320,policy()).find(c=>c.id==='max-word-width')?.pass).toBe(false);
  const stress=accessibilityChecks({...role('h1'),size:44},'h1',320,policy()).find(c=>c.id==='synthetic-word-stress');
  expect(stress).toMatchObject({pass:false,blocking:false});
});
