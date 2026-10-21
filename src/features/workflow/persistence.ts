/** IndexedDB keeps the complete review ledger beyond localStorage's small quota.
 * Each write is one atomic transaction; the original legacy record is never removed. */
let database: Promise<IDBDatabase> | undefined;
function db() {
  return database ??= new Promise<IDBDatabase>((resolve,reject)=>{
    const request=indexedDB.open('genux-typography-workflow',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('workspace');
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>{database=undefined;reject(request.error ?? new Error('IndexedDB açılamadı.'));};
    request.onblocked=()=>{database=undefined;reject(new Error('Kayıt veritabanı başka sekmede kilitli.'));};
  });
}
export async function readWorkflow(): Promise<unknown> {
  const database=await db();
  return new Promise((resolve,reject)=>{const tx=database.transaction('workspace','readonly');const req=tx.objectStore('workspace').get('current');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
}
export async function writeWorkflow(value:unknown): Promise<void> {
  const database=await db();
  return new Promise((resolve,reject)=>{const tx=database.transaction('workspace','readwrite');tx.objectStore('workspace').put(value,'current');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error ?? new Error('Kayıt iptal edildi.'));});
}
