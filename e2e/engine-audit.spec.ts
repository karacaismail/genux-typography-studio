import { expect, test, type Page } from '@playwright/test';
import { applyOverrideAt, buildExport, defaultDecisions } from '../src/core';

async function storedFlow(page:Page) {
  return page.evaluate(()=>new Promise<{notes?:Record<string,string>;cursor:string;role:string}>((resolve,reject)=>{
    const request=indexedDB.open('genux-typography-workflow',1);
    request.onsuccess=()=>{
      const db=request.result,tx=db.transaction('workspace','readonly'),read=tx.objectStore('workspace').get('current');
      read.onsuccess=()=>{resolve(read.result);db.close();};read.onerror=()=>reject(read.error);
    };
    request.onerror=()=>reject(request.error);
  }));
}

const plainV2=()=>buildExport(applyOverrideAt(defaultDecisions(),'html','h1',{w:700},320),'all');
const inputFile=(json:unknown)=>({name:'decisions-v2.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(json))});

test('explicit deep links beat durable cursor and selection updates the URL including TV',async({page})=>{
  await page.goto('/?ctx=html&device=m320&role=h1');
  await page.getByLabel('Karar notu',{exact:true}).fill('Kaydedilen ilk konum');
  await page.getByRole('button',{name:'Kaydet',exact:true}).click();
  await expect.poll(async()=>(await storedFlow(page))?.notes?.['html:mobile:320:h1']).toBe('Kaydedilen ilk konum');
  await page.goto('/?ctx=marketing&device=t768&role=paragraph');
  await expect(page.getByRole('region',{name:'Paragraf karar formu',exact:true})).toBeVisible();
  await expect(page.getByRole('radio',{name:'Tablet',exact:true})).toHaveAttribute('data-checked');
  await page.getByRole('radio',{name:'Televizyon',exact:true}).click();
  await expect.poll(()=>new URL(page.url()).searchParams.get('device')).toMatch(/^tv/);
  await page.reload();
  await expect(page.getByRole('radio',{name:'Televizyon',exact:true})).toHaveAttribute('data-checked');
});

test('plain v2 import waits for a choice and preserves notes by default; replacement is explicit',async({page})=>{
  await page.goto('/?ctx=html&device=m320&role=h1');
  const note=page.getByLabel('Karar notu',{exact:true});
  await note.fill('Korunacak akış notu');
  await page.locator('input[type=file]').setInputFiles(inputFile(plainV2()));
  await expect(page.getByRole('radio',{name:'Akışı, onayları ve notları koru',exact:true})).toBeChecked();
  await expect(note).toHaveValue('Korunacak akış notu');
  await page.getByRole('button',{name:'İçe aktarmayı iptal et',exact:true}).click();
  await expect(note).toHaveValue('Korunacak akış notu');
  await page.locator('input[type=file]').setInputFiles(inputFile(plainV2()));
  await page.getByRole('button',{name:'JSON kararlarını uygula',exact:true}).click();
  await expect(note).toHaveValue('Korunacak akış notu');
  await page.locator('input[type=file]').setInputFiles(inputFile(plainV2()));
  await page.getByRole('radio',{name:'Akışı yeni başlangıçla değiştir',exact:true}).check();
  await page.getByRole('button',{name:'JSON kararlarını uygula',exact:true}).click();
  await expect(note).toHaveValue('');
});

test('pagehide flushes a pending note before the 300ms debounce',async({page})=>{
  await page.goto('/?ctx=html&device=m320&role=h1');
  await page.getByLabel('Karar notu',{exact:true}).fill('Çıkışta beklemeden sakla');
  await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
  await expect.poll(async()=>(await storedFlow(page))?.notes?.['html:mobile:320:h1']).toBe('Çıkışta beklemeden sakla');
});

test('explicit save failure keeps the form and its unsaved note',async({page})=>{
  await page.goto('/?ctx=html&device=m320&role=h1');
  await expect(page.getByLabel('Karar notu',{exact:true})).toBeVisible();
  await page.evaluate(()=>{IDBObjectStore.prototype.put=function(){throw new DOMException('audit quota','QuotaExceededError');};});
  await page.getByLabel('Karar notu',{exact:true}).fill('Hata halinde korunacak');
  await page.getByRole('button',{name:'Serbest editör',exact:true}).click();
  await expect(page.getByText('Tarayıcıya kayıt yapılamadı.',{exact:false})).toBeVisible();
  await expect(page.getByLabel('Karar notu',{exact:true})).toHaveValue('Hata halinde korunacak');
});

test('an immediate reload after save preserves the latest manual value',async({page})=>{
  await page.goto('/?workspace=workflow&ctx=html&device=m320&role=h2');
  const size=page.getByLabel('Yazı boyutu',{exact:true});
  await size.fill('33');await size.press('Tab');
  await page.getByRole('button',{name:'Kaydet',exact:true}).click();
  await page.reload();
  await expect(page.getByLabel('Yazı boyutu',{exact:true})).toHaveValue('33 px');
});


test('opener-cloned session storage never shares an active journal writer',async({page,context})=>{
 await page.goto('/?workspace=workflow&ctx=html&device=m320&role=h1');
 await expect(page.getByLabel('Karar notu',{exact:true})).toBeVisible();
 const owner=await page.evaluate(()=>sessionStorage.getItem('genux-workflow-tab'));
 const childPromise=context.waitForEvent('page');
 await page.evaluate(()=>window.open('/?workspace=workflow&ctx=html&device=m320&role=h2','_blank'));
 const child=await childPromise;await expect(child.getByLabel('Karar notu',{exact:true})).toBeVisible();
 const childOwner=await child.evaluate(()=>sessionStorage.getItem('genux-workflow-tab'));expect(childOwner).not.toBe(owner);
 for(const [tab,note]of [[page,'parent unsaved'],[child,'child unsaved']] as const){
  await tab.bringToFront();
  await tab.evaluate(()=>{IDBObjectStore.prototype.put=function(){throw new DOMException('test quota','QuotaExceededError');};});
  await tab.getByLabel('Karar notu',{exact:true}).fill(note);
  await expect(tab.getByLabel('Karar notu',{exact:true})).toHaveValue(note);
  await tab.getByRole('button',{name:'Kaydet',exact:true}).click();
  await expect(tab.getByText('Tarayıcıya kayıt yapılamadı.',{exact:false})).toBeVisible();
 }
 const journals=await page.evaluate(({owner,childOwner})=>[owner,childOwner].map(id=>localStorage.getItem(`genux-typography-workflow-journal-v1:${id}`)),{owner,childOwner});
 expect(journals[0]).toContain('parent unsaved');expect(journals[1]).toContain('child unsaved');
 await child.close();
});
