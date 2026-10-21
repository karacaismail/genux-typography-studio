import { Buffer } from 'node:buffer';
import { expect, it } from 'vitest';
import { BREAKPOINTS, CONTEXTS, buildExport, defaultDecisions, importData, resolveAt, rolesOf } from '../../core';
import { evaluateDecision } from './engine';
import { FLOW_STEPS, REVIEW_TARGETS, WORKFLOW_DEVICES, isReviewed, parseFlow, stepDone } from './model';
import { createFullLedger } from '../../test/workflowLedger';
import { createDebouncedWriter } from './persistence';
import { projectWorkflowDecisions } from './projection';

const at = new Date('2026-10-21T12:00:00.000Z');
const elapsed = <T>(action: () => T) => {
  const start = performance.now();
  const value = action();
  return { value, ms: performance.now() - start };
};
const bytes = (text: string) => Buffer.byteLength(text, 'utf8');

it('round trips and measures the genuine complete approval registry without quadratic approve loops', async () => {
  const d = defaultDecisions();
  const constructed = elapsed(() => createFullLedger(d));
  const f = constructed.value;
  const keys = [...REVIEW_TARGETS.keys()];
  const expected = CONTEXTS.reduce((n, ctx) => n + rolesOf(ctx.id).length * WORKFLOW_DEVICES.length, 0);
  expect(keys).toHaveLength(expected);
  expect(keys.length).toBeGreaterThan(10972); // Historical audit size; current registry is authoritative.
  expect(Object.keys(f.reviews)).toEqual(keys);
  expect(Object.keys(f.profiles!)).toEqual(keys);

  // Full-size persisted record: includes every stable review/profile key and device ID.
  const record = { flow: f, decisions: d, notes: { [keys[0]]: 'Tam kayıt / Türkiye / ıİşğ' }, devices: WORKFLOW_DEVICES.map(({device, family}) => ({ ...device, family })) };
  const serialized = elapsed(() => JSON.stringify(record));
  const decoded = elapsed(() => JSON.parse(serialized.value) as typeof record);
  const parsed = elapsed(() => parseFlow(decoded.value.flow));
  const restored = parsed.value;
  expect(Object.keys(restored.reviews)).toEqual(keys);
  expect(Object.keys(restored.profiles!)).toEqual(keys);
  expect(decoded.value.devices).toEqual(record.devices);
  expect(decoded.value.notes).toEqual(record.notes);
  expect(restored.cursor).toBe(f.cursor);

  // Cold progress scan validates all roles, not just the ledger's object count.
  const progress = elapsed(() => FLOW_STEPS.filter(step => stepDone(restored, d, step)));
  expect(progress.value).toHaveLength(FLOW_STEPS.length);
  for (const [index, {step, role}] of [...REVIEW_TARGETS.values()].entries()) {
    if (index % 337 === 0 || index === keys.length - 1) expect(isReviewed(restored, d, step, role)).toBe(true);
  }

  const target = FLOW_STEPS.find(step => step.ctx === 'ai' && step.family === 'desktop' && step.device.w === 3840 && step.group === 'headings')!;
  const before = JSON.stringify(restored);
  const evaluation = elapsed(() => Array.from({length: 10}, () => evaluateDecision(restored, d, target, 'h1')));
  for (const prediction of evaluation.value) expect(prediction).toEqual(evaluation.value[0]);
  expect(evaluation.value[0].sources.length).toBeGreaterThan(0);
  expect(JSON.stringify(restored)).toBe(before);

  const projected = elapsed(() => projectWorkflowDecisions(restored, d));
  const exported = elapsed(() => ({ ...buildExport(projected.value, 'all', {now: at}), workflow: restored }));
  const exportSerialized = elapsed(() => JSON.stringify(exported.value));
  const imported = elapsed(() => {
    const raw = JSON.parse(exportSerialized.value) as typeof exported.value;
    return { flow: parseFlow(raw.workflow), decisions: importData(raw, d, 'html').decisions };
  });
  expect(Object.keys(imported.value.flow.reviews)).toEqual(keys);
  expect(Object.keys(imported.value.flow.profiles!)).toEqual(keys);
  for (const ctx of CONTEXTS) {
    for (const width of BREAKPOINTS) {
      expect(resolveAt(imported.value.decisions, ctx.id, 'h1', width).size).toBe(resolveAt(projected.value, ctx.id, 'h1', width).size);
    }
  }
  expect(FLOW_STEPS.every(step => stepDone(imported.value.flow, imported.value.decisions, step))).toBe(true);

  // Measure the actual coalescing writer's payload; this is an in-memory sink, not IndexedDB I/O.
  let written = '';
  const writer = createDebouncedWriter<typeof record>(async value => { written = JSON.stringify(value); }, error => { throw error; });
  const writeStart = performance.now();
  await writer.flush(record);
  const writeMs = performance.now() - writeStart;
  expect(written).toBe(serialized.value);
  console.info('Full-ledger evidence', JSON.stringify({
    targets: keys.length, groups: FLOW_STEPS.length, historicalAuditTargets: 10972,
    validReviews: Object.keys(restored.reviews).length,
    recordBytes: bytes(serialized.value), flowBytes: bytes(before), exportBytes: bytes(exportSerialized.value), writePayloadBytes: bytes(written),
    buildMs: constructed.ms, serializeMs: serialized.ms, jsonReadMs: decoded.ms, parseFlowMs: parsed.ms,
    coldProgressMs: progress.ms, evaluate10Ms: evaluation.ms, projectionMs: projected.ms,
    exportMs: exported.ms, exportSerializeMs: exportSerialized.ms, importMs: imported.ms, inMemoryWriterFlushMs: writeMs,
    indexedDBIO: 'not_run', performanceThreshold: 'none',
  }));
}, 60000);
