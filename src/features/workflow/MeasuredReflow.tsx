import { Text } from '@mantine/core';
import { useEffect, useState } from 'react';
import { FONT_STACK, ROLE, type RoleProps } from '../../core';

export interface MeasuredReflowProps { values: RoleProps; id: string; width: number }
type FontValues = Pick<RoleProps,'size'|'w'|'ff'|'fst'|'tt'|'ls'|'ws'|'num'>;
export interface WordMeasurement { maxWord: number; available: number; pass: boolean; word: string; letterSpacing: number; wordSpacing: number }
export interface WordMeasureContext { font: string; measureText: (text: string) => { width: number } }
const transform=(text:string,tt:RoleProps['tt'])=>tt==='uppercase'?text.toLocaleUpperCase('tr'):tt==='lowercase'?text.toLocaleLowerCase('tr'):tt==='capitalize'?text.replace(/(^|\s)(\S)/gu,(_,space:string,char:string)=>space+char.toLocaleUpperCase('tr')):text;

/** Actual catalog words, not synthetic stress vocabulary. Caller supplies a fresh canvas context
 * after fonts.ready. Spacing is added explicitly so canvas spacing support is not required.
 * This is a word-width check, not DOM reflow, line layout or WCAG certification. */
export function measureRoleWords(values: FontValues, id: string, width: number, context: WordMeasureContext): WordMeasurement {
  if (!ROLE[id] || !Number.isFinite(width) || width<=32 || !Number.isFinite(values.size) || values.size<=0 || ![values.w,values.ls,values.ws].every(Number.isFinite)) throw new Error('Geçersiz ölçüm girdisi');
  const words=transform(ROLE[id].sample,values.tt).split(/\s+/u).filter(Boolean);
  if (!words.length) throw new Error('Örnek metin yok');
  const letterSpacing=Math.max(values.ls,.12)*values.size,wordSpacing=Math.max(values.ws,.16)*values.size;
  const original=context.font;
  try {
    context.font=`${values.fst} ${values.w} ${values.size}px ${FONT_STACK[values.ff]}`;
    const measured=words.map(word=>{
      const native=context.measureText(word).width;
      if (!Number.isFinite(native) || native<=0) throw new Error('Tarayıcı geçerli ölçüm döndürmedi');
      // No spaces occur inside a word: wordSpacing is intentionally not added to it.
      return {word,width:native+Math.max(0,Array.from(word).length-1)*letterSpacing};
    });
    const largest=measured.reduce((best,current)=>current.width>best.width?current:best);
    const available=width-32;
    return {word:largest.word,maxWord:largest.width,available,pass:largest.width<=available,letterSpacing,wordSpacing};
  } finally { context.font=original; }
}
type MeasurementState = {key:string;status:'waiting'|'unavailable'} | {key:string;status:'measured';result:WordMeasurement};

export function MeasuredReflow({values,id,width}:MeasuredReflowProps) {
  const {size,w,ff,fst,tt,ls,ws,num}=values;
  const key=JSON.stringify([id,width,size,w,ff,fst,tt,ls,ws,num]);
  const [state,setState]=useState<MeasurementState>({key,status:'waiting'});
  useEffect(()=>{
    let cancelled=false;
    setState({key,status:'waiting'});
    const measure=async()=>{
      try {
        if (!document.fonts?.ready) throw new Error('Font yükleme API erişimi yok');
        await document.fonts.ready;
        if(cancelled)return;
        const context=document.createElement('canvas').getContext('2d');
        if (!context) throw new Error('Canvas ölçümü kullanılamıyor');
        const result=measureRoleWords({size,w,ff,fst,tt,ls,ws,num},id,width,context);
        if(!cancelled)setState({key,status:'measured',result});
      } catch {
        if(!cancelled)setState({key,status:'unavailable'});
      }
    };
    void measure();
    return ()=>{cancelled=true;};
  },[key,id,width,size,w,ff,fst,tt,ls,ws,num]);
  const current=state.key===key?state:{key,status:'waiting' as const};
  const description=current.status==='measured'
    ? `${current.result.pass?'sığıyor':'taşma uyarısı'} · “${current.result.word}” ${current.result.maxWord.toFixed(1)} px ${current.result.pass?'≤':'>'} ${current.result.available.toFixed(1)} px.`
    : current.status==='waiting'?'fontlar bekleniyor.':'kullanılamıyor; sonuç bilinmiyor.';
  return <Text component="div" size="sm" role="status" aria-live="polite" aria-atomic="true">
    Tarayıcı kelime ölçümü: {description} Gerçek rol örneği; harf aralığı en az 0,12 em, kelime aralığı en az 0,16 em. Kelime aralığı sözcük içi genişliği etkilemez. Bu ölçüm tam WCAG uyumluluğu veya sayfa yeniden akış testi değildir.
  </Text>;
}
