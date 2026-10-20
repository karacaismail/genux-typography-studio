import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { autoScale } from '../src/core/constants';
import { VIEWPORTS, focusIndicator, fresh, smallToolText, splitList, tabKey } from './helpers';

const EASE = 'cubic-bezier(0.65, 0, 0.35, 1)';
const mod = 'ControlOrMeta';

test.describe('yerleşim', () => {
  for (const vp of VIEWPORTS) {
    test(`${vp.name} px: taşma yok, arayüz metni en az 14 px, ana bölgeler var`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await fresh(page, `?device=${vp.width < 744 ? 'm390' : vp.width < 1280 ? 't820' : 'l1440'}`);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
      expect(await smallToolText(page)).toEqual([]);
      await expect(page.locator('[data-tour="strip"]')).toBeVisible();
      await expect(page.locator('[data-tour="status"]')).toBeVisible();
      if (vp.width >= 1200) await expect(page.locator('aside[aria-label="Denetçi"]')).toBeVisible();
      else await expect(page.getByRole('button', { name: 'Ayarlar', exact: true })).toBeVisible();
      if (vp.height < 600) {
        // Kısa ekranda tuval kayar; "düzenleniyor" şeridi üstte yapışık kalır.
        await page.locator('[data-canvas-root]').evaluate((e) => { e.scrollTop = 600; });
        const top = await page.locator('[data-tour="strip"]').evaluate((e) => Math.round(e.getBoundingClientRect().top));
        expect(top).toBe(64);
      }
      // Gezgin: geniş ve yeterince yüksek ekranda açık; dar ya da kısa ekranda kapalı ve menü düğmesiyle açılır.
      if (vp.width >= 768 && vp.height >= 600) await expect(page.locator('nav[aria-label="Tipografi türleri"]')).toBeInViewport();
      else {
        await expect(page.locator('nav[aria-label="Tipografi türleri"]')).not.toBeInViewport();
        await expect(page.getByRole('button', { name: 'Tür gezginini aç' })).toBeVisible();
      }
      // Cihaz çerçevesi sahneye sığar (yalnız genişlik).
      const fit = await page.evaluate(() => {
        const st = document.querySelector<HTMLElement>('[class*="_stage_"]')!;
        const sz = document.querySelector<HTMLElement>('[class*="_sizer_"]')!;
        return sz.getBoundingClientRect().width <= st.clientWidth + 1;
      });
      expect(fit).toBe(true);
    });
  }
});

test.describe('düzenleme', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await fresh(page, '?ctx=admin&role=h1&device=l1440');
  });

  test('tür seçimi: önizlemede bütün örnekler işaretlenir ve şerit güncellenir', async ({ page }) => {
    await page.locator('[role="treeitem"][data-value="paragraph"] .mantine-Tree-label').click();
    await expect(page).toHaveURL(/role=paragraph/);
    const marked = page.locator('.gx-canvas .pv-page [data-role="paragraph"].is-editing');
    expect(await marked.count()).toBeGreaterThan(1);
    await expect(page.locator('[data-tour="strip"]')).toContainText('Paragraf');
    await expect(page.locator('[role="treeitem"][data-value="paragraph"]')).toHaveAttribute('aria-selected', 'true');
  });

  test('önizlemede tıklanan öğe seçilir', async ({ page }) => {
    await page.locator('.gx-canvas .pv-page [data-role="kpi"]').first().click();
    await expect(page).toHaveURL(/role=kpi/);
  });

  test('kesin kural: okuma metni 16 altına inmez; virgüllü değer uygulanır; geri al', async ({ page }) => {
    await page.locator('[role="treeitem"][data-value="paragraph"] .mantine-Tree-label').click();
    const field = page.getByRole('textbox', { name: 'Boyut değeri (px)' });
    await field.fill('12');
    await expect(page.getByText('16–120 px arası')).toBeVisible();
    await field.blur();
    await expect(field).toHaveValue('16');
    await field.fill('18,5');
    await field.press('Enter');
    const fs = () => page.locator('.gx-canvas .pv-page [data-role="paragraph"]').first().evaluate((e) => getComputedStyle(e).fontSize);
    expect(await fs()).toBe('18.5px');
    await expect(page.locator('[data-source="overridden"]').first()).toBeVisible();
    await page.locator('[data-tour="status"]').click({ position: { x: 600, y: 10 } });
    await page.keyboard.press(`${mod}+z`);
    expect(await fs()).toBe('16px');
  });

  test('uzun okuma kilitli (18 px)', async ({ page }) => {
    await page.locator('[role="treeitem"][data-value="long"] .mantine-Tree-label').click();
    await expect(page.getByText(/Uzun okuma 18 px sabit/)).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Boyut değeri (px)' })).toBeDisabled();
  });

  test('ekrana göre boyut: cihaz değişince uygulanan boyut değişir', async ({ page }) => {
    await page.locator('.mantine-SegmentedControl-label', { hasText: 'Ekrana göre' }).click();
    await page.getByRole('textbox', { name: 'Mobil boyutu değeri (px)' }).fill('28');
    await page.getByRole('textbox', { name: 'Mobil boyutu değeri (px)' }).press('Enter');
    const h1 = () => page.locator('.gx-canvas .pv-page [data-role="h1"]').first().evaluate((e) => getComputedStyle(e).fontSize);
    // Liste temel ekrandaki 32'den dolar; laptop basamağı 32, mobil 28.
    expect(await h1()).toBe('32px');
    await page.goto(page.url().replace('device=l1440', 'device=m390'));
    expect(await h1()).toBe('28px');
  });

  test('bağlamlar bağımsız: E-ticaret H1 değişince Admin H1 kendi değerinde kalır', async ({ page }) => {
    await page.goto('/?ctx=ecommerce&role=h1&device=l1440');
    const field = page.getByRole('textbox', { name: 'Boyut değeri (px)' });
    await field.fill('40');
    await field.press('Enter');
    await page.goto('/?ctx=admin&role=h1&device=l1440');
    expect(await page.locator('.gx-canvas .pv-page [data-role="h1"]').first().evaluate((e) => parseFloat(getComputedStyle(e).fontSize))).toBe(autoScale(32, 320, 1440, 1.25));
  });

  test('komut paleti: tür seçer', async ({ page }) => {
    await page.keyboard.press(`${mod}+k`);
    await page.getByRole('textbox', { name: 'Komut ya da tür ara' }).fill('KPI değeri');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/role=kpi/);
  });

  test('JSON dışa aktarma ve içe aktarma', async ({ page }) => {
    await page.getByRole('button', { name: 'Dışa aktar' }).click();
    const dl = page.waitForEvent('download');
    await page.getByRole('button', { name: 'JSON indir' }).click();
    const file = await dl;
    expect(file.suggestedFilename()).toMatch(/^genux-tipografi-kararlari-.*\.json$/);
    await page.keyboard.press('Escape');
    const data = { format: 'genux-typography-decisions', version: 2, contexts: { admin: { roles: { h2: { fontSize: { mode: 'static', min: 30, max: 30 } }, body: { fontSize: { mode: 'static', min: 12, max: 12 } } } } } };
    await page.keyboard.press(`${mod}+Shift+o`);
    await page.locator('input[type="file"]').setInputFiles({ name: 'k.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(data)) });
    await expect(page.getByText('2 tür tanındı')).toBeVisible();
    await expect(page.getByText(/1 değer kurallara göre düzeltildi/)).toBeVisible();
    await page.getByRole('button', { name: 'Uygula' }).click();
    // İçe aktarılan temel 30 px; laptopta otomatik ölçekle.
    expect(await page.locator('.gx-canvas .pv-page [data-role="h2"]').first().evaluate((e) => parseFloat(getComputedStyle(e).fontSize))).toBe(autoScale(30, 320, 1440, 1.25));
  });

  test('tam ekran önizleme: yalnız sonuç, Esc kapatır, odak geri döner', async ({ page }) => {
    const trigger = page.getByRole('button', { name: 'Önizlemeyi tam ekran aç' });
    await trigger.click();
    const layer = page.getByRole('dialog', { name: 'Tam ekran önizleme' });
    await expect(layer).toBeVisible();
    await expect(layer.locator('.gx-edit-tag')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(layer).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test('kalıcılık: yeniden yüklemede değişiklik korunur', async ({ page }) => {
    const field = page.getByRole('textbox', { name: 'Boyut değeri (px)' });
    await field.fill('38');
    await field.press('Enter');
    await page.waitForTimeout(400);
    await page.reload();
    await expect(page.getByRole('textbox', { name: 'Boyut değeri (px)' })).toHaveValue('38');
  });
});

test.describe('dar ekranda ayarlar paneli', () => {
  test('modal değil: odak panele geçer, Esc kapatır, odak düğmeye döner; tuval kullanılabilir', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await fresh(page, '?ctx=ai&role=chatMessage&device=m390');
    const trigger = page.getByRole('button', { name: 'Ayarlar', exact: true });
    await trigger.click();
    const sheet = page.getByRole('region', { name: 'Ayarlar' });
    await expect(sheet).toBeVisible();
    expect(await sheet.getAttribute('aria-modal')).toBeNull();
    await expect(page.getByRole('heading', { name: 'Ayarlar' })).toBeFocused();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const field = sheet.getByRole('textbox', { name: 'Boyut değeri (px)' });
    await field.fill('18');
    await field.press('Enter');
    expect(await page.locator('[data-strip-sample]').evaluate((e) => getComputedStyle(e).fontSize)).toBe('18px');
    await page.keyboard.press('Escape');
    await expect(sheet).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });
});

test.describe('odak (kesin kural: çevreleyen halka yok)', () => {
  test('işaretçi modunda gösterge yok; Tab açar; her durakta halka yok, tek kenar göstergesi var; tıklama kapatır', async ({ page, browserName }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await fresh(page, '?ctx=admin&role=h1&device=l1440');
    await page.mouse.click(5, 300);
    await page.keyboard.press('ArrowDown');
    expect(await page.evaluate(() => document.documentElement.dataset.focus ?? null)).toBeNull();
    const seen: string[] = [];
    for (let i = 0; i < 28; i += 1) {
      await page.keyboard.press(tabKey(browserName));
      const f = await focusIndicator(page);
      if (f.el.startsWith('BODY')) continue;
      expect(f.mode, f.el).toBe('kbd');
      expect(f.ring, `halka: ${f.el}`).toBe(false);
      expect(f.surroundShadow, `çevresel gölge: ${f.el}`).toBe(false);
      expect(f.visible, `görünmez odak: ${f.el}`).toBe(true);
      seen.push(f.el);
    }
    expect(seen.length).toBeGreaterThan(10);
    await page.mouse.click(5, 300);
    expect(await page.evaluate(() => document.documentElement.dataset.focus ?? null)).toBeNull();
  });

  test('forced-colors: halka yalnız klavye modunda (2px solid CanvasText), işaretçi modunda yok', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'forced-colors öykünmesi yalnız Chromium');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ forcedColors: 'active' });
    await fresh(page, '?ctx=admin&role=h1&device=l1440');
    const btn = page.getByRole('button', { name: 'Kaydet' });
    await btn.click();
    expect(await btn.evaluate((e) => getComputedStyle(e).outlineStyle)).toBe('none');
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    const s = await page.evaluate(() => { const a = document.activeElement!; const c = getComputedStyle(a); return { mode: document.documentElement.dataset.focus, style: c.outlineStyle, width: c.outlineWidth }; });
    expect(s).toEqual({ mode: 'kbd', style: 'solid', width: '2px' });
  });

  test('ağaçta oklar odağı taşır, Enter seçer', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await fresh(page, '?ctx=admin&role=h1&device=l1440');
    await page.locator('[role="treeitem"][data-value="h1"]').focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/role=h2/);
  });
});

test.describe('hareket sözleşmesi (hesaplanmış stil)', () => {
  test('Mantine yüzeyleri onaylı eğri ve pozitif süre kullanır; az hareket tercihinde süre sıfır', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await fresh(page, '?ctx=admin&role=h1&device=l1440');
    const motion = () => page.evaluate(() => {
      const pick = (sel: string, pseudo?: string) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const s = getComputedStyle(el, pseudo);
        return { tf: s.transitionTimingFunction, d: s.transitionDuration };
      };
      return {
        button: pick('.mantine-Button-root'),
        actionIcon: pick('.mantine-ActionIcon-root'),
        input: pick('.mantine-Input-input'),
        segIndicator: pick('.mantine-SegmentedControl-indicator'),
        sliderThumb: pick('.mantine-Slider-thumb'),
        chevron: pick('.mantine-Accordion-chevron'),
        navRow: pick('[role="treeitem"] .mantine-Tree-label'),
      };
    });
    // Mantine, pencere boyutlanırken kaydırma göstergesinin süresini kısa süre 0'a çeker (durum geçişi değil): oturmasını bekle.
    await expect.poll(async () => parseFloat((await motion()).segIndicator?.d ?? '0')).toBeGreaterThan(0);
    const m = await motion();
    for (const [k, v] of Object.entries(m)) {
      expect(v, k).not.toBeNull();
      expect(splitList(v!.tf).every((x) => x === EASE), `${k}: ${v!.tf}`).toBe(true);
      expect(splitList(v!.d).every((x) => parseFloat(x) > 0), `${k}: ${v!.d}`).toBe(true);
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const r = await motion();
    expect(parseFloat(r.button!.d)).toBe(0);
  });

  test('çekmece açılış ve kapanışı aynı eğriyle', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await fresh(page, '?ctx=admin&role=h1&device=l1440');
    await page.locator('[data-tour="status"] button').first().click();
    const content = page.locator('.mantine-Drawer-content');
    await expect(content).toBeVisible();
    const style = await content.getAttribute('style');
    expect(style).toContain('cubic-bezier(0.65, 0, 0.35, 1)');
    expect(style).toMatch(/transition-duration: (1[2-9]\d|2[0-4]\d)ms/);
  });
});

test.describe('erişilebilirlik (axe)', () => {
  for (const vp of [VIEWPORTS[0], VIEWPORTS[2]]) {
    test(`${vp.name} px: kritik ve ciddi ihlal yok`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await fresh(page, `?ctx=ecommerce&role=price&device=${vp.width < 744 ? 'm390' : 'l1280'}`);
      const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
      const serious = res.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
      expect(serious.map((v) => `${v.id}: ${v.nodes.length} · ${v.nodes[0]?.target.join(' ')}`)).toEqual([]);
    });
  }
});

test.describe('kaynak teslimi', () => {
  test('ilk yüklemede dışa/içe aktarma, kod vurgulama ve bırakma alanı indirilmez; ilk açılışta indirilir', async ({ page }) => {
    const urls: string[] = [];
    page.on('request', (r) => urls.push(r.url()));
    await page.setViewportSize({ width: 1440, height: 900 });
    await fresh(page, '?ctx=admin&role=h1&device=l1440');
    await page.waitForLoadState('networkidle');
    const lazy = /ExportModal|ImportModal|code-highlight|dropzone|FullscreenPreview/i;
    expect(urls.filter((u) => lazy.test(u))).toEqual([]);
    await page.getByRole('button', { name: 'Dışa aktar' }).click();
    await expect(page.getByRole('dialog', { name: 'Kararları dışa aktar' })).toBeVisible();
    expect(urls.some((u) => /ExportModal/.test(u))).toBe(true);
    expect(urls.some((u) => /dropzone|ImportModal/i.test(u))).toBe(false);
  });
});

test.describe('iki sekme', () => {
  test('değişiklik öbür sekmeye geçer; sekmeler birbirine döngüde yazmaz', async ({ context }) => {
    const a = await context.newPage();
    await a.setViewportSize({ width: 1440, height: 900 });
    await fresh(a, '?ctx=admin&role=h1&device=l1440');
    const b = await context.newPage();
    await b.setViewportSize({ width: 1440, height: 900 });
    await b.goto('/?ctx=admin&role=h1&device=l1440');
    await b.locator('.gx-canvas .pv-page [data-role]').first().waitFor();
    // Açılış kaydı (250 ms) bitsin; sonra yazımları say (iki sekmede).
    await b.waitForTimeout(700);
    for (const p of [a, b]) {
      await p.evaluate(() => {
        const orig = Storage.prototype.setItem;
        (window as unknown as { __writes: number }).__writes = 0;
        Storage.prototype.setItem = function (k: string, v: string) {
          if (k === 'genux-type-lab-v2') (window as unknown as { __writes: number }).__writes += 1;
          return orig.call(this, k, v);
        };
      });
    }
    const field = a.getByRole('textbox', { name: 'Boyut değeri (px)' });
    await field.fill('40');
    await field.press('Enter');
    const h1 = (p: typeof a) => p.locator('.gx-canvas .pv-page [data-role="h1"]').first().evaluate((e) => getComputedStyle(e).fontSize);
    await expect.poll(() => h1(b)).toBe('40px');
    await a.waitForTimeout(1500);
    const writes = async (p: typeof a) => p.evaluate(() => (window as unknown as { __writes: number }).__writes);
    expect(await writes(b)).toBe(0);
    expect(await writes(a)).toBeLessThanOrEqual(2);
    expect(await h1(a)).toBe('40px');
  });
});

test.describe('kırılım zinciri ve otomatik ölçek', () => {
  test('320 ayarı üst kırılımları otomatik hesaplar; özel değer çapa olur; JSON kırılımı taşır', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await fresh(page, '?ctx=html&role=h1&device=m320');
    const field = () => page.getByRole('textbox', { name: 'Boyut değeri (px)' });
    const source = () => page.locator('[data-tour="inspector"] [data-source]').nth(1);
    const h1 = () => page.locator('.gx-canvas .pv-page [data-role="h1"]').first().evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
    await expect(page.getByText('Temel ekran · 320 px')).toBeVisible();
    await field().fill('36');
    await field().press('Enter');
    expect(await h1()).toBe(36);

    await page.goto('/?ctx=html&role=h1&device=t744');
    await expect(page.getByText(/Ekran · 744 px/)).toBeVisible();
    expect(await h1()).toBe(autoScale(36, 320, 744, 1.25));
    await expect(source()).toHaveText("Otomatik · 320 px'ten");
    await field().fill('42');
    await field().press('Enter');
    await expect(source()).toHaveText('Bu ekranda (744 px)');
    expect(await h1()).toBe(42);

    await page.goto('/?ctx=html&role=h1&device=m390');
    expect(await h1()).toBe(autoScale(36, 320, 390, 1.25));
    await page.goto('/?ctx=html&role=h1&device=l1440');
    expect(await h1()).toBe(autoScale(42, 744, 1440, 1.25));
    await expect(source()).toHaveText("Otomatik · 744 px'ten");
    // H2 bağımsız: kendi kararıyla hesaplanır.
    expect(await page.locator('.gx-canvas .pv-page [data-role="h2"]').first().evaluate((e) => parseFloat(getComputedStyle(e).fontSize))).toBe(autoScale(28, 320, 1440, 1.25));

    await page.getByRole('button', { name: 'Dışa aktar' }).click();
    const json = await page.locator('.mantine-CodeHighlight-code, pre').filter({ hasText: 'screenOverrides' }).first().textContent();
    expect(json).toContain('"744"');
    expect(json).toContain('"fontSizePx": 42');
    expect(json).toContain('@media (min-width: 744px)');
  });
});
