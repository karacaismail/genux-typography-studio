import { SegmentedControl, useComputedColorScheme } from '@mantine/core';
import { useState } from 'react';
import { sizeAt, type ContextSettings, type RoleProps, type Theme } from '../../core';
import { canvasVars } from '../canvas/canvasVars';
import { workflowRoleStyle } from './roleStyle';
import { LINE_SAMPLES } from './lineSamples';
import classes from './Workflow.module.scss';
export function NearLineTest({id,r,settings,width,scheme}:{id:string;r:RoleProps;settings:ContextSettings;width:number;scheme:Theme}) {
  const [count,setCount]=useState('2');
  const interfaceTheme=useComputedColorScheme('light');
  const px=Math.round(sizeAt(r,settings,id,width));const line=px*r.lh;
  return <section className={classes.nearLineTest} aria-label="Satır yüksekliği canlı testi" style={canvasVars(interfaceTheme)}>
    <div className={classes.nearLineHead}><strong>Satır testi</strong><SegmentedControl size="xs" aria-label="Canlı test satır sayısı" value={count} onChange={setCount} data={[{value:'2',label:'2 satır'},{value:'5',label:'5 satır'}]}/></div>
    <p className={classes.nearLineReadout}>{px} px × {new Intl.NumberFormat('tr-TR',{maximumFractionDigits:3}).format(r.lh)} = {new Intl.NumberFormat('tr-TR',{maximumFractionDigits:2}).format(line)} px / satır</p>
    <div className={classes.nearLineBody} tabIndex={0} role="region" aria-label="Satır testi metni" data-testid="near-line-sample" style={{...workflowRoleStyle(r,settings,id,width,scheme),margin:0,color:'var(--canvas-text)',maxWidth:'none',backgroundImage:'repeating-linear-gradient(to bottom, transparent 0, transparent calc(100% - 1px), var(--canvas-stroke) calc(100% - 1px), var(--canvas-stroke) 100%)',backgroundSize:`100% ${line}px`}}>{LINE_SAMPLES[Number(count)].map((text,i)=><div key={i} style={{whiteSpace:'normal'}}>{text}{' '}</div>)}</div>
  </section>;
}
