import{expect,it,vi}from'vitest';
import{defaultDecisions,resolveAt}from'../../core';
import{emptyFlow,FLOW_STEPS,decisionsForStep}from'./model';
import{lockDecision,synchronizeDecision}from'./engine';
import{makeJournal,restoreJournal,JOURNAL_KEY,clearJournal}from'./journal';
const s=FLOW_STEPS.find(s=>s.ctx==='html'&&s.family==='mobile'&&s.device.w===320&&s.group==='headings')!;
it('recovers a small manual delta when navigation interrupts IndexedDB commit',()=>{
 const d=defaultDecisions(),base={flow:emptyFlow(),notes:{}};
 const latest={flow:lockDecision(base.flow,d,s,'h2',{size:33}),notes:{'html:mobile:320:h2':'kept note'}};
 const journal=makeJournal(base,latest);expect(JSON.stringify(journal).length).toBeLessThan(10000);
 const restored=restoreJournal(base,JSON.parse(JSON.stringify(journal)));expect(restored.conflicts).toBe(0);
 expect(resolveAt(decisionsForStep(restored.workspace.flow,d,s),'html','h2',320).size).toBe(33);
 expect(restored.workspace.notes).toEqual(latest.notes);
 expect(restoreJournal(restored.workspace,journal).conflicts).toBe(0);
});
it('does not overwrite a newer conflicting durable value',()=>{
 const d=defaultDecisions(),base={flow:emptyFlow(),notes:{}};
 const journal=makeJournal(base,{flow:lockDecision(base.flow,d,s,'h1',{size:40}),notes:{}});
 const current={flow:lockDecision(base.flow,d,s,'h1',{size:44}),notes:{}};
 const result=restoreJournal(current,journal);expect(result.conflicts).toBeGreaterThan(0);
 expect(resolveAt(decisionsForStep(result.workspace.flow,d,s),'html','h1',320).size).toBe(44);
});

it('recovery can supersede an intermediate automatic snapshot without overwriting humans',()=>{
 const d=defaultDecisions(),base={flow:emptyFlow(),notes:{}};
 const journal=makeJournal(base,{flow:lockDecision(base.flow,d,s,'h2',{size:33}),notes:{}});
 const current={flow:synchronizeDecision(base.flow,d,s,'h2'),notes:{}};
 const result=restoreJournal(current,journal);expect(result.conflicts).toBe(0);
 expect(resolveAt(decisionsForStep(result.workspace.flow,d,s),'html','h2',320).size).toBe(33);
});
it('recognizes an interrupted same-tab manual commit lineage but rejects a foreign commit',()=>{
 const d=defaultDecisions(),base={flow:lockDecision(emptyFlow(),d,s,'h1',{size:32}),notes:{},commit:'base'};
 const middle={flow:lockDecision(base.flow,d,s,'h1',{size:33}),notes:{},commit:'ours-33'};
 const latest={flow:lockDecision(middle.flow,d,s,'h1',{size:34}),notes:{}};
 const journal=makeJournal(base,latest,[middle]);
 const restored=restoreJournal(middle,journal);expect(restored.conflicts).toBe(0);expect(resolveAt(decisionsForStep(restored.workspace.flow,d,s),'html','h1',320).size).toBe(34);
 const foreign=restoreJournal({...middle,commit:'other-tab'},journal);expect(foreign.conflicts).toBeGreaterThan(0);expect(resolveAt(decisionsForStep(foreign.workspace.flow,d,s),'html','h1',320).size).toBe(33);
});

it('does not clear a newer recovery revision',()=>{
 localStorage.setItem(JOURNAL_KEY,'new-revision');clearJournal('old-revision');expect(localStorage.getItem(JOURNAL_KEY)).toBe('new-revision');clearJournal('new-revision');expect(localStorage.getItem(JOURNAL_KEY)).toBeNull();
});

it('keeps the recovery pointer discoverable across failed startup reads',async()=>{
 const old='startup-recovery';sessionStorage.setItem('genux-workflow-tab',old);
 const key=`genux-typography-workflow-journal-v1:${old}`;localStorage.setItem(key,'saved-recovery');
 vi.resetModules();await import('./journal');
 expect(sessionStorage.getItem('genux-workflow-tab')).toBe(old);
 // Another document after an interrupted IDB read must still discover the old key.
 vi.resetModules();const next=await import('./journal');
 expect(sessionStorage.getItem('genux-workflow-tab')).toBe(old);
 expect(next.readJournal()).toBe('saved-recovery');
 expect(localStorage.getItem(next.JOURNAL_KEY)).toBe('saved-recovery');
 expect(sessionStorage.getItem('genux-workflow-tab')).not.toBe(old);
 next.clearJournal('saved-recovery');sessionStorage.clear();
});
