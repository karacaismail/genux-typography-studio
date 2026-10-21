import { BG, DEFAULT_SETTINGS, GRAYS } from './constants';
import { contrast, grayHex } from './color';
import { defaultDecisions } from './resolve';
import { resolveAt } from './screens';
import { ROLE } from './roles';
import { sizeAt } from './size';
import type { ContextId, RoleProps } from './types';

export const RECOMMENDED_LINE_HEIGHTS = [1,1.1,1.2,1.25,1.3,1.4,1.5,1.6,1.75,2];
const baseline = defaultDecisions();
/** Proje başlangıç önerisi; kullanıcı kararlarından bağımsızdır, WCAG sertifikası değildir. */
export function recommendedRole(ctx: ContextId, id: string, width: number): RoleProps {
  const r = resolveAt(baseline,ctx,id,width);
  const reading = ['reading','long'].includes(ROLE[id].kind);
  const candidates = RECOMMENDED_LINE_HEIGHTS.filter(v=>!reading || v>=1.5);
  const lh = candidates.reduce((best,v)=>Math.abs(v-r.lh)<Math.abs(best-r.lh)?v:best,candidates[0]);
  const c = {...r.c};
  for (const theme of ['light','dark'] as const) {
    const safe = (hex:string)=>Object.values(BG[theme]).every(bg=>contrast(hex,bg)>=4.5);
    const palette = GRAYS.filter(g=>theme==='light'?g<=128:g>=128).map(grayHex).filter(safe);
    c[theme] = palette.includes(c[theme]) ? c[theme] : palette.reduce((best,hex)=>Math.abs(parseInt(hex.slice(1,3),16)-parseInt(c[theme].slice(1,3),16))<Math.abs(parseInt(best.slice(1,3),16)-parseInt(c[theme].slice(1,3),16))?hex:best,palette[0]);
  }
  return {...r,size:Math.round(sizeAt(r,DEFAULT_SETTINGS(ctx),id,width)),lh,c};
}
