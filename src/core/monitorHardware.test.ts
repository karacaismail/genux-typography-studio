import { expect, it } from 'vitest';
import { DEVICES } from './constants';
import { WORKFLOW_DEVICES } from '../features/workflow/model';
import { MONITOR_HARDWARE, MONITOR_PROFILES, monitorHardware, monitorProfile } from './monitorHardware';

it('preserves every existing desktop editor/workflow ID and exact CSS viewport independently', () => {
  const editor = DEVICES.filter(device => device.group === 'desktop');
  const workflow = WORKFLOW_DEVICES.filter(item => item.family === 'desktop').map(item => item.device);
  const ids = new Set([...editor, ...workflow].map(device => device.id));
  expect([...MONITOR_PROFILES.map(profile => profile.id)].sort()).toEqual([...ids].sort());
  expect(new Set(MONITOR_PROFILES.map(profile => profile.id)).size).toBe(MONITOR_PROFILES.length);
  for (const device of [...editor, ...workflow]) {
    const profile = monitorProfile(device.id, 'desktop');
    expect(profile, device.id).toBeDefined();
    expect(profile!.id).toBe(device.id);
    expect(profile!.family).toBe('desktop');
    expect([profile!.width, profile!.height]).toEqual([device.w, device.h]);
  }
});

it('never infers monitor hardware for TV IDs or another device family at the same width', () => {
  for (const item of WORKFLOW_DEVICES.filter(item => item.family === 'tv')) {
    expect(monitorProfile(item.device.id)).toBeUndefined();
    expect(monitorProfile(item.device.id, 'tv')).toBeUndefined();
  }
  for (const profile of MONITOR_PROFILES) {
    expect(monitorProfile(profile.id, 'tv')).toBeUndefined();
    expect(monitorProfile(profile.id, 'laptop')).toBeUndefined();
  }
  for (const id of ['1920','monitor1920','desktop','__proto__','unknown']) expect(monitorProfile(id)).toBeUndefined();
  expect(monitorHardware('unknown')).toBeUndefined();
});

it('keeps published physical head, active panel and whole-product stand dimensions separate', () => {
  expect(new Set(MONITOR_HARDWARE.map(hardware => hardware.model)).size).toBe(MONITOR_HARDWARE.length);
  for (const hardware of MONITOR_HARDWARE) {
    const { headMm, panel, withStandMm, source } = hardware;
    for (const value of [...Object.values(headMm), ...Object.values(panel.activeMm), ...Object.values(withStandMm)]) {
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThan(0);
    }
    expect(headMm.width).toBeGreaterThan(panel.activeMm.width);
    expect(headMm.height).toBeGreaterThan(panel.activeMm.height);
    expect(withStandMm.minHeight).toBeGreaterThan(headMm.height);
    expect(withStandMm.maxHeight).toBeGreaterThan(withStandMm.minHeight);
    expect(withStandMm.depth).toBeGreaterThan(headMm.depth);
    expect(Number.isInteger(panel.width)).toBe(true);
    expect(Number.isInteger(panel.height)).toBe(true);
    // Published active millimetres are rounded; native pixel and active-area aspect should agree.
    expect(panel.activeMm.width / panel.activeMm.height).toBeCloseTo(panel.width / panel.height, 3);
    const url = new URL(source.url);
    expect(url.protocol).toBe('https:');
    expect(['www.dell.com','www.delltechnologies.com','i.dell.com']).toContain(url.hostname);
    expect(source.section.length).toBeGreaterThan(20);
    expect(source.checked).toBe('2026-10-22');
  }
  expect(new Set(MONITOR_PROFILES.map(profile => profile.model))).toEqual(new Set(MONITOR_HARDWARE.map(hardware => hardware.model)));
});

it('maps native FHD, QHD, ultrawide and 4K viewports to matching native panels without changing workflow aliases', () => {
  const nativeIds = ['l1920','d2560','monitor2560','d3440','d3840','monitor3840'];
  for (const id of nativeIds) {
    const profile = monitorProfile(id)!;
    const hardware = monitorHardware(profile.model)!;
    expect(profile.mapping.kind).toBe('native');
    expect([profile.width, profile.height]).toEqual([hardware.panel.width, hardware.panel.height]);
  }
  expect(monitorProfile('d2560')!.model).toBe(monitorProfile('monitor2560')!.model);
  expect(monitorProfile('d3840')!.model).toBe(monitorProfile('monitor3840')!.model);
  expect(monitorHardware(monitorProfile('d3440')!.model)!.panel.curvatureRadiusMm).toBe(1900);
  for (const hardware of MONITOR_HARDWARE.filter(hardware => hardware.model !== 'dell-u3425we')) expect(hardware.panel.curvatureRadiusMm).toBeNull();
});

it('labels 2048 as an illustrative logical scale instead of inventing a native 2048 monitor or DPR guarantee', () => {
  const profile = monitorProfile('monitor2048')!;
  const hardware = monitorHardware(profile.model)!;
  expect(profile.mapping.kind).toBe('illustrative-scale');
  if (profile.mapping.kind !== 'illustrative-scale') throw new Error('2048 mapping must remain explicit');
  expect(profile.mapping.nativePixelsPerCssPixel).toBe(3);
  expect(profile.width * profile.mapping.nativePixelsPerCssPixel).toBe(hardware.panel.width);
  expect(profile.height * profile.mapping.nativePixelsPerCssPixel).toBe(hardware.panel.height);
  expect(hardware.panel.width).not.toBe(profile.width);
  expect(profile.mapping.note).toContain('no OS/DPR claim');
});

it('corrects workflow ultrawide height while keeping its ID, width and decision keys', async () => {
  const { FLOW_STEPS, reviewKey } = await import('../features/workflow/model');
  const editor = monitorProfile('d3440')!;
  const workflow = monitorProfile('monitor3440')!;
  expect(editor.model).toBe(workflow.model);
  expect([editor.width, editor.height]).toEqual([3440,1440]);
  expect([workflow.width, workflow.height]).toEqual([3440,1440]);
  expect(workflow.mapping.kind).toBe('native');
  const step = FLOW_STEPS.find(step=>step.ctx==='html' && step.device.id==='monitor3440' && step.roles.includes('h1'))!;
  expect(step.key).toBe('html:desktop:3440:headings');
  expect(reviewKey(step,'h1')).toBe('html:desktop:3440:h1');
});

it('integrates named monitor geometry using active panel millimetres and reserves only the stand extension', async () => {
  const { hardwareModel, phoneGeometry } = await import('./hardware');
  for (const profile of MONITOR_PROFILES) {
    const model = hardwareModel(profile.id);
    expect(model, profile.id).toBeDefined();
    const source = monitorHardware(profile.model)!;
    const shape = phoneGeometry(model!);
    const scale = profile.width / source.panel.activeMm.width;
    expect(shape.bodyWidth).toBeCloseTo(source.headMm.width * scale, 6);
    expect(shape.bodyHeight).toBeCloseTo(source.headMm.height * scale, 6);
    expect(shape.bodyHeight + shape.base).toBeCloseTo(source.withStandMm.maxHeight * scale, 6);
    expect(shape.base).toBeCloseTo((source.withStandMm.maxHeight - source.headMm.height) * scale, 6);
    expect(profile.width + 2 * shape.x).toBeCloseTo(shape.bodyWidth, 6);
    expect(profile.height + shape.top + shape.bottom).toBeCloseTo(shape.bodyHeight, 6);
    expect(shape.top).toBeGreaterThan(0);
    expect(shape.bottom).toBeGreaterThan(0);
    expect(shape.wide).toBe(0);
  }
  expect(hardwareModel('monitor2048')?.camera).toBeDefined();
  for (const id of ['l1920','d2560','monitor2560','d3440','monitor3440','d3840','monitor3840']) expect(hardwareModel(id)?.camera).toBeUndefined();
  for (const width of [1920,2560,3440,3840]) expect(hardwareModel(`tv${width}`)?.monitor).toBeUndefined();
});
