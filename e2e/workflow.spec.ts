import { expect, test } from '@playwright/test';

test('collects a decision, resumes immediately after editor switch, and round-trips JSON with notes', async({page})=>{
  await page.goto('/');
  await page.getByLabel('Yazı boyutu',{exact:true}).fill('34');
  await page.getByLabel('Karar notu',{exact:true}).fill('320 px mobil başlık kararı');
  await page.getByRole('button',{name:'Kararı kaydet ve devam et'}).click();
  await page.getByRole('button',{name:'Serbest editör',exact:true}).click();
  await page.getByRole('button',{name:'Karar akışına dön'}).click();
  await expect(page.getByRole('heading',{name:'H2',exact:true})).toBeVisible();
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
  await expect(page.getByRole('region',{name:'Ekran 1 · Seçili element'})).toContainText('Ekran 1 · H2');
  await page.getByLabel('Yazı boyutu',{exact:true}).fill('30');
  await expect(group.locator('[data-group-role=h1]')).toHaveCSS('font-size','40px');
  await expect(group.locator('[data-group-role=h2]')).toHaveCSS('font-size','30px');
  await page.getByRole('combobox',{name:'Metin kümesi',exact:true}).click();await page.getByRole('option',{name:'Body',exact:true}).click();
  expect(await group.locator('[data-group-role]').count()).toBeGreaterThan(2);
});

test('puts specimen text on its own preview theme background even with a dark tool panel',async({page})=>{
  await page.goto('/');await page.getByTestId('form-sample').waitFor();
  if(await page.locator('html').getAttribute('data-mantine-color-scheme')!=='dark') await page.getByRole('button',{name:'Uygulama temasını değiştir'}).click();
  const sample=page.getByTestId('form-sample');
  await expect(sample).toHaveCSS('background-color','rgb(255, 255, 255)');
  await expect(sample).toHaveCSS('color','rgb(20, 20, 20)');
  await page.getByText('Koyu',{exact:true}).click();
  await expect(sample).toHaveCSS('background-color','rgb(26, 26, 26)');
  await expect(sample).toHaveCSS('color','rgb(242, 242, 242)');
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
  await expect(page.getByTestId('form-sample')).toHaveCSS('font-weight','700');
  await expect(choice).toHaveAttribute('tabindex','0');
  await expect(page.getByRole('radio',{name:'Ağırlık 600',exact:true})).toHaveAttribute('tabindex','-1');
  await choice.focus();await choice.press('ArrowRight');await expect(page.getByRole('radio',{name:'Ağırlık 800',exact:true})).toBeChecked();
  await page.setViewportSize({width:320,height:850});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(320);
});

test('line height offers only the approved horizontal radio choices',async({page})=>{
  await page.goto('/');
  const choice=page.getByRole('radio',{name:'Satır yüksekliği 1.5',exact:true});await choice.click();await expect(choice).toBeChecked();
  await expect(page.getByTestId('form-sample')).toHaveCSS('line-height','48px');
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

test('smart sticky inspector stays in viewport and exposes a live multiline height test beside the controls',async({page})=>{
  await page.setViewportSize({width:1680,height:900});await page.goto('/');
  const form=page.getByRole('region',{name:'H1 karar formu',exact:true});await form.waitFor();
  await page.getByRole('radio',{name:'Satır yüksekliği 2',exact:true}).click();
  const testSample=page.getByTestId('near-line-sample');await expect(testSample).toHaveCSS('line-height','64px');
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
  await expect(screen).toHaveCSS('height','568px');
  const dimensions=await screen.evaluate(el=>{const frame=el.parentElement!;const stage=frame.parentElement!.parentElement!.parentElement!.parentElement!;return {frame:frame.getBoundingClientRect().toJSON(),stage:stage.getBoundingClientRect().toJSON()};});
  expect(dimensions.frame.height).toBe(708);
  expect(dimensions.frame.bottom).toBeLessThanOrEqual(dimensions.stage.bottom);
  await expect(first.getByText(/ölçek %100/)).toBeVisible();
  await page.setViewportSize({width:320,height:850});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(320);
});

test('scroll chains from the preview and inspector boundaries to the page',async({page})=>{
  await page.setViewportSize({width:1680,height:900});await page.goto('/');
  const screen=page.getByRole('region',{name:'Ekran 1 · Seçili element',exact:true}).getByRole('region',{name:'Önizleme ekranı, 320 piksel',exact:true});
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
  expect(b!.x-a!.x-a!.width).toBeLessThan(120);
  expect(b!.x-a!.x-a!.width).toBeGreaterThan(0);
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
  await page.getByRole('button',{name:'Çıktı tonları · açık / koyu',exact:true}).click();
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


test('sidebar separates product progress from text-group navigation',async({page})=>{
  await page.setViewportSize({width:1680,height:1000});await page.goto('/');
  const rail=page.getByRole('complementary',{name:'Karar yolculuğu'});
  await expect(rail.getByRole('region',{name:'Çalışma ilerlemesi'})).toBeVisible();
  const breakpoints=rail.getByRole('radiogroup',{name:'Alt kırılım',exact:true});
  await expect(breakpoints.getByRole('radio')).toHaveCount(6);
  const first=await breakpoints.getByRole('radio',{name:'320 px',exact:true}).boundingBox();
  const second=await breakpoints.getByRole('radio',{name:'360 px',exact:true}).boundingBox();
  expect(second!.y).toBeGreaterThan(first!.y+first!.height);
  expect(second!.x).toBe(first!.x);
  await expect(rail.getByText('0 / 1144 onaylı küme',{exact:true})).toBeVisible();
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
  await target.getByText('Galaxy S',{exact:true}).click();
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
