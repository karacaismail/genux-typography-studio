import { Radio } from '@mantine/core';
import { useState } from 'react';
import { NumberStepper } from './NumberStepper';
import classes from './Workflow.module.scss';
const PRESETS=[0.8,1,1.25,1.5,1.75,2];
export function LineHeightChoice({value,onChange}:{value:number;onChange:(value:number)=>void}) {
  const [custom,setCustom]=useState(false);
  const selected=custom || !PRESETS.includes(value) ? 'custom' : String(value);
  return <div className={classes.weightPicker}><Radio.Group label="Satır yüksekliği" name="line-height" value={selected} onChange={(v)=>{setCustom(v==='custom');if(v!=='custom')onChange(Number(v));}}><div className={classes.weightOptions}>
    {PRESETS.map((v)=><Radio.Card key={v} value={String(v)} tabIndex={selected===String(v) ? 0 : -1} aria-label={`Satır yüksekliği ${v}`} className={classes.weightOption}><span>{new Intl.NumberFormat('tr-TR').format(v)}</span></Radio.Card>)}
    <Radio.Card value="custom" tabIndex={selected==='custom' ? 0 : -1} aria-label="Özel satır yüksekliği" className={classes.weightOption}><span>Özel</span></Radio.Card>
  </div></Radio.Group>{selected==='custom' && <NumberStepper label="Özel satır yüksekliği değeri" value={value} min={0.6} max={2.5} step={0.05} decimalScale={3} suffix=" ×" onChange={(v)=>{if(typeof v==='number')onChange(v);}}/>}</div>;
}
