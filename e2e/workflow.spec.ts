import { expect, test } from '@playwright/test';

test('collects a decision, resumes immediately after editor switch, and round-trips JSON with notes', async({page})=>{
  await page.goto('/');
  await page.getByLabel('Yazı boyutu',{exact:true}).fill('34');
  await page.getByLabel('Karar notu',{exact:true}).fill('320 px mobil başlık kararı');
  await page.getByRole('button',{name:'Kararı kaydet ve devam et'}).click();
  await page.getByRole('button',{name:'Serbest editör',exact:true}).click();
  await page.getByRole('button',{name:'Karar akışına dön'}).click();
  await expect(page.getByRole('region',{name:'H2 karar formu',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'H1',exact:true}).click();
  await expect(page.getByLabel('Karar notu',{exact:true})).toHaveValue('320 px mobil başlık kararı');
  await expect(page.getByLabel('Yazı boyutu',{exact:true})).toHaveValue('34 px');
  await page.reload();
  await expect(page.locator('[data-example-role="h1"]')).toBeVisible();
  const download=page.waitForEvent('download');
  await page.getByRole('button',{name:'JSON indir',exact:true}).click();
  const stream=await(await download).createReadStream();let content='';for await(const chunk of stream!)content+=chunk.toString();
  const data=JSON.parse(content);
  expect(data.workflow.reviews['html:mobile:320:h1'].values.size).toBe(34);
  expect(data.contexts.html.roles.h1.fontSize.min).toBe(34);
  expect(data.workflow.engine.version).toBe(1);
  expect(data.workflow.notes['html:mobile:320:h1']).toBe('320 px mobil başlık kararı');
  await page.getByLabel('Yazı boyutu',{exact:true}).fill('39');
  await page.locator('input[type=file]').first().setInputFiles({name:'decisions.json',mimeType:'application/json',buffer:Buffer.from(content)});
  await expect(page.getByLabel('Yazı boyutu',{exact:true})).toHaveValue('34 px');
});

test('has mobile navigation, all device subwidths, loaded Ant Design examples and visible keyboard focus',async({page})=>{
  await page.setViewportSize({width:320,height:850});
  await page.goto('/');
  await expect(page.locator('[data-example-role="h1"]')).toBeVisible();
  await expect(page.getByRole('button',{name:'JSON içe aktar',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(320);
  await page.getByRole('radio',{name:'Tablet',exact:true}).click();
  await expect(page.getByRole('radio',{name:'834 px',exact:true})).toBeVisible();
  await page.getByRole('radio',{name:'Televizyon',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Headings',exact:true})).toBeVisible();
  await expect(page.getByRole('radio',{name:'3840 px',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Kaydet',exact:true}).focus();await page.keyboard.press('Tab');
  const focus=await page.evaluate(()=>({mode:document.documentElement.dataset.focus,outline:getComputedStyle(document.activeElement!).outlineStyle,shadow:getComputedStyle(document.activeElement!).boxShadow}));
  expect(focus.mode).toBe('kbd');expect(focus.outline).toBe('none');expect(focus.shadow).not.toBe('none');
});

test('does not leave the form after an IndexedDB write failure',async({page})=>{
  await page.goto('/');
  await expect(page.getByRole('button',{name:'Kararı kaydet ve devam et'})).toBeVisible();
  await page.evaluate(()=>{IDBObjectStore.prototype.put=function(){throw new DOMException('simulated quota','QuotaExceededError');};});
  await page.getByLabel('Karar notu',{exact:true}).fill('Kaybolmaması gereken karar');
  await page.getByRole('button',{name:'Serbest editör',exact:true}).click();
  await expect(page.getByText('Tarayıcıya kayıt yapılamadı.',{exact:false})).toBeVisible();
  await expect(page.getByLabel('Karar notu',{exact:true})).toHaveValue('Kaybolmaması gereken karar');
});

test('preserves an unsupported IndexedDB record until explicit recovery',async({page})=>{
  await page.goto('/?workspace=free');
  await page.evaluate(()=>new Promise<void>((resolve,reject)=>{const req=indexedDB.open('genux-typography-workflow',1);req.onupgradeneeded=()=>req.result.createObjectStore('workspace');req.onsuccess=()=>{const tx=req.result.transaction('workspace','readwrite');tx.objectStore('workspace').put({version:999,original:'keep-me'},'current');tx.oncomplete=()=>{req.result.close();resolve();};tx.onerror=()=>reject(tx.error);};}));
  await page.goto('/?workspace=workflow');
  await expect(page.getByText('İlerleme veritabanı okunamadı.',{exact:false})).toBeVisible();
  await page.getByLabel('Karar notu',{exact:true}).fill('Yeni taslak');
  await page.waitForTimeout(400);
  const version=await page.evaluate(()=>new Promise((resolve,reject)=>{const req=indexedDB.open('genux-typography-workflow',1);req.onsuccess=()=>{const read=req.result.transaction('workspace','readonly').objectStore('workspace').get('current');read.onsuccess=()=>resolve(read.result.version);read.onerror=()=>reject(read.error);};}));
  expect(version).toBe(999);
});

test('keeps a live full-group comparison while switching the edited element',async({page})=>{
  await page.setViewportSize({width:1680,height:1000});await page.goto('/');
  const group=page.getByRole('region',{name:'Ekran 2 · Kümenin tamamı',exact:true});
  await expect(group.locator('[data-group-role]')).toHaveCount(6);
  await expect(page.getByTestId('group-surface')).toHaveCSS('width','320px');
  await page.getByLabel('Yazı boyutu',{exact:true}).fill('40');
  await expect(group.locator('[data-group-role=h1]')).toHaveCSS('font-size','40px');
  await group.getByRole('button',{name:'H2 düzenle',exact:true}).click();
  await expect(page.getByRole('region',{name:'H2 karar formu',exact:true})).toBeVisible();
  await page.getByLabel('Yazı boyutu',{exact:true}).fill('30');
  await expect(group.locator('[data-group-role=h1]')).toHaveCSS('font-size','40px');
  await expect(group.locator('[data-group-role=h2]')).toHaveCSS('font-size','30px');
  await page.getByRole('navigation',{name:'Metin kümeleri',exact:true}).getByRole('button',{name:/Body/}).click();
  expect(await group.locator('[data-group-role]').count()).toBeGreaterThan(2);
});

test('puts specimen text on its own preview theme background even with a dark tool panel',async({page})=>{
  await page.goto('/');await page.getByTestId('group-surface').waitFor();
  if(await page.locator('html').getAttribute('data-mantine-color-scheme')!=='dark') await page.getByRole('button',{name:'Uygulama temasını değiştir'}).click();
  const surface=page.getByTestId('group-surface');
  const sample=surface.locator('[data-group-role=h1]');
  await expect(surface).toHaveCSS('background-color','rgb(255, 255, 255)');
  await expect(sample).toHaveCSS('color','rgb(26, 26, 26)');
  await page.getByText('Koyu',{exact:true}).click();
  await expect(surface).toHaveCSS('background-color','rgb(26, 26, 26)');
  await expect(sample).toHaveCSS('color','rgb(230, 230, 230)');
});

test('numeric spinner has decrement left and increment right, preserving keyboard steps and bounds',async({page})=>{
  await page.goto('/');
  const field=page.getByLabel('Yazı boyutu',{exact:true});
  await field.fill('26');
  const minus=page.getByRole('button',{name:'Yazı boyutu: azalt',exact:true});
  const plus=page.getByRole('button',{name:'Yazı boyutu: artır',exact:true});
  await plus.click();await expect(field).toHaveValue('27 px');
  await minus.click();await expect(field).toHaveValue('26 px');
  await field.focus();await field.press('ArrowUp');await expect(field).toHaveValue('27 px');
  const m=await minus.boundingBox(),p=await plus.boundingBox();expect(m!.x).toBeLessThan(p!.x);
  await field.fill('12');await field.blur();await expect(minus).toBeDisabled();
  await page.setViewportSize({width:320,height:850});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(320);
});

test('weight is a horizontal radio choice and immediately updates both previews',async({page})=>{
  await page.goto('/');
  const choice=page.getByRole('radio',{name:'Ağırlık 700',exact:true});
  await choice.click();await expect(choice).toBeChecked();
  const a=await page.getByRole('radio',{name:'Ağırlık 300',exact:true}).boundingBox();
  const b=await page.getByRole('radio',{name:'Ağırlık 400',exact:true}).boundingBox();
  expect(a!.y).toBe(b!.y);expect(b!.x).toBeGreaterThan(a!.x);
  await expect(page.getByRole('radio',{name:'Ağırlık 600',exact:true})).not.toBeChecked();
  await expect(page.locator('[data-group-role=h1]')).toHaveCSS('font-weight','700');
  await expect(page.locator('[data-example-role=h1]').first()).toHaveCSS('font-weight','700');
  await expect(choice).toHaveAttribute('tabindex','0');
  await expect(page.getByRole('radio',{name:'Ağırlık 600',exact:true})).toHaveAttribute('tabindex','-1');
  await choice.focus();await choice.press('ArrowRight');await expect(page.getByRole('radio',{name:'Ağırlık 800',exact:true})).toBeChecked();
  await page.setViewportSize({width:320,height:850});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(320);
});

test('line height offers only the approved horizontal radio choices',async({page})=>{
  await page.goto('/');
  const choice=page.getByRole('radio',{name:'Satır yüksekliği 1.5',exact:true});await choice.click();await expect(choice).toBeChecked();
  await expect(page.locator('[data-example-role=h1]').first()).toHaveCSS('line-height','48px');
  await expect(page.locator('[data-group-role=h1]')).toHaveCSS('line-height','48px');
  const group=page.getByRole('radiogroup',{name:'Satır yüksekliği',exact:true});
  await expect(group.getByRole('radio')).toHaveCount(10);
  await expect(page.getByRole('radio',{name:'Özel satır yüksekliği',exact:true})).toHaveCount(0);
  await expect(page.getByRole('radio',{name:'Satır yüksekliği 0.8',exact:true})).toHaveCount(0);
  await page.getByRole('radio',{name:'Satır yüksekliği 1.1',exact:true}).click();
  await expect(page.locator('[data-group-role=h1]')).toHaveCSS('line-height','35.2px');
});

test('compact workspace combines context and controls without reducing hit targets',async({page})=>{
  await page.setViewportSize({width:1680,height:1000});await page.goto('/');
  const title=page.getByRole('heading',{name:'Headings',exact:true});await title.waitFor();
  const headingBox=await title.boundingBox();
  const contextBox=await page.getByText('HTML / Mobil / 320 px',{exact:true}).boundingBox();
  expect(Math.abs(headingBox!.y-contextBox!.y)).toBeLessThan(12);
  const first=page.getByRole('region',{name:'Ekran 1 · Seçili element',exact:true});
  const pickerHeight=await page.getByRole('radiogroup',{name:'Cihaz grubu',exact:true}).evaluate(el=>{const wrapper=el.parentElement!;return wrapper.getBoundingClientRect().height+parseFloat(getComputedStyle(wrapper.parentElement!).rowGap);});
  expect((await first.boundingBox())!.y-pickerHeight).toBeLessThan(320);
  const nav=page.getByRole('navigation',{name:'Bu kümedeki elementler',exact:true});
  expect((await nav.getByRole('button',{name:'H1',exact:true}).boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await page.setViewportSize({width:320,height:850});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(320);
});

test('smart sticky inspector stays in viewport while multiline tests live inside the selected device',async({page})=>{
  await page.setViewportSize({width:1680,height:900});await page.goto('/');
  const form=page.getByRole('region',{name:'H1 karar formu',exact:true});await form.waitFor();
  await page.getByRole('radio',{name:'Satır yüksekliği 2',exact:true}).click();
  const first=page.getByRole('region',{name:'Ekran 1 · Seçili element',exact:true});
  await first.getByRole('radiogroup',{name:'Seçili ekran görünümü',exact:true}).getByText('Satır testleri',{exact:true}).click();
  const testSample=first.getByTestId('near-line-sample');await expect(testSample).toHaveCSS('line-height','64px');
  await expect(form.getByTestId('near-line-sample')).toHaveCount(0);
  await expect(testSample.locator(':scope > div')).toHaveCount(2);
  await page.getByRole('region',{name:'Satır yüksekliği canlı testi',exact:true}).getByText('5 satır',{exact:true}).click();await expect(testSample.locator(':scope > div')).toHaveCount(5);
  await page.evaluate(()=>window.scrollTo(0,300));
  const box=await form.boundingBox();expect(box!.y).toBeGreaterThanOrEqual(0);expect(box!.y+box!.height).toBeLessThanOrEqual(901);
  expect(await form.evaluate(e=>getComputedStyle(e).overflowY)).toBe('auto');
});


test('workflow displays the complete device at actual size without a fixed-height crop', async({page})=>{
  await page.setViewportSize({width:1680,height:1000});
  await page.goto('/');
  const first=page.getByRole('region',{name:'Ekran 1 · Seçili element',exact:true});
  const screen=first.getByRole('region',{name:'Önizleme ekranı, 320 piksel',exact:true});
  await expect(screen).toHaveCSS('width','320px');
  await expect(screen).toHaveCSS('height','480px');
  const dimensions=await screen.evaluate(el=>{const frame=el.parentElement!;const stage=frame.parentElement!.parentElement!.parentElement!.parentElement!;return {frame:frame.getBoundingClientRect().toJSON(),stage:stage.getBoundingClientRect().toJSON()};});
  expect(dimensions.frame.height/dimensions.frame.width).toBeCloseTo(115.2/58.6,3);
  expect(dimensions.frame.bottom).toBeLessThanOrEqual(dimensions.stage.bottom);
  await expect(first.getByText(/ölçek %100/)).toBeVisible();
  await page.setViewportSize({width:320,height:850});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(320);
});

test('scroll chains from the preview and inspector boundaries to the page',async({page})=>{
  await page.setViewportSize({width:1680,height:900});await page.goto('/');
  const screen=page.getByRole('region',{name:'Ekran 1 · Seçili element',exact:true}).getByRole('region',{name:'Kaydırılabilir ekran içeriği, 320 piksel',exact:true});
  await screen.evaluate(el=>{const filler=document.createElement('div');filler.style.height='1600px';el.append(filler);el.scrollTop=el.scrollHeight;});
  await screen.hover();
  await screen.evaluate(el=>{el.scrollTop=el.scrollHeight;});
  const before=await page.evaluate(()=>window.scrollY);
  await page.mouse.wheel(0,400);
  await expect.poll(()=>page.evaluate(()=>window.scrollY)).toBeGreaterThan(before);
  const form=page.getByRole('region',{name:'H1 karar formu',exact:true});
  await form.evaluate(el=>{el.scrollTop=el.scrollHeight;});
  await form.hover();await form.evaluate(el=>{el.scrollTop=el.scrollHeight;});const after=await page.evaluate(()=>window.scrollY);
  await page.mouse.wheel(0,400);
  await expect.poll(()=>page.evaluate(()=>window.scrollY)).toBeGreaterThan(after);
});


test('comparison devices share top and bottom edges with a compact gap',async({page})=>{
  await page.setViewportSize({width:1920,height:1100});await page.goto('/');
  const screens=page.getByRole('region',{name:'Önizleme ekranı, 320 piksel',exact:true});
  await expect(screens).toHaveCount(2);
  const a=await screens.nth(0).boundingBox();const b=await screens.nth(1).boundingBox();
  expect(Math.abs(a!.y-b!.y)).toBeLessThan(1);
  expect(Math.abs(a!.y+a!.height-b!.y-b!.height)).toBeLessThan(1);
  // Compare the physical frame gap: model-specific bezels now occupy real space.
  const frameA=await screens.nth(0).locator("..").boundingBox();
  const frameB=await screens.nth(1).locator("..").boundingBox();
  expect(frameB!.x-frameA!.x-frameA!.width).toBeLessThan(120);
  expect(frameB!.x-frameA!.x-frameA!.width).toBeGreaterThan(0);
});


test('device families use large horizontal icon radios with keyboard selection',async({page})=>{
  await page.goto('/');
  const group=page.getByRole('radiogroup',{name:'Cihaz grubu',exact:true});
  await expect(group.getByRole('radio')).toHaveCount(5);
  const mobile=group.getByRole('radio',{name:'Mobil',exact:true});const tablet=group.getByRole('radio',{name:'Tablet',exact:true});
  await expect(mobile).toBeChecked();
  const a=await mobile.boundingBox();const b=await tablet.boundingBox();
  expect(a!.height).toBeGreaterThanOrEqual(76);expect(a!.y).toBe(b!.y);expect(b!.x).toBeGreaterThan(a!.x);
  await mobile.focus();await mobile.press('ArrowRight');await expect(tablet).toBeChecked();
  await page.setViewportSize({width:320,height:850});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(320);
});


test('product dropdown lives beside the brand and text groups remain in sidebar',async({page})=>{
  await page.setViewportSize({width:1680,height:1000});await page.goto('/');
  await expect(page.getByRole('banner').getByRole('radiogroup',{name:'Cihaz grubu',exact:true})).toBeVisible();
  await expect(page.getByRole('banner').getByRole('combobox',{name:'Ürün türü',exact:true})).toHaveCount(1);
  await expect(page.getByRole('combobox',{name:'Metin kümesi',exact:true})).toHaveCount(0);
  const rail=page.getByRole('complementary',{name:'Karar yolculuğu'});
  const groups=rail.getByRole('navigation',{name:'Metin kümeleri'});
  const body=groups.getByRole('button',{name:/Body/});await body.click();await expect(body).toHaveAttribute('aria-current','step');
  await expect(page.getByRole('heading',{name:'Body',exact:true})).toBeVisible();
  await page.setViewportSize({width:320,height:850});
  const product=page.getByRole('banner').getByRole('combobox',{name:'Ürün türü',exact:true});
  await product.click();await page.getByRole('option',{name:'Marketing',exact:true}).click();await expect(product).toHaveValue('Marketing');
  await groups.getByRole('button',{name:/Body/}).click();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(320);
});

test('recommendations remain independent of selected values and cover both editors',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('genux-type-lab-v2',JSON.stringify({format:'genux-typography-decisions',version:2,scope:'changed',contexts:{},ui:{tourDone:true}})));
  await page.setViewportSize({width:1680,height:1000});await page.goto('/');
  const weight=page.getByRole('radio',{name:'Ağırlık 600',exact:true});
  await expect(weight.getByRole('img',{name:'Önerilen: Ağırlık 600',exact:true})).toBeVisible();
  await page.getByRole('radio',{name:'Ağırlık 400',exact:true}).click();
  await expect(weight.getByRole('img',{name:'Önerilen: Ağırlık 600',exact:true})).toBeVisible();
  await expect(weight).not.toBeChecked();
  await page.getByLabel('Yazı boyutu',{exact:true}).fill('26');
  await expect(page.getByRole('img',{name:'Önerilen: 32 px',exact:true})).toBeVisible();
  const lh=page.getByRole('radiogroup',{name:'Satır yüksekliği',exact:true});
  await expect(lh.getByRole('img')).toHaveCount(1);
  await expect(weight).toHaveAccessibleDescription(/600/);
  await expect(lh.getByRole("radio",{name:"Satır yüksekliği 1.25",exact:true})).toHaveAccessibleDescription(/1.25/);
  await expect(page.getByRole('region',{name:'Çıktı tonları · açık / koyu',exact:true})).toBeVisible();
  await expect(page.getByRole('radiogroup',{name:'Açık tema metin rengi'}).getByRole('img')).toHaveCount(1);
  await expect(page.getByRole('radiogroup',{name:'Koyu tema metin rengi'}).getByRole('img')).toHaveCount(1);
  await page.setViewportSize({width:320,height:850});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(320);
  await page.setViewportSize({width:1680,height:1000});
  await page.getByRole('button',{name:'Serbest editör',exact:true}).click();
  await expect(page.getByRole('complementary',{name:'Denetçi'}).getByText('Önerilen: 38',{exact:true})).toBeVisible();
  await page.getByRole("combobox",{name:"Boyut modu",exact:true}).click();
  await page.getByRole("option",{name:"İki uç · otomatik tam sayı",exact:true}).click();
  const inspector=page.getByRole("complementary",{name:"Denetçi"});
  await expect(inspector.getByText("Önerilen: 32",{exact:true})).toBeVisible();
  await expect(inspector.getByText("Önerilen: 40",{exact:true})).toBeVisible();
});


test('breakpoint tabs separate pixel labels from captions and animate the active layer',async({page})=>{
  await page.setViewportSize({width:1680,height:1000});await page.goto('/');
  const group=page.getByRole('radiogroup',{name:'Alt kırılım',exact:true});
  const first=group.getByRole('radio',{name:'320 px',exact:true});const next=group.getByRole('radio',{name:'360 px',exact:true});
  await expect(first).toContainText('320 px');await expect(first).toHaveAccessibleDescription(/iPhone/);
  const indicator=group.locator('[data-ready]');
  await expect(indicator).toHaveCSS('opacity','1');const before=await indicator.evaluate(el=>getComputedStyle(el).transform);
  await next.click();await expect(next).toBeChecked();
  await expect.poll(()=>indicator.evaluate(el=>getComputedStyle(el).transform)).not.toBe(before);
  const motion=await indicator.evaluate(el=>({duration:getComputedStyle(el).transitionDuration,ease:getComputedStyle(el).transitionTimingFunction}));
  expect(motion.duration).not.toBe('0s');expect(motion.ease).toContain('0.65');
  await first.click();await first.focus();await first.press('ArrowRight');await expect(next).toBeChecked();
  await page.setViewportSize({width:320,height:850});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(320);
  const narrowFirst=await first.boundingBox();const last=await group.getByRole('radio',{name:'430 px',exact:true}).boundingBox();expect(last!.y).toBeGreaterThan(narrowFirst!.y);
  await page.emulateMedia({reducedMotion:'reduce'});await expect(indicator).toHaveCSS('transition-duration',/^0s(?:, 0s)*$/);
});


test('sidebar contains breakpoint and text-group navigation without duplicate progress',async({page})=>{
  await page.setViewportSize({width:1680,height:1000});await page.goto('/');
  const rail=page.getByRole('complementary',{name:'Karar yolculuğu'});
  await expect(rail.getByRole('group',{name:'Çalışma ilerlemesi',exact:true})).toHaveCount(0);
  await expect(rail.getByRole('progressbar')).toHaveCount(0);
  const breakpoints=rail.getByRole('radiogroup',{name:'Alt kırılım',exact:true});
  await expect(breakpoints.getByRole('radio')).toHaveCount(6);
  const first=await breakpoints.getByRole('radio',{name:'320 px',exact:true}).boundingBox();
  const second=await breakpoints.getByRole('radio',{name:'360 px',exact:true}).boundingBox();
  expect(second!.y).toBeGreaterThan(first!.y+first!.height);
  expect(second!.x).toBe(first!.x);
  expect(first!.height).toBeGreaterThanOrEqual(44);
  expect(first!.height).toBeLessThanOrEqual(68);
  const textSize=await breakpoints.getByRole('radio',{name:'320 px',exact:true}).locator('span').first().evaluate(el=>getComputedStyle(el).fontSize);
  expect(parseFloat(textSize)).toBeGreaterThanOrEqual(14);
  await expect(rail.getByText(/onaylı küme/)).toHaveCount(0);
  await expect(rail.getByRole('navigation',{name:'Ürün türleri'})).toHaveCount(0);
  await expect(rail.getByText('Çalışma planı',{exact:true})).toHaveCount(0);
  await expect(rail.getByText('Bir karar.',{exact:false})).toHaveCount(0);
  await expect(rail.getByRole('separator')).toBeVisible();
  await expect(rail.getByRole('region',{name:'Metin kümeleri'}).getByRole('button')).toHaveCount(7);
});


test('breakpoint pixel and model caption share one anchor selection target',async({page})=>{
  await page.goto('/');
  const target=page.getByRole('radio',{name:'360 px',exact:true});
  await expect(target).toHaveJSProperty('tagName','A');
  await target.getByText('Galaxy S20',{exact:true}).click();
  await expect(target).toBeChecked();
  await page.getByRole('radio',{name:'375 px',exact:true}).getByText('375 px',{exact:true}).click();
  await expect(page.getByRole('radio',{name:'375 px',exact:true})).toBeChecked();
  await target.focus();await target.press('Space');await expect(target).toBeChecked();
  await target.press('ArrowRight');await expect(page.getByRole('radio',{name:'375 px',exact:true})).toBeChecked();
});

test('workflow header stays within 120px while retaining all controls at narrow widths',async({page})=>{
  await page.setViewportSize({width:1680,height:1000});await page.goto('/');
  const header=page.getByRole('banner');await expect(header.getByRole('radio',{name:'Mobil',exact:true})).toBeVisible();
  expect((await header.boundingBox())!.height).toBeLessThanOrEqual(120);
  await page.setViewportSize({width:320,height:850});
  expect((await header.boundingBox())!.height).toBeLessThanOrEqual(120);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(320);
  await header.getByRole('radio',{name:'Tablet',exact:true}).click();
  await expect(header.getByRole('radio',{name:'Tablet',exact:true})).toBeChecked();
  await header.getByRole('button',{name:'Kaydet',exact:true}).click();
  expect((await header.getByRole('button',{name:'Kaydet',exact:true}).boundingBox())!.height).toBeGreaterThanOrEqual(44);
});


test('selection groups show six ordered labels and element tabs have symmetric spacing',async({page})=>{
  await page.setViewportSize({width:1680,height:1000});await page.goto('/');
  for(const [number,label] of ['Ürün türü','Cihaz grubu','Alt kırılım','Metin kümesi','Element','Kullanım konumu'].entries()){
    await expect(page.locator(`[data-workflow-step="${number+1}"]`)).toHaveText(`${number+1}${label}`);
  }
  await expect(page.getByRole('heading',{name:/Ekran [12]/})).toHaveCount(0);
  const nav=page.getByRole('navigation',{name:'Bu kümedeki elementler',exact:true});
  const spacing=await nav.evaluate(el=>({top:getComputedStyle(el).paddingTop,bottom:getComputedStyle(el).paddingBottom}));expect(spacing.top).toBe(spacing.bottom);expect(parseFloat(spacing.top)).toBeGreaterThan(0);
  expect((await page.getByRole('banner').boundingBox())!.height).toBeLessThanOrEqual(120);
});


test('inspector removes repeated specimen content but keeps review state and conditional contrast warnings',async({page})=>{
  await page.goto('/');
  const form=page.getByRole('region',{name:'H1 karar formu',exact:true});
  await expect(form.getByTestId('form-sample')).toHaveCount(0);
  await expect(form.getByText('Yeşil işaret: proje önerisi.',{exact:false})).toHaveCount(0);
  await expect(form.getByText('Taslak',{exact:true})).toBeVisible();
  await expect(form.getByRole('alert')).toHaveCount(0);
  await page.getByRole('button',{name:'Kararı kaydet ve devam et',exact:true}).click();
  await page.getByRole('navigation',{name:'Bu kümedeki elementler',exact:true}).getByRole('button',{name:'H1',exact:true}).click();
  await expect(form.getByText('Onaylandı',{exact:true})).toBeVisible();
  await page.getByLabel('Yazı boyutu',{exact:true}).fill('26');
  await expect(form.getByText('Yeniden incele',{exact:true})).toBeVisible();
  await expect(form.getByRole('button',{name:'Çıktı tonları · açık / koyu',exact:true})).toHaveCount(0);
  await expect(form.getByRole('radiogroup',{name:'Koyu tema metin rengi',exact:true})).toBeVisible();
  await form.getByRole('radiogroup',{name:'Açık tema metin rengi',exact:true}).locator('label').filter({hasText:'#808080'}).click();
  await expect(form.getByRole('alert')).toHaveCount(0);
  await page.getByLabel('Yazı boyutu',{exact:true}).fill('16');
  await expect(form.getByRole('alert')).toBeVisible();
});

test('inspector owns element and theme controls and step badges are circular',async({page})=>{
  await page.goto('/');
  const form=page.getByRole('region',{name:'H1 karar formu',exact:true});
  await expect(form.getByRole('navigation',{name:'Bu kümedeki elementler'})).toBeVisible();
  await expect(form.getByRole('radiogroup',{name:'Önizleme teması'})).toBeVisible();
  const badge=page.locator('[data-workflow-step="5"] > span').first();
  const shape=await badge.evaluate(el=>{const s=getComputedStyle(el);return {radius:s.borderRadius,width:s.width,height:s.height,border:s.borderTopWidth};});
  expect(shape.radius).toBe('100%');
  expect(shape.width).toBe(shape.height);
  expect(shape.border).toBe('2px');
});

test('output color fields retain their own light and dark surfaces across tool themes',async({page})=>{
  await page.goto('/');
  const light=page.locator('[data-output-theme="light"]');
  const dark=page.locator('[data-output-theme="dark"]');
  for(let i=0;i<2;i++){
    await expect(light).toHaveCSS('background-color','rgb(255, 255, 255)');
    await expect(light.getByRole('textbox')).toHaveCSS('background-color','rgb(255, 255, 255)');
    await expect(dark).toHaveCSS('background-color','rgb(27, 27, 26)');
    await expect(dark.getByRole('textbox')).toHaveCSS('background-color','rgb(27, 27, 26)');
    await page.getByRole('button',{name:'Uygulama temasını değiştir',exact:true}).click();
  }
});

test('in-device line tests follow preview theme independently from interface theme',async({page})=>{
  await page.goto('/');
  const first=page.getByRole('region',{name:'Ekran 1 · Seçili element',exact:true});
  await first.getByRole('radiogroup',{name:'Seçili ekran görünümü',exact:true}).getByText('Satır testleri',{exact:true}).click();
  const near=first.getByRole('region',{name:'Satır yüksekliği canlı testi',exact:true});
  const matrix=first.getByTestId('device-line-matrix');
  for(const surface of [near,matrix]) await expect(surface).toHaveCSS('background-color','rgb(255, 255, 255)');
  await page.getByRole('button',{name:'Uygulama temasını değiştir',exact:true}).click();
  for(const surface of [near,matrix]) await expect(surface).toHaveCSS('background-color','rgb(255, 255, 255)');
  await page.getByRole('radiogroup',{name:'Önizleme teması',exact:true}).getByText('Koyu',{exact:true}).click();
  for(const surface of [near,matrix]) await expect(surface).toHaveCSS('background-color','rgb(26, 26, 26)');
  await expect(near.getByTestId('near-line-sample')).toHaveCSS('color','rgb(224, 224, 224)');
  await page.getByRole('button',{name:'Uygulama temasını değiştir',exact:true}).click();
  for(const surface of [near,matrix]) await expect(surface).toHaveCSS('background-color','rgb(26, 26, 26)');
});

test('all device families separate optical material from live content',async({page})=>{
  await page.goto('/');
  for(const name of ['Mobil','Tablet','Laptop','Bilgisayar','Televizyon']){
    await page.getByRole('radio',{name,exact:true}).click();
    const screen=page.getByRole('region',{name:/Önizleme ekranı,/}).first();
    const shell=screen.locator('..');
    await expect(shell).toHaveCSS('background-image',/linear-gradient/);
    await expect(screen).toHaveCSS('background-image','none');
    await expect(screen).toHaveCSS('background-color','rgb(255, 255, 255)');
  }
});

test('phone frames distinguish classic android notch and island hardware',async({page})=>{
  await page.goto('/');
  for(const [width,profile] of [[320,'classic'],[360,'android'],[375,'notch'],[390,'notch'],[414,'notch'],[430,'island']] as const){
    await page.getByRole('radio',{name:`${width} px`,exact:true}).click();
    const screen=page.getByRole('region',{name:`Önizleme ekranı, ${width} piksel`,exact:true}).first();
    await expect(screen.locator('..')).toHaveAttribute('data-profile',profile);
    expect(await screen.evaluate(el=>el.clientWidth)).toBe(width);
  }
});

test('mobile-first engine learns confirmed choices, protects edits and survives reload',async({page})=>{
  await page.setViewportSize({width:320,height:850});await page.goto('/');
  await page.getByLabel('Yazı boyutu',{exact:true}).fill('40');
  await page.getByRole('button',{name:'Kararı kaydet ve devam et',exact:true}).click();
  await expect(page.getByRole('region',{name:'H2 karar formu',exact:true})).toBeVisible();
  await expect(page.getByLabel('Yazı boyutu',{exact:true})).toHaveValue('35 px');
  const panel=page.locator('details').filter({has:page.locator('summary').filter({hasText:'Karar motoru'})});
  await panel.locator('summary').click();
  await expect(panel.getByText(/320 px · H1/)).toBeVisible();
  await expect(page.getByText('Taslak',{exact:true})).toBeVisible();
  await page.getByLabel('Yazı boyutu',{exact:true}).fill('33');
  await page.getByRole('button',{name:'Kaydet',exact:true}).click();
  await page.reload();
  await expect(page.getByLabel('Yazı boyutu',{exact:true})).toHaveValue('33 px');
  await page.locator('summary').filter({hasText:'Karar motoru'}).click();
  await page.getByRole('button',{name:'Otomatik yeniden hesapla',exact:true}).click();
  await expect(page.getByLabel('Yazı boyutu',{exact:true})).toHaveValue('35 px');
  await page.getByRole('button',{name:'Otomatik uygulamayı geri al',exact:true}).click();
  await expect(page.getByLabel('Yazı boyutu',{exact:true})).toHaveValue('33 px');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(320);
});

test('engine carries a mobile decision forward and refuses insufficient contrast approval',async({page})=>{
  await page.goto('/');
  await page.getByLabel('Yazı boyutu',{exact:true}).fill('40');
  await page.getByRole('button',{name:'Kararı kaydet ve devam et',exact:true}).click();
  await page.getByRole('radio',{name:'360 px',exact:true}).click();
  await expect(page.getByLabel('Yazı boyutu',{exact:true})).toHaveValue('41 px');
  await page.getByLabel('Yazı boyutu',{exact:true}).fill('16');
  await page.locator('[data-output-theme="light"]').locator('label').filter({hasText:'#808080'}).click();
  await expect(page.getByRole('button',{name:'Kararı kaydet ve devam et',exact:true})).toBeDisabled();
  await expect(page.getByText(/Kaydetmek için açık ve koyu tema kontrastını düzelt/)).toBeVisible();
});

test('engine decisions reach the standard export and free editor',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('genux-type-lab-v2',JSON.stringify({format:'genux-typography-decisions',version:2,scope:'changed',contexts:{},ui:{tourDone:true}})));
  await page.goto('/?ctx=html&role=h1&device=m320');
  await page.getByLabel('Yazı boyutu',{exact:true}).fill('40');
  await page.getByRole('button',{name:'Kararı kaydet ve devam et',exact:true}).click();
  await page.getByRole('button',{name:'Serbest editör',exact:true}).click();
  await expect(page.getByRole('textbox',{name:'Boyut değeri (px)',exact:true})).toHaveValue('40');
  await page.getByRole('button',{name:'Karar akışına dön',exact:true}).click();
  await expect(page.getByRole('region',{name:'H2 karar formu',exact:true})).toBeVisible();
  await expect(page.getByLabel('Yazı boyutu',{exact:true})).toHaveValue('35 px');
});


test('free editor changes return to workflow and are preserved on a second editor switch',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('genux-type-lab-v2',JSON.stringify({format:'genux-typography-decisions',version:2,scope:'changed',contexts:{},ui:{tourDone:true}})));
  await page.goto('/?ctx=html&role=h1&device=m320');
  await page.getByLabel('Yazı boyutu',{exact:true}).fill('40');
  await page.getByRole('button',{name:'Kararı kaydet ve devam et',exact:true}).click();
  await page.getByRole('button',{name:'Serbest editör',exact:true}).click();
  const size=page.getByRole('textbox',{name:'Boyut değeri (px)',exact:true});
  await expect(size).toHaveValue('40');await size.fill('42');await size.press('Enter');
  await page.getByRole('button',{name:'Karar akışına dön',exact:true}).click();
  await page.getByRole('navigation',{name:'Bu kümedeki elementler',exact:true}).getByRole('button',{name:'H1',exact:true}).click();
  await expect(page.getByLabel('Yazı boyutu',{exact:true})).toHaveValue('42 px');
  await expect(page.getByText('Yeniden incele',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Serbest editör',exact:true}).click();
  await expect(size).toHaveValue('42');
});


test('engine panel and large line sample retain visible keyboard focus at 320px',async({page})=>{
  await page.setViewportSize({width:320,height:850});await page.goto('/');
  await page.getByLabel('Yazı boyutu',{exact:true}).fill('80');
  const summary=page.locator('summary').filter({hasText:'Karar motoru'});
  await page.keyboard.press('Tab');await summary.focus();
  await expect(summary).toBeFocused();
  expect(await summary.evaluate(el=>getComputedStyle(el).boxShadow)).not.toBe('none');
  await summary.press('Enter');
  await expect(page.getByRole('button',{name:'Otomatik yeniden hesapla',exact:true})).toBeVisible();
  await page.getByRole('radiogroup',{name:'Seçili ekran görünümü',exact:true}).getByText('Satır testleri',{exact:true}).click();
  await page.keyboard.press('Tab');
  const sample=page.getByRole('region',{name:'Satır testi metni',exact:true});
  await sample.focus();await expect(sample).toBeFocused();
  expect(await sample.evaluate(el=>getComputedStyle(el).boxShadow)).not.toBe('none');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(320);
});

test('failed projected workspace write cannot turn old core values into workflow edits on reload',async({page})=>{
  await page.addInitScript(()=>{
    const original=Storage.prototype.setItem;
    Storage.prototype.setItem=function(key,value){
      if(key==='genux-type-lab-v2'){
        const data=JSON.parse(value);
        if(data.contexts?.html?.roles?.h1?.fontSize?.min===40)throw new DOMException('Simulated projected write failure','QuotaExceededError');
      }
      return original.call(this,key,value);
    };
  });
  await page.goto('/');await page.getByLabel('Yazı boyutu',{exact:true}).fill('40');
  await page.getByRole('button',{name:'Kararı kaydet ve devam et',exact:true}).click();
  await page.getByRole('button',{name:'Serbest editör',exact:true}).click();
  await expect(page.getByText('Editöre aktarım kaydedilemedi.',{exact:false})).toBeVisible();
  await page.reload();
  await page.getByRole('navigation',{name:'Bu kümedeki elementler',exact:true}).getByRole('button',{name:'H1',exact:true}).click();
  await expect(page.getByLabel('Yazı boyutu',{exact:true})).toHaveValue('40 px');
});

test('pending editor handoff prevents edits until its latest snapshot is committed',async({page})=>{
  await page.addInitScript(()=>{
    const descriptor=Object.getOwnPropertyDescriptor(IDBTransaction.prototype,'oncomplete')!;
    Object.defineProperty(IDBTransaction.prototype,'oncomplete',{...descriptor,set(handler){descriptor.set!.call(this,handler?function(this:IDBTransaction,event:Event){setTimeout(()=>handler.call(this,event),250);}:handler);}});
  });
  await page.goto('/?ctx=html&role=h1&device=m320');
  await page.getByLabel('Yazı boyutu',{exact:true}).fill('40');
  await page.getByRole('button',{name:'Serbest editör',exact:true}).click();
  await expect(page.locator('[inert][aria-busy="true"]')).toHaveCount(1);
  await page.keyboard.type('99');
  await expect(page.getByRole('textbox',{name:'Boyut değeri (px)',exact:true})).toHaveValue('40');
});

test('real phone models preserve body ratios, viewport geometry and aligned recessed screen apertures',async({page})=>{
  await page.goto('/');
  for(const [width,height,bodyWidth,bodyHeight,name] of [[320,480,58.6,115.2,'iPhone 4'],[360,800,69.1,151.7,'Galaxy S20'],[375,812,64.2,131.5,'iPhone 13 mini'],[390,844,71.5,146.7,'iPhone 12'],[414,896,75.7,150.9,'iPhone 11'],[430,932,76.7,159.9,'iPhone 15 Pro Max']] as const){
    const choice=page.getByRole('radio',{name:`${width} px`,exact:true});await expect(choice.getByText(name,{exact:true})).toBeVisible();await choice.click();
    const screen=page.getByRole('region',{name:`Önizleme ekranı, ${width} piksel`,exact:true}).first();
    const metrics=await screen.evaluate(el=>{const body=el.parentElement!;const aperture=body.querySelector('[data-screen-depth]')!;return {body:body.getBoundingClientRect().toJSON(),screen:el.getBoundingClientRect().toJSON(),aperture:aperture.getBoundingClientRect().toJSON(),shadow:getComputedStyle(aperture).boxShadow,pointer:getComputedStyle(aperture).pointerEvents,pattern:getComputedStyle(body).backgroundImage};});
    expect(metrics.body.height/metrics.body.width).toBeCloseTo(bodyHeight/bodyWidth,3);
    expect(metrics.screen.width).toBe(width);expect(metrics.screen.height).toBe(height);
    expect(metrics.aperture).toEqual(metrics.screen);expect(metrics.shadow).not.toBe('none');expect(metrics.pointer).toBe('none');
    expect(metrics.pattern).not.toContain('repeating-linear-gradient');
  }
});

test('one bold measurement and preview theme share the review badge row without a duplicate H1 heading',async({page})=>{
  await page.goto('/');
  const theme=page.getByRole('radiogroup',{name:'Önizleme teması',exact:true});
  const row=theme.locator('..');await expect(row.getByText('Taslak',{exact:true})).toBeVisible();
  const readout=row.locator('strong').filter({hasText:/^H1 · 32 \/ 40 px$/});
  await expect(readout).toHaveCount(1);await expect(readout).toBeVisible();
  expect(Number(await readout.evaluate(el=>getComputedStyle(el).fontWeight))).toBeGreaterThanOrEqual(600);
  const form=page.getByRole('region',{name:'H1 karar formu',exact:true});
  await expect(form.getByText('H1 · 32 / 40 px',{exact:true})).toHaveCount(1);
  await expect(form.getByRole('heading',{name:'H1',exact:true})).toHaveCount(0);
  await expect(form.getByText('H1',{exact:true})).toHaveCount(1); // The role tab alone; no repeated identity label.
});

test('selected screen defaults to content and contains both line test variants only in tests mode',async({page})=>{
  await page.goto('/');
  const first=page.getByRole('region',{name:'Ekran 1 · Seçili element',exact:true});
  const screen=first.getByRole('region',{name:'Kaydırılabilir ekran içeriği, 320 piksel',exact:true});
  const mode=screen.getByRole('radiogroup',{name:'Seçili ekran görünümü',exact:true});
  await expect(mode.getByRole('radio',{name:'İçerik',exact:true})).toBeChecked();
  await expect(screen.locator('[data-example-role=h1]')).toBeVisible();
  await expect(page.getByTestId('near-line-sample')).toHaveCount(0);
  await expect(page.getByTestId('device-line-matrix')).toHaveCount(0);
  await mode.getByText('Satır testleri',{exact:true}).click();
  await expect(screen.getByTestId('near-line-sample')).toBeAttached();
  await expect(screen.getByTestId('device-line-matrix')).toBeAttached();
  for(const count of [1,2,5]) await expect(screen.getByTestId(`device-line-sample-${count}`).locator(':scope > div')).toHaveCount(count);
  await expect(screen.locator('[data-example-role]')).toHaveCount(0);
  await expect(page.getByTestId('group-surface').locator('[data-group-role]')).toHaveCount(6);
  await mode.getByText('İçerik',{exact:true}).click();
  await expect(screen.locator('[data-example-role=h1]')).toBeVisible();
  await expect(page.getByTestId('near-line-sample')).toHaveCount(0);
  await expect(page.getByTestId('device-line-matrix')).toHaveCount(0);
});

for(const [family,width,height] of [['Mobil',320,480],['Tablet',768,1024]] as const){
  test(`${family} orientation changes both viewports while retaining the role and original decision profile`,async({page})=>{
    await page.setViewportSize({width:1920,height:1100});await page.goto('/');
    await page.getByRole('radio',{name:family,exact:true}).click();
    await page.getByRole('radio',{name:`${width} px`,exact:true}).click();
    await page.getByRole('navigation',{name:'Bu kümedeki elementler',exact:true}).getByRole('button',{name:'H2',exact:true}).click();
    await page.getByLabel('Yazı boyutu',{exact:true}).fill('29');
    await page.getByLabel('Karar notu',{exact:true}).fill('Yön değişiminde aynı karar');
    const exportSnapshot=async()=>{
      const pending=page.waitForEvent('download');await page.getByRole('button',{name:'JSON indir',exact:true}).click();
      const stream=await(await pending).createReadStream();let content='';for await(const chunk of stream!)content+=chunk.toString();
      return JSON.parse(content);
    };
    const before=await exportSnapshot();
    const orientation=page.getByRole('radiogroup',{name:'Önizleme yönü',exact:true});
    await expect(orientation.getByRole('radio',{name:'Dikey',exact:true})).toBeChecked();
    for(const [name,w,h] of [['Yatay',height,width],['Dikey',width,height]] as const){
      await orientation.getByText(name,{exact:true}).click();
      const screens=page.getByRole('region',{name:`Önizleme ekranı, ${w} piksel`,exact:true});
      await expect(screens).toHaveCount(2);
      for(const screen of await screens.all()){
        await expect(screen).toHaveCSS('width',`${w}px`);await expect(screen).toHaveCSS('height',`${h}px`);
      }
      await expect(page.getByTestId('group-surface')).toHaveCSS('width',`${w}px`);
      await expect(page.getByRole('region',{name:'H2 karar formu',exact:true})).toBeVisible();
      await expect(page.getByLabel('Yazı boyutu',{exact:true})).toHaveValue('29 px');
      await expect(page.getByLabel('Karar notu',{exact:true})).toHaveValue('Yön değişiminde aynı karar');
      await expect(page.locator('[data-group-role=h2]')).toHaveCSS('font-size','29px');
      await expect(page.getByRole('radio',{name:`${width} px`,exact:true})).toBeChecked();
      const after=await exportSnapshot();
      expect(after.contexts).toEqual(before.contexts);
      for(const key of ['cursor','role','profiles','reviews','notes']) expect(after.workflow[key]).toEqual(before.workflow[key]);
    }
    await page.getByRole('radio',{name:'Laptop',exact:true}).click();
    await expect(orientation).toHaveCount(0);
  });
}

test('right stage header combines global group and current element progress and updates on approval',async({page})=>{
  await page.setViewportSize({width:1680,height:1000});await page.goto('/');
  const progress=page.getByRole('group',{name:'Çalışma ilerlemesi',exact:true});
  await expect(progress).toHaveCount(1);
  await expect(progress.getByRole('progressbar')).toHaveCount(2);
  const global=progress.getByRole('progressbar',{name:'Tüm kümelerin onay ilerlemesi',exact:true});
  const local=progress.getByRole('progressbar',{name:'Geçerli kümedeki elementlerin onay ilerlemesi',exact:true});
  const globalLabel=await global.getAttribute('aria-valuetext');
  expect(globalLabel).toMatch(/^0 \/ [1-9]\d* onaylı küme$/);
  await expect(local).toHaveAttribute('aria-valuetext','0 / 6 element onaylandı');
  const heading=page.getByRole('heading',{name:'Headings',exact:true});
  const headingBox=await heading.boundingBox(),progressBox=await progress.boundingBox();
  expect(progressBox!.x).toBeGreaterThan(headingBox!.x+headingBox!.width);
  expect(Math.min(progressBox!.y+progressBox!.height,headingBox!.y+headingBox!.height)-Math.max(progressBox!.y,headingBox!.y)).toBeGreaterThan(0);
  await page.getByRole('button',{name:'Kararı kaydet ve devam et',exact:true}).click();
  await expect(local).toHaveAttribute('aria-valuetext','1 / 6 element onaylandı');
  await expect(global).toHaveAttribute('aria-valuetext',globalLabel!);
  for(let i=0;i<5;i++) await page.getByRole('button',{name:'Kararı kaydet ve devam et',exact:true}).click();
  await expect(global).toHaveAttribute('aria-valuetext',globalLabel!.replace(/^0 /,'1 '));
  await expect(page.getByRole('complementary',{name:'Karar yolculuğu'}).getByRole('progressbar')).toHaveCount(0);
});

test('classic tablet home key stays below its screen and modern safe areas remain fixed while scrolling',async({page})=>{
  await page.goto('/');await page.getByRole('radio',{name:'Tablet',exact:true}).click();await page.getByRole('radio',{name:'768 px',exact:true}).click();
  const tablet=page.getByRole('region',{name:'Önizleme ekranı, 768 piksel',exact:true}).first();
  const home=tablet.locator('..').locator('[data-device-home]');
  expect((await home.boundingBox())!.y).toBeGreaterThanOrEqual((await tablet.boundingBox())!.y+(await tablet.boundingBox())!.height);
  await page.getByRole('radio',{name:'Mobil',exact:true}).click();
  for(const width of [390,430]){
    await page.getByRole('radio',{name:`${width} px`,exact:true}).click();
    const aperture=page.getByRole('region',{name:`Önizleme ekranı, ${width} piksel`,exact:true}).first();
    const scroll=aperture.getByRole('region',{name:`Kaydırılabilir ekran içeriği, ${width} piksel`,exact:true});
    await scroll.evaluate(el=>{const filler=document.createElement('p');filler.textContent='Uzun içerik denemesi. '.repeat(500);el.append(filler);el.scrollTop=el.scrollHeight;});
    const hardware=aperture.locator('..').locator('[data-device-hardware]');
    const bounds=await scroll.boundingBox(),cutout=await hardware.boundingBox();
    expect(bounds!.y).toBeGreaterThanOrEqual(cutout!.y+cutout!.height);
    expect(await scroll.evaluate(el=>el.scrollTop)).toBeGreaterThan(0);
  }
});
