import { ROLE, resolveAt, sizeAt, type ContextId, type Decisions, type Device, type Theme } from '../../core';
import { DeviceStage } from '../canvas/DeviceStage';
import { canvasVars } from '../canvas/canvasVars';
import { workflowRoleStyle } from './roleStyle';
import classes from './Workflow.module.scss';

/** Remains mounted while the form switches roles: comparison always uses live decisions. */
export function GroupPreview({decisions,ctx,roles,selected,width,scheme,onSelect,device,zoom,viewportWidth=width,viewportHeight=device.h,landscape=false}:{decisions:Decisions;ctx:ContextId;roles:string[];selected:string;width:number;scheme:Theme;device:Device;zoom:'fit'|'actual';viewportWidth?:number;viewportHeight?:number;landscape?:boolean;onSelect:(id:string)=>void}) {
  const settings=decisions.contexts[ctx].settings;
  return <section className={classes.groupPreview} aria-label="Ekran 2 · Kümenin tamamı" style={canvasVars(scheme)}>

    <div className={classes.deviceStage}><DeviceStage device={device} width={viewportWidth} height={viewportHeight} theme={scheme} zoom={zoom} landscape={landscape}><div data-testid="group-surface" style={{...canvasVars(scheme),width:'100%',background:'var(--canvas)'}}><div className={classes.groupRows}>{roles.map((id)=>{
      const r=resolveAt(decisions,ctx,id,width);
      const px=Math.round(sizeAt(r,settings,id,width));
      return <button type="button" key={id} className={classes.groupRow} aria-label={`${ROLE[id].label} düzenle`} aria-pressed={selected===id} onClick={()=>onSelect(id)}>
        <span className={classes.groupMeta}>{ROLE[id].label} · {px} px · {r.w} · satır {r.lh}</span>
        <span data-group-role={id} style={workflowRoleStyle(r,settings,id,width,scheme)}>{ROLE[id].kind==='heading' ? 'Örnek başlık' : ROLE[id].samples?.[ctx] ?? ROLE[id].sample}</span>
      </button>;
    })}</div></div></DeviceStage></div>
  </section>;
}
