import { expect, test, type Locator } from '@playwright/test';

const monitors = [
  { id:'l1920',width:1920,height:1080,headWidth:538.64,headHeight:311.21,camera:false },
  { id:'monitor2048',width:2048,height:1152,headWidth:717.42,headHeight:486.64,camera:true },
  { id:'monitor2560',width:2560,height:1440,headWidth:612.24,headHeight:352.51,camera:false },
  { id:'monitor3440',width:3440,height:1440,headWidth:813.46,headHeight:359.15,camera:false },
  { id:'monitor3840',width:3840,height:2160,headWidth:611.44,headHeight:353.01,camera:false },
] as const;
type Monitor = Omit<typeof monitors[number], 'id'> & {id:string};

async function geometry(body:Locator, model:Monitor, actual:boolean) {
  await expect(body).toHaveCount(1);
  await expect(body).toHaveAttribute('data-profile','monitor');
  const screen=body.getByRole('region',{name:`Önizleme ekranı, ${model.width} piksel`,exact:true});
  await expect(screen).toHaveCSS('width',`${model.width}px`);
  await expect(screen).toHaveCSS('height',`${model.height}px`);
  const hardware=body.locator('[data-device-hardware]');
  if(model.camera){await expect(hardware).toHaveAttribute('data-camera-present','true');await expect(hardware).toBeVisible();}
  else {await expect(hardware).not.toHaveAttribute('data-camera-present');await expect(hardware).toHaveCSS('display','none');}
  const base=body.locator('xpath=following-sibling::*[@data-monitor-stand]');
  await expect(base).toHaveCount(1);
  const m=await body.evaluate(element=>{
    const rect=(e:Element)=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
    const base=element.nextElementSibling!;
    const h=element.querySelector('[data-device-hardware]')!;
    const s=element.querySelector('[aria-label^="Önizleme ekranı,"]')!;
    const matrix=new DOMMatrix(getComputedStyle(element.parentElement!).transform);
    const pseudo=getComputedStyle(base,'::after'), neck=getComputedStyle(base,'::before');
    return {body:rect(element),screen:rect(s),base:rect(base),sizer:rect(element.closest('[data-device-sizer]')!),scale:matrix.a,scaleY:matrix.d,
      camera:getComputedStyle(h).display==='none'?null:rect(h.firstElementChild!),footHeight:parseFloat(pseudo.height),neckWidth:parseFloat(neck.width)};
  });
  expect(m.scale).toBe(m.scaleY);
  if(actual){expect(m.scale).toBe(1);expect(m.screen.width).toBe(model.width);expect(m.screen.height).toBe(model.height);}
  else {expect(m.scale).toBeGreaterThan(0);expect(m.scale).toBeLessThan(1);}
  expect(m.body.height/m.body.width).toBeCloseTo(model.headHeight/model.headWidth,3);
  expect(m.base.height).toBeGreaterThan(0);
  expect(m.base.width).toBeLessThan(m.body.width);
  expect(m.base.y).toBeCloseTo(m.body.bottom,1);
  expect(m.base.x+m.base.width/2).toBeCloseTo(m.body.x+m.body.width/2,1);
  expect(m.sizer.height).toBeCloseTo(m.body.height+m.base.height,1);
  expect(m.footHeight*m.scale).toBeLessThan(m.base.height);
  expect(m.neckWidth*m.scale).toBeLessThan(m.base.width);
  if(m.camera){
    expect(m.camera.y).toBeGreaterThan(m.body.y);
    expect(m.camera.bottom).toBeLessThan(m.screen.y);
    expect(m.camera.x).toBeGreaterThan(m.body.x);
    expect(m.camera.right).toBeLessThan(m.body.right);
    expect(m.camera.x+m.camera.width/2).toBeCloseTo(m.body.x+m.body.width/2,1);
  }
  return m;
}

for(const model of monitors){
  test(`${model.id} preserves physical head, reserved stand and fixed screen at 320 and desktop`,async({page},testInfo)=>{
    await page.setViewportSize({width:320,height:850});
    await page.goto(`/?workspace=workflow&ctx=html&device=${model.id}&role=h1`);
    const first=page.getByRole('region',{name:'Ekran 1 · Seçili element',exact:true});
    const second=page.getByRole('region',{name:'Ekran 2 · Kümenin tamamı',exact:true});
    const a=first.locator(`[data-model="${model.id}"]`),b=second.locator(`[data-model="${model.id}"]`);
    await geometry(a,model,true);await geometry(b,model,true);
    await expect(page.getByRole('radio',{name:`${model.width} px`,exact:true})).toBeChecked();
    await expect(page.getByRole('radiogroup',{name:'Önizleme yönü',exact:true})).toHaveCount(0);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(320);
    await page.getByRole('button',{name:'Çerçeveye sığdır',exact:true}).click();
    await geometry(a,model,false);await geometry(b,model,false);
    await testInfo.attach(`${model.id}-fit-320`,{body:await first.locator('[data-device-sizer]').screenshot(),contentType:'image/png'});
    await page.setViewportSize({width:3840,height:2000});
    await page.getByRole('button',{name:'%100 göster',exact:true}).click();
    const left=await geometry(a,model,true),right=await geometry(b,model,true);
    for(const part of ['body','screen','base'] as const){
      expect(left[part].width).toBe(right[part].width);expect(left[part].height).toBe(right[part].height);
      expect(Math.abs(left[part].y-right[part].y)).toBeLessThan(1);
      expect(Math.abs(left[part].bottom-right[part].bottom)).toBeLessThan(1);
    }
    if(model.id==='monitor3440'){
      await page.getByRole('button',{name:'Serbest editör',exact:true}).click();
      await expect(page.locator('[data-canvas-root]')).toBeVisible();
      const skip=page.getByRole('button',{name:'Geç',exact:true});
      try{await skip.click({timeout:2000});}catch{if(await skip.isVisible())throw new Error('Onboarding could not be dismissed');}
      expect(new URL(page.url()).searchParams.get('device')).toBe('d3440');
      await page.getByRole('button',{name:'Gerçek boyuta geç',exact:true}).click();
      const editor=page.locator('[data-canvas-root] [data-model="d3440"]');
      await geometry(editor,{...model,id:'d3440'},true);
      await page.setViewportSize({width:320,height:850});
      const scroller=editor.getByRole('region',{name:'Kaydırılabilir ekran içeriği, 3440 piksel',exact:true});
      await scroller.evaluate(async el=>{
        const child=el.firstElementChild as HTMLElement;
        const filler=document.createElement('div');filler.style.height='5000px';child.append(filler);
        await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
        el.scrollTop=el.scrollHeight;
      });
      await expect.poll(()=>scroller.evaluate(el=>el.scrollTop)).toBeGreaterThan(0);
      await geometry(editor,{...model,id:'d3440'},true);
    }
  });
}

test('monitor integration preserves the projecting laptop deck and independent TV feet',async({page})=>{
  await page.setViewportSize({width:1920,height:1100});
  await page.goto('/?workspace=workflow&ctx=html&device=l960&role=h1');
  const laptop=page.locator('[data-model="l960"]').first();
  await expect(laptop).toHaveAttribute('data-profile','laptop');
  const deck=await laptop.evaluate(el=>{const lid=el.getBoundingClientRect(),base=el.nextElementSibling!.getBoundingClientRect();return {left:lid.x-base.x,right:base.right-lid.right,height:base.height};});
  expect(deck.left).toBeGreaterThan(0);expect(deck.right).toBeGreaterThan(0);expect(deck.height).toBeGreaterThan(0);
  await page.goto('/?workspace=workflow&ctx=html&device=tv1920&role=h1');
  await expect(page.locator('[data-profile="monitor"]')).toHaveCount(0);
  await expect(page.locator('[data-monitor-stand]')).toHaveCount(0);
  await expect(page.locator('[data-profile="tv"][data-kind="desktop"]')).toHaveCount(4); // Two heads + two bases.
  const tv=page.getByRole('region',{name:'Ekran 1 · Seçili element',exact:true});
  await expect(tv.getByRole('region',{name:'Önizleme ekranı, 1920 piksel',exact:true})).toHaveCSS('height','1080px');
  const foot=tv.locator('[data-device-base]');
  await expect(foot).toHaveAttribute('data-tv-stand','mini-arc');
  await expect(foot.locator('[data-tv-foot]')).toHaveCount(2);
  expect(await foot.evaluate(el=>el.getBoundingClientRect().height)).toBeGreaterThan(0);
  await expect(foot).toHaveCSS('clip-path','none');
});
