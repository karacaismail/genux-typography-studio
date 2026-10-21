import { Button, Group } from '@mantine/core';
import type { EngineEntry } from './engineState';
import type { DecisionCheck, Prediction } from './engine';
import classes from './Workflow.module.scss';
const LABELS={catalog:'Katalog başlangıcı',related:'İlişkili kararlardan', 'same-role':'Önceki ekran kararından',trend:'Onaylı büyüme eğiliminden'};
export function DecisionEnginePanel({forecast,entry,prediction,checks,reviewed,hasReview,onRecalculate,onUndo}:{forecast:{label:string;size:number}[];entry?:EngineEntry;prediction:Prediction;checks:DecisionCheck[];reviewed:boolean;hasReview:boolean;onRecalculate:()=>void;onUndo:()=>void}){
  const state=entry?.state;
  const sources=entry?.sources??prediction.sources;
  return <details className={classes.enginePanel}>
    <summary>Karar motoru · {state==='manual'?'Elle düzenlendi':state==='undone'?'Geri alındı':reviewed?'Onay kaydı':LABELS[entry?.evidence??prediction.evidence]}</summary>
    <p>Mobil öncelikli. Otomatik değerler taslaktır; onay vermeden öğrenme kaynağı olmaz.</p>
    <p>{LABELS[prediction.evidence]}: {prediction.values.size} px · {prediction.values.w} · satır {prediction.values.lh}</p>
    {!!sources.length && <p>Kaynak: {sources.map(source=>source.label).join(' · ')}</p>}
    {!!forecast.length && <p>Sonraki taslaklar: {forecast.map(item=>`${item.label} ${item.size} px`).join(' · ')}</p>}
    <ol>{(entry?.trace??prediction.trace).map((trace,i)=><li key={`${trace.rule}-${i}`}>{trace.reason}</li>)}</ol>
    <ul>{checks.map(check=><li key={check.id}>{check.pass?'Geçti':'Düzelt'} · {check.detail}</li>)}</ul>
    <p>Kontrast hesaplanır. %200 büyütme, 320 px yeniden akış ve kullanıcı metin aralığı testleri ayrıca gerekir; bu kontrol tam WCAG 2.2 AA belgesi değildir.</p>
    {!reviewed && <Group gap="xs"><Button variant="default" onClick={onRecalculate}>Otomatik yeniden hesapla</Button>{entry && (!hasReview || entry.event==='recalculate') && !!entry.undo && state!=='undone' && <Button variant="subtle" onClick={onUndo}>Otomatik uygulamayı geri al</Button>}</Group>}
  </details>;
}
