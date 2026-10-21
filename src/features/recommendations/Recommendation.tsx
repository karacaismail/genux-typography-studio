import { CheckCircleIcon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import classes from './Recommendation.module.scss';

export function RecommendationMark({value}:{value:string|number}) {
  return <span className={classes.mark} role="img" aria-label={`Önerilen: ${value}`} title={`Proje önerisi: ${value}. WCAG uygunluk sertifikası değildir.`}><CheckCircleIcon size={18} weight="fill" aria-hidden="true"/></span>;
}
export function RecommendationLabel({children,value}:{children:ReactNode;value:string|number}) {
  return <span className={classes.label}>{children}<span className={classes.readout}>Önerilen: {value}</span><RecommendationMark value={value}/></span>;
}
export function RecommendationNote() {
  return <p className={classes.note}><RecommendationMark value="rol ve ekran için başlangıç değeri"/> Yeşil işaret: proje önerisi. Seçili değerden bağımsızdır. WCAG AA için ayrıca kontrast, büyütme ve metin aralığı kontrolleri gerekir.</p>;
}
