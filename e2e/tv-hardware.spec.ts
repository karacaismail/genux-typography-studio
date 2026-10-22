import { expect, test, type Locator } from '@playwright/test';

// Independent manufacturer dimensions; these assert physical relationships, not CSS formulas.
const televisions = [
  {id:'tv1280',width:1280,height:720,bodyWidth:733,bodyHeight:442,totalHeight:468,standWidth:448,stand:'twin-feet'},
  {id:'tv1920',width:1920,height:1080,bodyWidth:737.4,bodyHeight:438,totalHeight:465.4,standWidth:732.5,stand:'mini-arc'},
  {id:'tv2560',width:2560,height:1440,bodyWidth:1222,bodyHeight:703,totalHeight:757,standWidth:470,stand:'pedestal'},
  {id:'tv3440',width:3440,height:1935,bodyWidth:1225,bodyHeight:707,totalHeight:738,standWidth:1067,stand:'twin-feet'},
  {id:'tv3840',width:3840,height:2160,bodyWidth:1222,bodyHeight:703,totalHeight:757,standWidth:470,stand:'pedestal'},
] as const;
type Television = typeof televisions[number];

async function geometry(body:Locator, model:Television, actual:boolean) {
  await expect(body).toHaveAttribute('data-profile','tv');
  await expect(body).toHaveAttribute('data-tv-model',/^(sony|samsung|lg)-/);
  const screen=body.getByRole('region',{name:`Önizleme ekranı, ${model.width} piksel`,exact:true});
  await expect(screen).toHaveCSS('width',`${model.width}px`);
  await expect(screen).toHaveCSS('height',`${model.height}px`);
  await expect(body.locator('[data-device-hardware]')).not.toHaveAttribute('data-camera-present');
  await expect(body.locator('[data-device-hardware]')).toHaveCSS('display','none');
  const stand=body.locator('xpath=following-sibling::*[@data-device-base]');
  await expect(stand).toHaveAttribute('data-tv-stand',model.stand);
  await expect(stand.locator('[data-tv-foot]')).toHaveCount(model.stand==='pedestal'?1:2);
  await expect(stand.locator('[data-tv-neck]')).toHaveCount(model.stand==='pedestal'?1:0);
  const result=await body.evaluate(el=>{
    const rect=(e:Element)=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
    const base=el.nextElementSibling!;
    const matrix=new DOMMatrix(getComputedStyle(el.parentElement!).transform);
    return {body:rect(el),screen:rect(el.querySelector('[aria-label^="Önizleme ekranı,"]')!),base:rect(base),
      sizer:rect(el.closest('[data-device-sizer]')!),scale:matrix.a,scaleY:matrix.d,
      feet:Array.from(base.querySelectorAll('[data-tv-foot]'),rect)};
  });
  expect(result.scale).toBe(result.scaleY);
  if(actual){expect(result.scale).toBe(1);expect(result.screen.width).toBe(model.width);expect(result.screen.height).toBe(model.height);}
  else {expect(result.scale).toBeGreaterThan(0);expect(result.scale).toBeLessThan(1);}
  expect(result.body.height/result.body.width).toBeCloseTo(model.bodyHeight/model.bodyWidth,3);
  expect(result.base.width/result.body.width).toBeCloseTo(model.standWidth/model.bodyWidth,3);
  expect((result.body.height+result.base.height)/result.body.width).toBeCloseTo(model.totalHeight/model.bodyWidth,3);
  expect(result.base.height).toBeGreaterThan(0);
  expect(result.base.y).toBeCloseTo(result.body.bottom,1);
  expect(result.base.x+result.base.width/2).toBeCloseTo(result.body.x+result.body.width/2,1);
  expect(result.sizer.height).toBeCloseTo(result.body.height+result.base.height,1);
  expect(result.screen.x).toBeGreaterThan(result.body.x);
  expect(result.screen.y).toBeGreaterThan(result.body.y);
  expect(result.screen.right).toBeLessThan(result.body.right);
  expect(result.screen.bottom).toBeLessThan(result.body.bottom);
  for(const foot of result.feet){
    expect(foot.height).toBeGreaterThan(0);
    expect(foot.x).toBeGreaterThanOrEqual(result.base.x-0.1);
    expect(foot.right).toBeLessThanOrEqual(result.base.right+0.1);
    expect(foot.bottom).toBeLessThanOrEqual(result.base.bottom+0.1);
  }
  if(result.feet.length===2)expect(result.feet[0].right).toBeLessThan(result.feet[1].x);
  return result;
}

for(const model of televisions){
  test(`${model.id}: physical TV and distinct stand remain fixed in both workflow views`,async({page},testInfo)=>{
    await page.setViewportSize({width:320,height:850});
    await page.goto(`/?workspace=workflow&ctx=html&device=${model.id}&role=h1`);
    const selected=page.getByRole('region',{name:'Ekran 1 · Seçili element',exact:true});
    const comparison=page.getByRole('region',{name:'Ekran 2 · Kümenin tamamı',exact:true});
    const a=selected.locator(`[data-model="${model.id}"]`),b=comparison.locator(`[data-model="${model.id}"]`);
    await geometry(a,model,true);await geometry(b,model,true);
    await expect(page.locator('[data-monitor-stand]')).toHaveCount(0);
    await expect(page.getByRole('radio',{name:`${model.width} px`,exact:true})).toBeChecked();
    await expect(page.getByRole('radiogroup',{name:'Önizleme yönü',exact:true})).toHaveCount(0);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(320);
    await page.getByRole('button',{name:'Çerçeveye sığdır',exact:true}).click();
    await geometry(a,model,false);await geometry(b,model,false);
    const screenshot=testInfo.outputPath(`${model.id}-fit-320.png`);
    await selected.locator('[data-device-sizer]').screenshot({path:screenshot});
    await testInfo.attach(`${model.id}-fit-320`,{path:screenshot,contentType:'image/png'});
    await page.setViewportSize({width:3840,height:2400});
    await page.getByRole('button',{name:'%100 göster',exact:true}).click();
    const left=await geometry(a,model,true),right=await geometry(b,model,true);
    for(const part of ['body','screen','base'] as const){
      expect(left[part].width).toBe(right[part].width);expect(left[part].height).toBe(right[part].height);
      expect(Math.abs(left[part].y-right[part].y)).toBeLessThan(1);
    }
  });
}
