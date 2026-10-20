// @vitest-environment node
// Her bağlamdaki her tür önizleme sayfasında en az bir örnekle görünür (seçince işaretlenecek bir öğe olmalı).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CONTEXT_IDS, rolesOf } from '../core';

const dir = join(__dirname, '..', 'features', 'canvas', 'pages');
const read = (f: string) => readFileSync(join(dir, f), 'utf8');
const specimen = read('specimen.html');

describe('önizleme sayfaları', () => {
  for (const ctx of CONTEXT_IDS) {
    it(`${ctx}: bütün türlerin örneği var`, () => {
      const html = (ctx === 'html' ? '' : read(`${ctx}.html`)) + specimen;
      const missing = rolesOf(ctx).map((r) => r.id).filter((id) => !html.includes(`data-role="${id}"`));
      expect(missing).toEqual([]);
    });
  }
  it('sayfalarda bağlamda olmayan tür yok', () => {
    for (const ctx of CONTEXT_IDS.filter((c) => c !== 'html')) {
      const ids = new Set(rolesOf(ctx).map((r) => r.id));
      const used = [...read(`${ctx}.html`).matchAll(/data-role="([^"]+)"/g)].map((m) => m[1]);
      expect(used.filter((id) => !ids.has(id)), ctx).toEqual([]);
    }
  });
});
