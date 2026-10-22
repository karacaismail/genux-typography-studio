import { expect, it } from 'vitest';
import { PHONE_MODELS, phoneGeometry } from './hardware';
it('uses a single real model for every mobile choice and preserves published body proportions',()=>{
  for(const model of PHONE_MODELS){
    const shape=phoneGeometry(model);
    expect(shape.bodyHeight/shape.bodyWidth).toBeCloseTo(model.bodyMm.height/model.bodyMm.width,6);
    expect(shape.bodyWidth-model.width).toBeCloseTo(2*shape.x,6);
    expect(shape.bodyHeight-model.height).toBeCloseTo(shape.top+shape.bottom,6);
    expect(shape.x).toBeGreaterThan(0);expect(shape.top).toBeGreaterThan(0);
  }
  expect(PHONE_MODELS[0].height).toBe(480);
});
it('rotates the physical body ratio together with the viewport',()=>{
  for(const model of PHONE_MODELS){const shape=phoneGeometry(model,model.height,model.width,true);expect(shape.bodyWidth/shape.bodyHeight).toBeCloseTo(model.bodyMm.height/model.bodyMm.width,6);}
});
it('reconstructs iPhone 4 glass corners and home-key scale from the front reference',()=>{
  const model=PHONE_MODELS[0],shape=phoneGeometry(model);
  expect(model.corners.body/shape.bodyWidth).toBeGreaterThan(.14);
  expect(model.corners.body/shape.bodyWidth).toBeLessThan(.16);
  expect(model.corners.screen).toBe(0);
  expect(model.homeDiameter).toBe(68);
});
