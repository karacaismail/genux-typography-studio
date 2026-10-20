import type { CSSProperties } from 'react';
import { FONT_STACK, ROLES, isRelative, minSizeFor, rolesOf, sizeAt, type ContextId, type ContextSettings, type RoleProps, type Theme } from '../../core';

/** Her tür için tek CSS kuralı: değerler tuval kökündeki değişkenlerden gelir. Statik; bir kez eklenir. */
export const ROLE_CSS = ROLES.map(({ id }) => {
  const v = (k: string) => `var(--${id}-${k})`;
  return `.gx-canvas .r-${id}{font-size:${v('fs')};line-height:${v('lh')};font-weight:${v('fw')};letter-spacing:${v('ls')};word-spacing:${v('ws')};color:${v('c')};font-family:${v('ff')};font-style:${v('fst')};text-transform:${v('tt')};text-decoration-line:${v('td')};font-variant-numeric:${v('num')};text-align:${v('ta')};text-wrap:${v('wrap')};max-width:${v('mw')};margin-block:${v('mt')} ${v('mb')};}`;
}).join('\n');

export function roleVars(id: string, r: RoleProps, s: ContextSettings, width: number, theme: Theme): Record<string, string> {
  return {
    [`--${id}-fs`]: isRelative(r) ? `max(${minSizeFor(id)}px, ${r.em}em)` : `${sizeAt(r, s, id, width)}px`,
    [`--${id}-lh`]: String(r.lh),
    [`--${id}-fw`]: String(r.w),
    [`--${id}-ls`]: `${r.ls}em`,
    [`--${id}-ws`]: `${r.ws}em`,
    [`--${id}-c`]: r.c[theme],
    [`--${id}-ff`]: FONT_STACK[r.ff],
    [`--${id}-fst`]: r.fst,
    [`--${id}-tt`]: r.tt,
    [`--${id}-td`]: r.td,
    [`--${id}-num`]: r.num,
    [`--${id}-ta`]: r.ta,
    [`--${id}-wrap`]: r.wrap,
    [`--${id}-mw`]: r.mw ? `${r.mw}ch` : 'none',
    [`--${id}-mt`]: `${r.mt}em`,
    [`--${id}-mb`]: `${r.mb}em`,
  };
}

/** Bağlamdaki bütün türlerin değişkenleri (tuval kökünün style'ı). */
export function contextStyle(ctx: ContextId, resolved: Record<string, RoleProps>, s: ContextSettings, width: number, theme: Theme): CSSProperties {
  const out: Record<string, string> = {};
  for (const { id } of rolesOf(ctx)) Object.assign(out, roleVars(id, resolved[id], s, width, theme));
  return out as CSSProperties;
}
