import type { Page } from '@playwright/test';

export const VIEWPORTS = [
  { name: '320', width: 320, height: 720 },
  { name: '932×430 yatay telefon', width: 932, height: 430 },
  { name: '820', width: 820, height: 1180 },
  { name: '1280', width: 1280, height: 800 },
  { name: '1920', width: 1920, height: 1080 },
] as const;

/** Temiz çalışma alanı; tur kapalı (kayıtlı durum yokken ilk açılışta tur açılır). */
export async function fresh(page: Page, query = '') {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('e2e-seeded')) return;
    sessionStorage.setItem('e2e-seeded', '1');
    localStorage.clear();
    localStorage.setItem('genux-type-lab-v2', JSON.stringify({ format: 'genux-typography-decisions', version: 2, scope: 'changed', contexts: {}, ui: { tourDone: true } }));
  });
  await page.goto(`/${query}`);
  await page.locator('[data-canvas-root]').waitFor();
  await page.locator('.gx-canvas .pv-page [data-role]').first().waitFor();
}

/** WebKit'te Tab yalnız Alt+Tab ile bağlantılara gider (macOS varsayılanı). */
export const tabKey = (browserName: string) => (browserName === 'webkit' ? 'Alt+Tab' : 'Tab');

/** Arayüz (tuval dışı) metinlerinde 14 px altı. */
export const smallToolText = (page: Page) => page.evaluate(() => [...document.querySelectorAll('body *')]
  .filter((e) => e.getClientRects().length && !e.closest('.gx-canvas') && !e.closest('.gx-sr-only')
    && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim()))
  .filter((e) => parseFloat(getComputedStyle(e).fontSize) < 14)
  .map((e) => `${e.tagName} ${getComputedStyle(e).fontSize} “${e.textContent!.trim().slice(0, 30)}”`));

/** Odaklanan öğenin göstergesi: çevreleyen halka yok, tek kenar göstergesi var. */
export const focusIndicator = (page: Page) => page.evaluate(() => {
  const a = document.activeElement as HTMLElement;
  const s = getComputedStyle(a);
  const ring = s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0;
  const surroundShadow = /(^|,)\s*(rgb[^)]*\)\s*)?0px 0px 0px [1-9]/.test(s.boxShadow);
  const own = s.boxShadow !== 'none' && /inset|0px [1-9]\d*px 0px/.test(s.boxShadow);
  const sib = a.nextElementSibling ? getComputedStyle(a.nextElementSibling).boxShadow : 'none';
  const label = a.querySelector(':scope > .mantine-Tree-label');
  const labelShadow = label ? getComputedStyle(label).boxShadow : 'none';
  const after = getComputedStyle(a, '::after');
  const afterBar = after.content !== 'none' && (after.backgroundColor !== 'rgba(0, 0, 0, 0)' || after.backgroundImage !== 'none');
  const swatch = a.nextElementSibling ? getComputedStyle(a.nextElementSibling, '::after') : null;
  const sibAfter = !!swatch && swatch.content !== 'none' && swatch.backgroundColor !== 'rgba(0, 0, 0, 0)';
  return {
    el: `${a.tagName}${a.getAttribute('aria-label') ? `[${a.getAttribute('aria-label')}]` : ''}.${String(a.className).slice(0, 40)}`,
    ring, surroundShadow,
    visible: own || (sib !== 'none' && /inset|0px [1-9]/.test(sib)) || labelShadow !== 'none' || afterBar || sibAfter,
    mode: document.documentElement.dataset.focus ?? null,
  };
});

/** Virgülle ayrılmış CSS listesini parantez içini bölmeden ayırır. */
export const splitList = (v: string) => v.split(/,(?![^(]*\))/).map((x) => x.trim());
