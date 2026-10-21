import { describe, expect, it } from 'vitest';
import { BG, CONTEXT_IDS } from './constants';
import { contrast } from './color';
import { rolesOf } from './roles';
import { recommendedRole, RECOMMENDED_LINE_HEIGHTS } from './recommendations';

describe('role recommendations',()=>{
  it('covers every context and role, using approved line heights and AA-safe palette colors',()=>{
    for(const ctx of CONTEXT_IDS)for(const role of rolesOf(ctx))for(const width of [320,1920,3840]){
      const r=recommendedRole(ctx,role.id,width);
      expect(Number.isInteger(r.size)).toBe(true);
      expect(RECOMMENDED_LINE_HEIGHTS).toContain(r.lh);
      if(['reading','long'].includes(role.kind))expect(r.lh).toBeGreaterThanOrEqual(1.5);
      if(role.kind==='long')expect(r.size).toBe(18);
      for(const theme of ['light','dark'] as const)for(const bg of Object.values(BG[theme]))expect(contrast(r.c[theme],bg)).toBeGreaterThanOrEqual(4.5);
    }
  });
  it('does not change recommendations when a returned object is edited',()=>{
    const r=recommendedRole('html','h1',320);r.size=100;r.c.light='#808080';
    expect(recommendedRole('html','h1',320).size).toBe(32);
    expect(recommendedRole('html','h1',320).c.light).not.toBe('#808080');
  });
});
