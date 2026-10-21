import { test,expect } from '@playwright/test';
import { defaultDecisions } from '../src/core';
import { createFullLedger } from '../src/test/workflowLedger';
import { FLOW_STEPS,REVIEW_TARGETS } from '../src/features/workflow/model';

test('the complete approval ledger loads, edits and coalesces a real IndexedDB write',async({page})=>{
 const ledger=createFullLedger(defaultDecisions());
 await page.goto('/?workspace=workflow&ctx=html&device=m320&role=h1');
 await page.getByRole('region',{name:'H1 karar formu',exact:true}).waitFor();
 await page.getByRole('button',{name:'Kaydet',exact:true}).click();
 const payload={...ledger,notes:{}};
 const bytes=Buffer.byteLength(JSON.stringify(payload));
 const writeStart=performance.now();
 await page.evaluate(async value=>{
  await new Promise<void>((resolve,reject)=>{
   const req=indexedDB.open('genux-typography-workflow',1);
   req.onsuccess=()=>{const db=req.result,tx=db.transaction('workspace','readwrite');tx.objectStore('workspace').put(value,'current');tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};req.onerror=()=>reject(req.error);
  });
 },payload);
 const seedMs=performance.now()-writeStart;
 const loadStart=performance.now();await page.reload();
 const progress=page.getByRole('group',{name:'Çalışma ilerlemesi',exact:true});
 await expect(progress.getByText(`${FLOW_STEPS.length} / ${FLOW_STEPS.length} onaylı küme`,{exact:true})).toBeVisible();
 await expect(progress.getByText(`İnsan onayı: ${REVIEW_TARGETS.size}`,{exact:true})).toBeVisible();
 const loadMs=performance.now()-loadStart;
 // Finish any initial automatic save before measuring note keystrokes.
 await page.getByRole('button',{name:'Kaydet',exact:true}).click();
 await page.evaluate(()=>{
  const state=window as typeof window & {ledgerWrites?:number};state.ledgerWrites=0;
  const original=IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put=function(...args:Parameters<IDBObjectStore['put']>){state.ledgerWrites=(state.ledgerWrites??0)+1;return original.apply(this,args);};
 });
 const note=page.getByLabel('Karar notu',{exact:true});
 await note.pressSequentially('tam kayıt notu',{delay:10});
 expect(await page.evaluate(()=>(window as typeof window & {ledgerWrites?:number}).ledgerWrites)).toBe(0);
 await expect.poll(()=>page.evaluate(()=>(window as typeof window & {ledgerWrites?:number}).ledgerWrites)).toBe(1);
 const stored=await page.evaluate(()=>new Promise<{reviews:number;profiles:number;note:string}>((resolve,reject)=>{
  const req=indexedDB.open('genux-typography-workflow',1);
  req.onsuccess=()=>{const db=req.result,tx=db.transaction('workspace','readonly'),read=tx.objectStore('workspace').get('current');read.onsuccess=()=>{const value=read.result;resolve({reviews:Object.keys(value.reviews).length,profiles:Object.keys(value.profiles).length,note:value.notes['html:mobile:320:h1']});db.close();};read.onerror=()=>reject(read.error);};req.onerror=()=>reject(req.error);
 }));
 expect(stored.reviews).toBe(REVIEW_TARGETS.size);expect(stored.profiles).toBe(REVIEW_TARGETS.size);expect(stored.note).toBe('tam kayıt notu');
 console.info('Browser full-ledger evidence',JSON.stringify({targets:REVIEW_TARGETS.size,groups:FLOW_STEPS.length,bytes,seedMs,loadMs,noteWrites:1,browser:'project-selected Playwright engine'}));
});
