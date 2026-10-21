import { Button, Group, Radio, Stack, Text, TextInput } from '@mantine/core';
import { useEffect, useState } from 'react';
import { NumberStepper } from './NumberStepper';
import { parsePolicy, type TypographyPolicy } from './policy';
import classes from './PolicyEditor.module.scss';

export interface PolicyEditorProps {
  value: TypographyPolicy;
  onChange: (value: TypographyPolicy) => void;
  inferred?: Partial<TypographyPolicy> | null;
  onAdopt: () => void;
}
function BackgroundField({ theme, value, onChange }: {theme: 'light' | 'dark'; value: string[]; onChange: (value: string[]) => void}) {
  const serialized=value.join(', ');
  const [draft,setDraft]=useState(serialized);
  const [error,setError]=useState(false);
  useEffect(()=>{setDraft(serialized);setError(false);},[serialized]);
  const commit=()=>{
    const colors=draft.split(',').map(c=>c.trim());
    const parsed=parsePolicy({backgrounds:{light:colors,dark:colors}}).backgrounds;
    setError(!parsed);
    if(parsed) onChange(parsed[theme]);
  };
  return <TextInput label={`${theme==='light'?'Açık':'Koyu'} tema zeminleri`} description="Virgülle ayrılmış gri hex renkleri; örnek: #ffffff, #eeeeee" value={draft} onChange={event=>{setDraft(event.currentTarget.value);setError(false);}} onBlur={commit} onKeyDown={event=>{if(event.key==='Enter')commit();}} error={error?'Her zemin geçerli bir gri hex rengi olmalı (1–16 renk).':undefined}/>;
}
const numericFields = [
  {key:'headingRatio',label:'Minimum başlık oranı',min:1.125,max:3,step:.025},
  {key:'growth',label:'320 → 1920 büyüme çarpanı',min:1,max:1.6,step:.01},
  {key:'tracking',label:'Harf aralığı (em)',min:-.05,max:.2,step:.005},
  {key:'weightStep',label:'Başlık ağırlık farkı',min:0,max:600,step:100},
  {key:'verticalRhythm',label:'Dikey ritim (px; 0 = serbest)',min:0,max:48,step:1},
  {key:'lineLength',label:'Okuma satırı (ch; 0 = serbest)',min:0,max:120,step:1},
] as const;
const strategies = [
  {value:'preserve',label:'İzinli en yakın satır yüksekliği'},
  {value:'reading',label:'Okumada en az 1,5; büyük başlıkta azalan'},
  {value:'target24',label:'24 px satır kutusunu hedefle'},
] as const;

/** Controlled policy only. The owner persists context overrides and explicitly adopts inferred values. */
export function PolicyEditor({value,onChange,inferred,onAdopt}: PolicyEditorProps) {
  const patch=(next: Partial<TypographyPolicy>)=>onChange({...value,...next});
  return <Stack className={classes.root} gap="md" aria-label="Tipografi kural politikası">
    <Text fw={600}>Kural politikası</Text>
    <Text c="dimmed">HTML temel politikası ürün türlerine kalıtılır. Onaylardan çıkarılan öneriler yalnız açıkça benimsendiğinde uygulanır.</Text>
    <div className={classes.fields}>
      {numericFields.map(field=><NumberStepper key={field.key} label={field.label} value={value[field.key]} min={field.min} max={field.max} step={field.step} onChange={raw=>{
        if(typeof raw!=='number')return;
        const parsed=parsePolicy({[field.key]:raw});
        if(parsed[field.key]!==undefined)patch(parsed);
      }}/>) }
    </div>
    <Radio.Group label="Satır yüksekliği stratejisi" value={value.lineHeightStrategy} onChange={raw=>{
      const parsed=parsePolicy({lineHeightStrategy:raw});if(parsed.lineHeightStrategy)patch(parsed);
    }}>
      <Group gap="sm" mt="xs" className={classes.strategies}>{strategies.map(strategy=><Radio key={strategy.value} value={strategy.value} label={strategy.label}/>)}</Group>
    </Radio.Group>
    <div className={classes.fields}>
      {(['light','dark'] as const).map(theme=><BackgroundField key={theme} theme={theme} value={value.backgrounds[theme]} onChange={colors=>patch({backgrounds:{...value.backgrounds,[theme]:colors}})}/>)}
    </div>
    <Text c="dimmed">Başlık oranı karar tabanının altına inemez. Kontrast bütün zeminlerde hesaplanır; 24 px satır kutusu bir tavsiyedir. Bu kontroller tarayıcı ölçümü veya WCAG belgesi değildir.</Text>
    {inferred && Object.keys(inferred).length>0 ? <Stack gap="xs">
      <Text fw={600}>Geçerli insan onaylarından öneri</Text>
      <Text>{numericFields.filter(field=>inferred[field.key]!==undefined).map(field=>`${field.label}: ${inferred[field.key]}`).join(' · ') || 'Satır yüksekliği stratejisi önerisi'}</Text>
      {inferred.lineHeightStrategy && <Text>{strategies.find(s=>s.value===inferred.lineHeightStrategy)?.label}</Text>}
      <Group><Button variant="default" onClick={onAdopt}>Önerilen politikayı benimse</Button></Group>
    </Stack> : <Text c="dimmed">Henüz politika çıkarılabilecek geçerli insan onayı yok.</Text>}
  </Stack>;
}
