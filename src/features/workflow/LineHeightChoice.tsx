import { Radio } from '@mantine/core';
import { RecommendationMark } from '../recommendations/Recommendation';
import classes from './Workflow.module.scss';
export const LINE_HEIGHT_PRESETS=[1,1.1,1.2,1.25,1.3,1.4,1.5,1.6,1.75,2];
export function LineHeightChoice({value,onChange,recommended}:{value:number;recommended?:number;onChange:(value:number)=>void}) {
  return <Radio.Group className={classes.weightPicker} label="Satır yüksekliği" name="line-height" value={String(value)} onChange={(v)=>onChange(Number(v))}><span id="recommended-line-height" className="gx-sr-only">Önerilen satır yüksekliği: {recommended}</span><div className={classes.weightOptions}>
    {LINE_HEIGHT_PRESETS.map((v,i)=><Radio.Card key={v} value={String(v)} tabIndex={value===v || (!LINE_HEIGHT_PRESETS.includes(value) && i===0) ? 0 : -1} aria-label={`Satır yüksekliği ${v}`} aria-describedby={v===recommended?"recommended-line-height":undefined} className={classes.weightOption}><span>{v===1 || v===2 ? v.toFixed(1) : String(v)}</span>{v===recommended && <RecommendationMark value={`Satır yüksekliği ${v}`}/>}</Radio.Card>)}
  </div></Radio.Group>;
}
