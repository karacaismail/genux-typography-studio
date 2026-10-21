import type { CSSProperties } from 'react';
import { FONT_STACK, sizeAt, type ContextSettings, type RoleProps, type Theme } from '../../core';
/** One complete presentation contract for all wizard samples and line tests. */
export function workflowRoleStyle(p:RoleProps,settings:ContextSettings,id:string,width:number,scheme:Theme):CSSProperties {
  return {fontFamily:FONT_STACK[p.ff],fontSize:Math.round(sizeAt(p,settings,id,width)),fontWeight:p.w,lineHeight:p.lh,letterSpacing:`${p.ls}em`,wordSpacing:`${p.ws}em`,color:p.c[scheme],fontStyle:p.fst,textTransform:p.tt,textDecoration:p.td,fontVariantNumeric:p.num,textAlign:p.ta,textWrap:p.wrap,whiteSpace:'normal',maxWidth:p.mw ? `${p.mw}ch` : undefined,marginBlock:`${p.mt}em ${p.mb}em`};
}
