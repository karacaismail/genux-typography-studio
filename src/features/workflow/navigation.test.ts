import { freeEditorDeviceId, validateStudioSearch } from '../../app/search';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyOverrideAt, defaultDecisions, DEVICES, buildExport, STORAGE_KEY } from '../../core';
import { emptyFlow, FLOW_STEPS, reviewKey, WORKFLOW_DEVICES } from './model';
import { approveAndAdvance, readWorkflowLocation, resolveWorkflowLocation, workflowLocation } from './navigation';

describe('workflow URL selection',()=>{
  const saved=()=>({...emptyFlow(),cursor:FLOW_STEPS.find(s=>s.ctx==='marketing' && s.device.id==='m390')!.key,role:'h2'});
  it('retains saved selection without explicit URL keys',()=>{
    const flow=saved();expect(resolveWorkflowLocation(flow,readWorkflowLocation('?workspace=workflow'))).toBe(flow);
  });
  it('gives explicit context/device/role priority over saved workflow',()=>{
    const flow=resolveWorkflowLocation(saved(),readWorkflowLocation('?ctx=html&device=t768&role=paragraph'));
    expect(workflowLocation(flow)).toEqual({ctx:'html',device:'t768',role:'paragraph'});
  });
  it('preserves a role for partial device links and supports workflow-only TV/monitor IDs',()=>{
    for(const device of ['tv1920','monitor2048'])expect(workflowLocation(resolveWorkflowLocation(saved(),readWorkflowLocation(`?device=${device}`)))).toEqual({ctx:'marketing',device,role:'h2'});
  });
  it('ignores malformed fields and does not mistake prototype keys for roles',()=>{
    expect(readWorkflowLocation('?ctx=bad&device=bad&role=__proto__')).toEqual({});
  });
  it('selects the role group on incoming browser navigation without losing reviews',()=>{
    const flow=saved();const next=resolveWorkflowLocation(flow,{role:'paragraph'});
    expect(workflowLocation(next).role).toBe('paragraph');expect(next.reviews).toBe(flow.reviews);
  });
});

describe('functional approval navigation',()=>{
  it('approves the latest selected role, retaining earlier decisions',()=>{
    let d=defaultDecisions();const step=FLOW_STEPS.find(s=>s.ctx==='html' && s.family==='laptop' && s.device.w===1280 && s.group==='headings')!;
    d=applyOverrideAt(d,'html','h1',{size:48,max:48,mode:'static',lh:1.5,mw:0},1280);
    d=applyOverrideAt(d,'html','h2',{size:36,max:36,mode:'static',lh:1.5,mw:0},1280);
    const first=approveAndAdvance({...emptyFlow(),cursor:step.key,role:'h1'},d);
    const second=approveAndAdvance(first,d);
    expect(second.reviews[reviewKey(step,'h1')]).toBeDefined();
    expect(second.reviews[reviewKey(step,'h2')]).toBeDefined();
    expect(second.role).toBe('h3');
  });
});

describe('root search validation for workflow reloads',()=>{
  it('preserves every registered workflow device through root validation',()=>{
    for(const {device} of WORKFLOW_DEVICES)expect(validateStudioSearch({workspace:'workflow',device:device.id}).device).toBe(device.id);
  });
  it('aliases legacy large desktop URLs and keeps width across the free editor handoff',()=>{
    for(const width of [2560,3440,3840]){
      const core=`d${width}`,monitor=`monitor${width}`;
      expect(validateStudioSearch({workspace:'workflow',device:core}).device).toBe(monitor);
      expect(readWorkflowLocation(`?device=${core}`).device).toBe(monitor);
      expect(freeEditorDeviceId(monitor)).toBe(core);
      expect(validateStudioSearch({workspace:'free',device:freeEditorDeviceId(monitor)}).device).toBe(core);
      expect(validateStudioSearch({workspace:'workflow',device:core}).device).toBe(monitor);
    }
    expect(freeEditorDeviceId('tv2560')).toBe('d2560');
    expect(freeEditorDeviceId('tv1920')).toBe('l1920');
    expect(freeEditorDeviceId('monitor2048')).toBe('l1280');
  });
  it('retains the strict free editor catalog',()=>{
    for(const device of DEVICES)expect(validateStudioSearch({workspace:'free',device:device.id}).device).toBe(device.id);
    for(const device of ['tv1280','tv1920','monitor2048'])expect(validateStudioSearch({workspace:'free',device}).device).toBe('l1280');
  });
  it('rejects fabricated, padded and unregistered workflow IDs',()=>{
    for(const device of ['tv9999','monitor9999','tv01920','monitor02048','tv1920-extra'])expect(validateStudioSearch({workspace:'workflow',device}).device).toBe('l1280');
  });
});

describe('bootstrap navigation intent',()=>{
  afterEach(()=>{localStorage.removeItem(STORAGE_KEY);window.history.replaceState({},'','/');vi.unstubAllGlobals();vi.resetModules();});
  const bootstrap=async()=>{vi.resetModules();await import('../../app/bootstrap');};
  it('starts a fresh naked workflow at 320 even on a desktop viewport',async()=>{
    localStorage.removeItem(STORAGE_KEY);window.history.replaceState({},'','/');vi.stubGlobal('innerWidth',1680);
    await bootstrap();expect(new URLSearchParams(window.location.search).get('device')).toBe('m320');
  });
  it('does not turn stored core UI into an explicit workflow deep link',async()=>{
    localStorage.setItem(STORAGE_KEY,JSON.stringify(buildExport(defaultDecisions(),'all',{ui:{workspace:'workflow',ctx:'marketing',device:'l1280',role:'h3'}})));
    window.history.replaceState({},'','/');await bootstrap();
    expect(window.location.search).toBe('?workspace=workflow');
    const saved={...emptyFlow(),cursor:FLOW_STEPS.find(s=>s.ctx==='html' && s.device.id==='m390')!.key,role:'h2'};
    expect(resolveWorkflowLocation(saved,readWorkflowLocation(window.location.search))).toBe(saved);
  });
  it('restores an explicitly saved free editor workspace and preview',async()=>{
    localStorage.setItem(STORAGE_KEY,JSON.stringify(buildExport(defaultDecisions(),'all',{ui:{workspace:'free',ctx:'admin',device:'l1440',role:'h3'}})));
    window.history.replaceState({},'','/');await bootstrap();
    const params=new URLSearchParams(window.location.search);
    expect(params.get('workspace')).toBe('free');expect(params.get('device')).toBe('l1440');expect(params.get('role')).toBe('h3');
  });
  it('leaves explicit workflow and free preview URLs unchanged',async()=>{
    for(const query of ['?ctx=html&device=tv1920&role=h1','?workspace=free&device=l1440']){
      window.history.replaceState({},'',`/${query}`);await bootstrap();expect(window.location.search).toBe(query);
    }
  });
});
