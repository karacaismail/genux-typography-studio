import{expect,it}from'vitest';
import{TABLET_MODELS,hardwareModel,phoneGeometry}from'./hardware';
it('models all five tablet widths with physical bodies and rotated screen apertures',()=>{
 expect(TABLET_MODELS.map(m=>m.width)).toEqual([600,744,768,820,834]);
 for(const model of TABLET_MODELS){
  expect(hardwareModel(model.id)).toBe(model);
  const portrait=phoneGeometry(model),landscape=phoneGeometry(model,model.height,model.width,true);
  expect(portrait.bodyHeight/portrait.bodyWidth).toBeCloseTo(model.bodyMm.height/model.bodyMm.width,6);
  expect(landscape.bodyWidth).toBeCloseTo(portrait.bodyHeight,6);expect(landscape.bodyHeight).toBeCloseTo(portrait.bodyWidth,6);
  expect(portrait.x).toBeGreaterThan(0);expect(portrait.top).toBeGreaterThan(0);
 }
});
it('distinguishes classic home hardware, modern tablet gestures and off-center Nexus camera',()=>{
 expect(hardwareModel('t768')?.homeDiameter).toBe(52);
 expect(hardwareModel('t600')?.camera?.x).toBe(.7);
 for(const id of ['t744','t820','t834']){const m=hardwareModel(id)!;expect(m.profile).toBe('tablet');expect(m.homeDiameter).toBeUndefined();expect(m.corners.screen).toBeGreaterThan(0);}
});
