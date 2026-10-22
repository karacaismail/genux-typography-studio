import { expect, it } from 'vitest';
import { hardwareModel, phoneGeometry } from './hardware';
import { monitorProfile } from './monitorHardware';
import { FLOW_STEPS, WORKFLOW_DEVICES, reviewKey } from '../features/workflow/model';

const viewports = [[1280,720],[1920,1080],[2560,1440],[3440,1935],[3840,2160]] as const;
it('resolves each exact TV ID to real hardware without borrowing the same-width monitor', () => {
  for(const [width,height] of viewports){
    const id=`tv${width}`, model=hardwareModel(id);
    expect(model,id).toBeDefined();
    expect(model!.profile).toBe('tv');
    expect([model!.width,model!.height]).toEqual([width,height]);
    expect(model!.camera).toBeUndefined();
    expect(monitorProfile(id)).toBeUndefined();
    const step=FLOW_STEPS.find(s=>s.ctx==='html' && s.device.id===id && s.roles.includes('h1'))!;
    expect(reviewKey(step,'h1')).toBe(`html:tv:${width}:h1`);
    expect(step.device.h).toBe(height);
  }
  expect(WORKFLOW_DEVICES.filter(item=>item.family==='tv').map(item=>item.device.id)).toEqual(viewports.map(([width])=>`tv${width}`));
  for(const id of ['tv','tv1440','tv02560','TV1920']) expect(hardwareModel(id)).toBeUndefined();
});

it('uses a positive physical head and stand extension rather than the generic 32px TV feet', () => {
  for(const [width] of viewports){
    const model=hardwareModel(`tv${width}`);
    expect(model).toBeDefined();
    const shape=phoneGeometry(model!);
    expect(shape.bodyHeight/shape.bodyWidth).toBeCloseTo(model!.bodyMm.height/model!.bodyMm.width,6);
    expect(shape.x).toBeGreaterThan(0);expect(shape.top).toBeGreaterThan(0);expect(shape.bottom).toBeGreaterThan(0);
    expect(shape.base).toBeGreaterThan(0);expect(shape.base).not.toBe(32);
    expect(shape.wide).toBe(0);
    expect(model!.width+2*shape.x).toBeCloseTo(shape.bodyWidth,6);
    expect(model!.height+shape.top+shape.bottom).toBeCloseTo(shape.bodyHeight,6);
  }
});

it('separates sourced stand/body dimensions from nominal screen and optical estimates', async () => {
  const {TV_HARDWARE,TV_PROFILES,tvActiveArea,tvHardware,tvProfile}=await import('./tvHardware');
  const types=new Set(TV_HARDWARE.map(model=>model.stand.type));
  expect(types.has('twin-feet')).toBe(true);expect(types.has('pedestal')).toBe(true);
  for(const source of TV_HARDWARE){
    const active=tvActiveArea(source);
    expect(source.bodyMm.width).toBeGreaterThan(active.width);expect(source.bodyMm.height).toBeGreaterThan(active.height);
    expect(source.withStandMm.height).toBeGreaterThan(source.bodyMm.height);
    expect(source.stand.widthMm).toBeGreaterThan(0);expect(source.stand.widthMm).toBeLessThanOrEqual(source.bodyMm.width);
    expect(source.stand.position).toBe('standard');
    expect(source.panel.areaBasis).toBe('nominal-16:9-diagonal-estimate');
    expect(['www.sony.co.uk','images.samsung.com','www.lg.com']).toContain(new URL(source.source.url).hostname);
  }
  for(const profile of TV_PROFILES){
    const source=tvHardware(profile.model)!,shape=phoneGeometry(hardwareModel(profile.id)!);
    const scale=profile.width/tvActiveArea(source).width;
    expect(shape.base).toBeCloseTo((source.withStandMm.height-source.bodyMm.height)*scale,6);
    expect(shape.bodyHeight+shape.base).toBeCloseTo(source.withStandMm.height*scale,6);
    expect(profile.width/profile.height).toBeCloseTo(16/9,9);
    expect(tvProfile(profile.id,'desktop')).toBeUndefined();
    if(profile.mapping.kind==='native')expect([source.panel.width,source.panel.height]).toEqual([profile.width,profile.height]);
  }
  expect(tvProfile('monitor2560')).toBeUndefined();expect(tvProfile('d3840')).toBeUndefined();
  const hd=tvHardware(tvProfile('tv1280')!.model)!;
  expect([hd.panel.width,hd.panel.height]).toEqual([1366,768]);
  expect(tvProfile('tv1280')!.mapping.kind).toBe('logical-scaled');
  expect(tvProfile('tv2560')!.mapping.kind).toBe('logical-scaled');expect(tvProfile('tv3440')!.mapping.kind).toBe('logical-scaled');
});
