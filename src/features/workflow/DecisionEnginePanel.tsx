import type { ReactNode } from 'react';
import { Button, Group, Table } from '@mantine/core';
import { MeasuredReflow } from './MeasuredReflow';
import type { EngineEntry } from './engineState';
import type { DecisionCheck, Prediction } from './engine';
import type { PropKey, RoleProps } from '../../core';
import classes from './Workflow.module.scss';

const LABELS={catalog:'Kalıtılan başlangıç',related:'İlişkili kararlardan', 'same-role':'Önceki ekran kararından',trend:'Onaylı büyüme eğiliminden'};
const FIELDS:Partial<Record<PropKey,string>>={size:'Yazı boyutu',w:'Ağırlık',lh:'Satır yüksekliği',ls:'Harf aralığı',ws:'Kelime aralığı',ff:'Yazı tipi',fst:'Stil',tt:'Harf dönüşümü',td:'Çizgi',num:'Rakamlar',ta:'Hizalama',wrap:'Satır kırma',mw:'Satır uzunluğu',clamp:'Satır sınırı',mt:'Üst boşluk',mb:'Alt boşluk',c:'Çıktı tonları'};
const RULE_LABELS:Record<string,string>={'same-role-transfer':'Önceki insan kararı','related-role-scale':'İlişkili insan kararları','selected-policy':'Tipografi politikası','heading-order':'Başlık oranı','project-constraints':'Proje sınırları','wcag-contrast':'Kontrast zeminleri'};
interface Props {
 forecast:{label:string;size:number}[];
 entry?:EngineEntry;
 prediction:Prediction;
 checks:DecisionCheck[];
 reviewed:boolean;
 hasReview:boolean;
 onRecalculate:()=>void;
 onUndo:()=>void;
 onRedo?:()=>void;
 measured?:ReactNode;
 values?:RoleProps;
 id?:string;
 width?:number;
 onForecastToggle?:(open:boolean)=>void;
}
export function DecisionEnginePanel({forecast,entry,prediction,checks,reviewed,hasReview,onRecalculate,onUndo,onRedo,measured,values,id,width,onForecastToggle}:Props){
 const state=entry?.state,sources=entry?.sources??prediction.sources;
 const undoable=!!entry && (!hasReview || entry.event==='recalculate') && (!!entry.past?.length || !!entry.undo);
 const redoable=!!entry?.future?.length && !hasReview;
 return <details className={classes.enginePanel} open>
  <summary>Karar motoru · {state==='manual'?'Elle düzenlendi':state==='undone'?'Geri alındı':reviewed?'İnsan onayı':state==='auto'?'Motor kararı':state==='conflict'||state==='stale'?'İnceleme bekliyor':LABELS[entry?.evidence??prediction.evidence]}</summary>
  <p>Motor kararları insan onayından ayrıdır. Yalnız geçerli insan onayları öğrenme kaynağıdır.</p>
  <p>{LABELS[prediction.evidence]}: {prediction.values.size} px · {prediction.values.w} · satır {prediction.values.lh}</p>
  {!!sources.length && <p>Kaynak: {sources.map(source=>source.label).join(' · ')}</p>}
  {(entry?.trace??prediction.trace).slice(-2).map((trace,i)=><p key={`${trace.rule}-${i}`}>{trace.reason}</p>)}
  {!!entry?.issues?.length && <ul className={classes.engineWarning}>{entry.issues.map((issue,i)=><li key={i}>{issue}</li>)}</ul>}
  <details><summary>Alanların kaynakları ve gerekçeleri</summary><div className={classes.engineTable}>
   <Table><Table.Thead><Table.Tr><Table.Th>Özellik</Table.Th><Table.Th>Değer</Table.Th><Table.Th>Kaynak ve neden</Table.Th></Table.Tr></Table.Thead><Table.Tbody>{Object.entries(FIELDS).map(([key,label])=>{
    const prop=key as PropKey,source=prediction.fieldSources?.[prop],value=(values??prediction.values)[prop];
    return <Table.Tr key={key}><Table.Td>{label}</Table.Td><Table.Td>{typeof value==='object'?JSON.stringify(value):String(value)}</Table.Td><Table.Td><strong>{state==='manual'?'Elle düzenlendi':source?RULE_LABELS[source.label]??source.label:'Kalıtım'}</strong><p>{source?.reason}</p></Table.Td></Table.Tr>;
   })}</Table.Tbody></Table>
  </div></details>
  <details onToggle={event=>onForecastToggle?.(event.currentTarget.open)}><summary>Bu kararın etkisi{forecast.length?` · ${forecast.length} hedef`:''}</summary><div className={classes.engineTable}><Table><Table.Thead><Table.Tr><Table.Th>Hedef</Table.Th><Table.Th>Motor boyutu</Table.Th></Table.Tr></Table.Thead><Table.Tbody>{forecast.map(item=><Table.Tr key={item.label}><Table.Td>{item.label}</Table.Td><Table.Td>{item.size} px</Table.Td></Table.Tr>)}</Table.Tbody></Table></div></details>
  <details><summary>Kısıt denetimleri</summary><ul>{checks.map(check=><li key={check.id}>{check.pass?'Geçti':check.blocking===false?'Bilgi / uyarı':'Düzelt'} · {check.detail}</li>)}</ul></details>
  {measured??(values && id && width ? <MeasuredReflow values={values} id={id} width={width}/>:null)}
  <p>Kontrast, örnek kelime ve proje kuralları denetlenir. %200 büyütme, yeniden akış ve metin aralığı gerçek çıktı üzerinde ayrıca sınanır; bu tam WCAG 2.2 AA belgesi değildir.</p>
  {!reviewed && <Group gap="xs"><Button variant="default" onClick={onRecalculate}>Otomatik yeniden hesapla</Button>{undoable && <Button variant="subtle" onClick={onUndo}>Otomatik uygulamayı geri al</Button>}{redoable && onRedo && <Button variant="subtle" onClick={onRedo}>Yinele</Button>}</Group>}
 </details>;
}
