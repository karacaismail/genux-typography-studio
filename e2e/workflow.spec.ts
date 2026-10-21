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
  await page.getByRole('combobox',{name:'Cihaz grubu',exact:true}).click();
  await page.getByRole('option',{name:'Tablet',exact:true}).click();
  await page.getByRole('combobox',{name:'Alt kırılım',exact:true}).click();
  await expect(page.getByRole('option').filter({hasText:'834 px'})).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('combobox',{name:'Cihaz grubu',exact:true}).click();
  await page.getByRole('option',{name:'Televizyon',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Headings · başlıklar',exact:true})).toBeVisible();
  await page.getByRole('combobox',{name:'Alt kırılım',exact:true}).click();
  await expect(page.getByRole('option').filter({hasText:'3840 px'})).toBeVisible();
  await page.keyboard.press('Escape');
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
