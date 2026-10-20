import type { ContextId } from '../../core';
import admin from './pages/admin.html?raw';
import ai from './pages/ai.html?raw';
import bi from './pages/bi.html?raw';
import ecommerce from './pages/ecommerce.html?raw';
import marketing from './pages/marketing.html?raw';
import specimen from './pages/specimen.html?raw';

const PAGES: Record<ContextId, string> = { html: '', admin, marketing, ecommerce, bi, ai };

/** Güvenilir, depoya ait statik işaretleme. Kimlikler örneğe göre önekle tekilleştirilir (karşılaştırma iki tuval çizer). */
export function pageHtml(ctx: ContextId, prefix: string) {
  const html = `${PAGES[ctx]}\n${specimen.replaceAll('{x}', ctx)}`;
  return html.replace(/\b(id|for)="([^"]+)"/g, (_, attr: string, v: string) => `${attr}="${prefix}-${v}"`);
}
