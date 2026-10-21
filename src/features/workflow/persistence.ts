import { eqProp, importData, PROPS, resolveAt, type Decisions } from '../../core';
import { emptyFlow, parseFlow, REVIEW_TARGETS, type FlowState } from './model';
import { workflowLocation } from './navigation';
import { lockDecision } from './engine';

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

/** Coalesce snapshots; explicit flushes share a serial queue so older writes cannot win. */
export function createDebouncedWriter<T>(write: (value:T)=>Promise<void>, onError:(error:unknown)=>void, delay=300) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: {value:T} | undefined;
  let queue=Promise.resolve();
  let sequence=0,obsoleteBefore=0;
  const cancel=()=>{clearTimeout(timer);timer=undefined;pending=undefined;};
  const flush=(value?:T):Promise<void>=>{
    if(value!==undefined)pending={value};
    clearTimeout(timer);timer=undefined;
    if(!pending)return queue;
    const snapshot=pending.value;pending=undefined;
    const ticket=++sequence;
    const result=queue.then(()=>ticket<obsoleteBefore?undefined:write(snapshot));
    queue=result.catch(()=>{});
    return result;
  };
  return {
    schedule(value:T){pending={value};clearTimeout(timer);timer=setTimeout(()=>{void flush().catch(onError);},delay);},
    flush,
    flushImmediate(value:T){
      cancel();obsoleteBefore=++sequence;
      const result=write(value);queue=result.catch(()=>{});return result;
    },
    cancel,
  };
}

/** Prepare all stores before applying an import; plain v2 preserves the ledger by default. */
export function prepareWorkflowImport(data:unknown, decisions:Decisions, flow:FlowState, notes:Record<string,string>, replace=false) {
  const imported=importData(data,decisions,workflowLocation(flow).ctx);
  const envelope=data as {workflow?:unknown};
  const hasWorkflow=envelope.workflow!==undefined;
  let nextFlow=hasWorkflow?parseFlow(envelope.workflow):replace?emptyFlow():flow;
  if(!hasWorkflow && !replace){
    const targets=new Set([...Object.keys(flow.profiles??{}),...Object.keys(flow.reviews)]);
    for(const key of targets){
      const target=REVIEW_TARGETS.get(key);if(!target)continue;
      const {step,role}=target;
      // Compare core snapshots, not the old workflow profile that can mask incoming fields.
      const before=resolveAt(decisions,step.ctx,role,step.device.w);
      const after=resolveAt(imported.decisions,step.ctx,role,step.device.w);
      const patch=Object.fromEntries(PROPS.filter(prop=>!eqProp(prop,before[prop],after[prop])).map(prop=>[prop,after[prop]]));
      if(Object.keys(patch).length)nextFlow=lockDecision(nextFlow,imported.decisions,step,role,patch);
    }
  }
  const rawNotes=hasWorkflow?(envelope.workflow as Record<string,unknown>).notes:undefined;
  const nextNotes=hasWorkflow?rawNotes && typeof rawNotes==='object' && !Array.isArray(rawNotes)?Object.fromEntries(Object.entries(rawNotes).filter(([,value])=>typeof value==='string')) as Record<string,string>:{}:replace?{}:notes;
  return {...imported,flow:nextFlow,notes:nextNotes};
}
