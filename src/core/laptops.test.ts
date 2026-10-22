import{expect,it}from'vitest';
import{LAPTOP_MODELS,hardwareModel,phoneGeometry}from'./hardware';
it('preserves seven viewport IDs and scales one physical laptop consistently',()=>{
 expect(LAPTOP_MODELS.map(m=>m.id)).toEqual(['l960','t1024','l1280','l1366','l1440','l1536','l1680']);
 for(const m of LAPTOP_MODELS){const g=phoneGeometry(m);expect(hardwareModel(m.id)).toBe(m);expect(g.x).toBeGreaterThan(0);expect(g.top).toBeGreaterThan(0);expect(g.bottom).toBeGreaterThan(0);expect(g.base).toBeGreaterThan(0);expect(g.bodyWidth).toBeCloseTo(m.width+2*g.x);}
 const a=phoneGeometry(hardwareModel('l960')!),b=phoneGeometry(hardwareModel('l1536')!);expect(b.bodyWidth/a.bodyWidth).toBeCloseTo(1.6,6);expect(b.base/a.base).toBeCloseTo(1.6,6);
});
it('records real camera positions instead of inventing a universal upper webcam',()=>{
 expect(hardwareModel('l960')?.lid?.cameraEdge).toBe('bottom');expect(hardwareModel('l960')?.camera?.x).toBe(.15);
 expect(hardwareModel('t1024')?.camera).toBeUndefined();
 for(const id of ['l1280','l1366','l1440','l1680'])expect(hardwareModel(id)?.lid?.cameraEdge).toBe('top');
});

it('reserves visible symmetric laptop deck overhang outside the lid',()=>{
 for(const model of LAPTOP_MODELS){const g=phoneGeometry(model);expect(g.wide).toBeGreaterThan(0);expect(g.wide).toBeLessThan(.12);}
});

it('keeps keyboard plane separate from front face and scales model corners across Air viewports',()=>{
 for(const model of LAPTOP_MODELS){
  const g=phoneGeometry(model);
  expect(g.base).toBeGreaterThan(model.lid!.frontMm * model.width / model.bodyMm.width);
 }
 const air=hardwareModel('l1280')!,large=hardwareModel('l1680')!;
 expect(air.corners.body).toBeGreaterThan(30);
 expect(large.corners.body/air.corners.body).toBeCloseTo(1680/1280,6);
});
