import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDebouncedWriter, prepareWorkflowImport } from './persistence';
import { applyOverrideAt, buildExport, defaultDecisions, resolveAt } from '../../core';
import { lockDecision } from './engine';
import { approve, decisionsForStep, emptyFlow, FLOW_STEPS, isReviewed, reviewKey } from './model';
afterEach(()=>vi.useRealTimers());
describe('workflow write debounce',()=>{
  it('writes only the latest snapshot after 300ms',async()=>{
    vi.useFakeTimers();const write=vi.fn().mockResolvedValue(undefined);const writer=createDebouncedWriter(write,vi.fn());
    writer.schedule('old');await vi.advanceTimersByTimeAsync(200);writer.schedule('new');
    await vi.advanceTimersByTimeAsync(299);expect(write).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);expect(write).toHaveBeenCalledExactlyOnceWith('new');
  });
  it('flushes immediately, cancels the timer, and serializes pending writes',async()=>{
    vi.useFakeTimers();let release!:()=>void;const seen:string[]=[];
    const writer=createDebouncedWriter(async(value:string)=>{seen.push(value);if(value==='first')await new Promise<void>(resolve=>{release=resolve;});},vi.fn());
    const first=writer.flush('first');await Promise.resolve();writer.schedule('last');const last=writer.flush();
    expect(seen).toEqual(['first']);release();await Promise.all([first,last]);
    await vi.advanceTimersByTimeAsync(1000);expect(seen).toEqual(['first','last']);
  });
  it('reports background failures, rejects explicit failures, and permits a later retry',async()=>{
    vi.useFakeTimers();const fail=new Error('quota');const onError=vi.fn();const write=vi.fn().mockRejectedValueOnce(fail).mockRejectedValueOnce(fail).mockResolvedValue(undefined);
    const writer=createDebouncedWriter(write,onError);writer.schedule('background');await vi.advanceTimersByTimeAsync(300);
    expect(onError).toHaveBeenCalledWith(fail);await expect(writer.flush('explicit')).rejects.toThrow('quota');
    await expect(writer.flush('retry')).resolves.toBeUndefined();
  });
});

describe('workflow import preparation',()=>{
  const step=FLOW_STEPS.find(s=>s.ctx==='html' && s.device.id==='l1280' && s.group==='headings')!;
  const d=applyOverrideAt(defaultDecisions(),'html','h1',{size:48,max:48,mode:'static',lh:1.5,mw:0},1280);
  const flow=approve({...emptyFlow(),cursor:step.key,role:'h1'},d,step,'h1');
  const notes={[reviewKey(step,'h1')]:'Keep this human reason'};
  it('keeps reviews and notes on plain v2 and invalidates changed live values',()=>{
    expect(isReviewed(flow,d,step,'h1')).toBe(true);
    const changed=applyOverrideAt(d,'html','h1',{w:400},1280);
    const result=prepareWorkflowImport(buildExport(changed,'all'),d,flow,notes);
    expect(result.notes).toBe(notes);
    expect(result.flow.reviews).toBe(flow.reviews);
    expect(isReviewed(result.flow,result.decisions,step,'h1')).toBe(false);
  });
  it('applies incoming 44 over an old manual 40 profile while retaining the human ledger',()=>{
    const manual=lockDecision({...emptyFlow(),cursor:step.key,role:'h1'},d,step,'h1',{size:40,max:40,mode:'static',w:700,mt:.4});
    const approved=approve(manual,d,step,'h1');
    const key=reviewKey(step,'h1');
    expect(approved.reviews[key]).toBeDefined();
    const before=JSON.stringify(approved);
    const incoming=applyOverrideAt(d,'html','h1',{size:44,max:44,mode:'static'},1280);
    const result=prepareWorkflowImport(buildExport(incoming,'all'),d,approved,notes);
    const actual=resolveAt(decisionsForStep(result.flow,result.decisions,step),'html','h1',1280);
    expect(actual.size).toBe(44);expect(actual.w).toBe(700);expect(actual.mt).toBe(.4);
    expect(result.flow.reviews[key]).toBe(approved.reviews[key]);expect(result.notes).toBe(notes);
    expect(isReviewed(result.flow,result.decisions,step,'h1')).toBe(false);
    expect(JSON.stringify(approved)).toBe(before);
  });
  it('keeps an independent manual override when the imported core field did not change',()=>{
    const manual=lockDecision({...emptyFlow(),cursor:step.key,role:'h1'},d,step,'h1',{size:40,max:40,mode:'static'});
    const result=prepareWorkflowImport(buildExport(d,'all'),d,manual,notes);
    expect(result.flow).toBe(manual);
    expect(resolveAt(decisionsForStep(result.flow,result.decisions,step),'html','h1',1280).size).toBe(40);
  });
  it('clears flow and notes only after explicit replacement',()=>{
    const result=prepareWorkflowImport(buildExport(d,'all'),d,flow,notes,true);
    expect(result.flow).toEqual(emptyFlow());expect(result.notes).toEqual({});
  });
  it('rejects an invalid workflow envelope before returning any prepared mutations',()=>{
    expect(()=>prepareWorkflowImport({...buildExport(d,'all'),workflow:{version:999}},d,flow,notes)).toThrow();
    expect(flow.reviews[reviewKey(step,'h1')]).toBeDefined();expect(notes[reviewKey(step,'h1')]).toBe('Keep this human reason');
  });
});
it('urgent explicit snapshots invalidate older queued writes and start immediately',async()=>{
 let release!:()=>void;const blocked=new Promise<void>(resolve=>{release=resolve;});const started:string[]=[];
 const writer=createDebouncedWriter(async(value:string)=>{started.push(value);if(value==='active')await blocked;},()=>{});
 const active=writer.flush('active');await Promise.resolve();
 const obsolete=writer.flush('obsolete');const urgent=writer.flushImmediate('latest');
 expect(started).toEqual(['active','latest']);release();await Promise.all([active,obsolete,urgent]);
 expect(started).toEqual(['active','latest']);
});
