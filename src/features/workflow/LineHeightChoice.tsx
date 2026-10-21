import { Radio } from '@mantine/core';
import classes from './Workflow.module.scss';
export const LINE_HEIGHT_PRESETS=[1,1.1,1.2,1.25,1.3,1.4,1.5,1.6,1.75,2];
export function LineHeightChoice({value,onChange}:{value:number;onChange:(value:number)=>void}) {
  return <Radio.Group className={classes.weightPicker} label="Satır yüksekliği" name="line-height" value={String(value)} onChange={(v)=>onChange(Number(v))}><div className={classes.weightOptions}>
    {LINE_HEIGHT_PRESETS.map((v,i)=><Radio.Card key={v} value={String(v)} tabIndex={value===v || (!LINE_HEIGHT_PRESETS.includes(value) && i===0) ? 0 : -1} aria-label={`Satır yüksekliği ${v}`} className={classes.weightOption}><span>{v===1 || v===2 ? v.toFixed(1) : String(v)}</span></Radio.Card>)}
  </div></Radio.Group>;
}
