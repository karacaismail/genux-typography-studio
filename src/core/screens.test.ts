import { describe, expect, it } from 'vitest';
import {
  BASE_BP, BREAKPOINTS, applyOverride, applyOverrideAt, autoScale, breakpointAt, buildExport, changeCount, computeChecks, decisionAt,
  defaultDecisions, importData, resetPropsAt, resetRole, resolveAt, resolveRole, screenSource,
} from './index';

const fresh = () => defaultDecisions();
const size = (d: ReturnType<typeof fresh>, ctx: 'html' | 'admin' | 'ai', id: string, w: number) => resolveAt(d, ctx, id, w).size;

describe('kırılımlar ve gruplar', () => {
  it('cihaz genişlikleri: mobil 320, tablet 600, laptop 960, masaüstü 1920 ile başlar', () => {
    expect(BASE_BP).toBe(320);
    expect(BREAKPOINTS).toEqual([320, 360, 375, 390, 414, 430, 600, 744, 768, 820, 834, 960, 1024, 1280, 1366, 1440, 1536, 1680, 1920, 2560, 3440, 3840]);
    expect(breakpointAt(300)).toBe(320);
    expect(breakpointAt(800)).toBe(768);
  });
});

describe('otomatik ölçek', () => {
  it('formül: çapa × (w / çapa)^üs; 1920 üstünde büyüme durur; 0,1 px', () => {
    expect(autoScale(32, 320, 1920, 1.25)).toBe(40);
    expect(autoScale(32, 320, 3840, 1.25)).toBe(40);
    expect(autoScale(32, 320, 375, 1.25)).toBe(32.6);
    expect(autoScale(16, 320, 1920, 1)).toBe(16);
  });
  it('varsayılan kararlar: mobil 32/28/24/21/18/16 → masaüstü 40/35/30/26/22/18', () => {
    expect(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].map((id) => size(fresh(), 'html', id, 320))).toEqual([32, 28, 24, 21, 18, 16]);
    expect(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].map((id) => size(fresh(), 'html', id, 1920))).toEqual([40, 35, 30, 26, 22, 18]);
    expect(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].map((id) => decisionAt(id, 1920))).toEqual([40, 35, 30, 26, 22, 18]);
    // Gövde, paragraf ve uzun okuma her ekranda aynı.
    for (const w of BREAKPOINTS) {
      expect(size(fresh(), 'html', 'paragraph', w)).toBe(16);
      expect(size(fresh(), 'html', 'long', w)).toBe(18);
    }
  });
  it('ardışık başlık oranı her kırılımda en az 1,125', () => {
    const ids = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
    for (const w of BREAKPOINTS) {
      const v = ids.map((id) => size(fresh(), 'html', id, w));
      for (let i = 0; i < 5; i += 1) expect(v[i] / v[i + 1], `${w} ${ids[i]}/${ids[i + 1]}`).toBeGreaterThanOrEqual(1.125);
    }
  });
  it('320\'de H1 değişince bütün kırılımlar yeniden hesaplanır; H2 etkilenmez', () => {
    const d = applyOverrideAt(fresh(), 'html', 'h1', { size: 36 }, 320);
    expect(size(d, 'html', 'h1', 320)).toBe(36);
    expect(size(d, 'html', 'h1', 1920)).toBe(45);
    expect(size(d, 'html', 'h1', 960)).toBeGreaterThan(size(d, 'html', 'h1', 600));
    expect(size(d, 'html', 'h2', 1920)).toBe(35);
    expect(screenSource(d, 'html', 'h1', 'size', 1440)).toEqual({ kind: 'auto', from: 320 });
  });
  it('özel değer yeni çapa olur; üstü ondan hesaplanır, altı değişmez', () => {
    let d = applyOverrideAt(fresh(), 'html', 'h2', { size: 32 }, 744);
    expect(size(d, 'html', 'h2', 600)).toBe(size(fresh(), 'html', 'h2', 600));
    expect(size(d, 'html', 'h2', 744)).toBe(32);
    expect(size(d, 'html', 'h2', 1920)).toBe(autoScale(32, 744, 1920, 1.25));
    expect(screenSource(d, 'html', 'h2', 'size', 744)).toEqual({ kind: 'here' });
    expect(screenSource(d, 'html', 'h2', 'size', 1024)).toEqual({ kind: 'auto', from: 744 });
    d = resetPropsAt(d, 'html', 'h2', ['size'], 744);
    expect(size(d, 'html', 'h2', 1920)).toBe(35);
  });
  it('büyüme 1 ise boyut bütün ekranlarda aynı kalır', () => {
    const d = applyOverride(fresh(), 'html', 'h1', { gr: 1 });
    for (const w of BREAKPOINTS) expect(size(d, 'html', 'h1', w)).toBe(32);
  });
  it('ürün türündeki element HTML\'in otomatik değerlerini devralır; kendi temel boyutu kendi çapası olur', () => {
    let d = fresh();
    expect(size(d, 'admin', 'h1', 1920)).toBe(40);
    d = applyOverrideAt(d, 'admin', 'h1', { size: 30 }, 320);
    expect(size(d, 'admin', 'h1', 1920)).toBe(autoScale(30, 320, 1920, 1.25));
    expect(size(d, 'html', 'h1', 1920)).toBe(40);
  });
});

describe('kırılım zinciri (boyut dışı özellikler)', () => {
  it('kalıtılan değer kolay ayarlanır ve kalıtılana döner', () => {
    let d = applyOverrideAt(fresh(), 'html', 'h2', { lh: 1.4 }, 360);
    expect(screenSource(d, 'html', 'h2', 'lh', 375)).toEqual({ kind: 'screen', from: 360 });
    d = applyOverrideAt(d, 'html', 'h2', { lh: 1.2 }, 375);
    expect(screenSource(d, 'html', 'h2', 'lh', 375)).toEqual({ kind: 'here' });
    expect(resolveAt(d, 'html', 'h2', 1440).lh).toBe(1.2);
    d = resetPropsAt(d, 'html', 'h2', ['lh'], 375);
    expect(resolveAt(d, 'html', 'h2', 1440).lh).toBe(1.4);
    expect(resolveAt(d, 'html', 'h2', 320).lh).toBe(1.286);
  });
  it('renk ve büyüme kırılıma girmez: bütün ekranlarda aynı; açık ve koyu ayrı', () => {
    const d = applyOverrideAt(fresh(), 'html', 'h3', { c: { light: '#333333', dark: '#cccccc' }, gr: 1.1, size: 30 }, 1280);
    expect(resolveAt(d, 'html', 'h3', 320).c).toEqual({ light: '#333333', dark: '#cccccc' });
    expect(resolveAt(d, 'html', 'h3', 320).gr).toBe(1.1);
    expect(resolveAt(d, 'html', 'h3', 320).size).toBe(24);
    expect(resolveAt(d, 'html', 'h3', 1280).size).toBe(30);
    expect(d.contexts.html.screens?.h3?.['1280']).toEqual({ size: 30 });
  });
  it('kesin kurallar her kırılımda uygulanır', () => {
    let d = applyOverrideAt(fresh(), 'html', 'paragraph', { size: 12 }, 1440);
    expect(size(d, 'html', 'paragraph', 1440)).toBe(16);
    d = applyOverrideAt(d, 'html', 'long', { size: 22 }, 1920);
    expect(size(d, 'html', 'long', 1920)).toBe(18);
    d = applyOverrideAt(d, 'ai', 'chatMessage', { size: 14 }, 390);
    expect(size(d, 'ai', 'chatMessage', 390)).toBe(16);
  });
  it('ürün türündeki element HTML kırılım ayarını devralır; kendi ayarı önce gelir', () => {
    let d = applyOverrideAt(fresh(), 'html', 'h1', { size: 44 }, 1280);
    expect(size(d, 'admin', 'h1', 1280)).toBe(44);
    expect(screenSource(d, 'admin', 'h1', 'size', 1440)).toEqual({ kind: 'html-screen', from: 1280 });
    d = applyOverrideAt(d, 'admin', 'h1', { size: 38 }, 1366);
    expect(size(d, 'admin', 'h1', 1280)).toBe(44);
    expect(size(d, 'admin', 'h1', 1366)).toBe(38);
    expect(size(d, 'html', 'h1', 1366)).toBeGreaterThan(44);
  });
  it('türü sıfırlamak kırılımları da temizler; değişiklik sayısı kırılımları sayar', () => {
    let d = applyOverrideAt(fresh(), 'admin', 'kpi', { size: 40 }, 1280);
    expect(changeCount(d, 'admin', 'kpi')).toBe(1);
    d = resetRole(d, 'admin', 'kpi');
    expect(changeCount(d, 'admin', 'kpi')).toBe(0);
    expect(size(d, 'admin', 'kpi', 1920)).toBe(32);
  });
  it('JSON: kırılım ezmeleri, büyüme ve duyarlı liste dışa aktarılır; geri yüklenince aynı', () => {
    let d = applyOverrideAt(fresh(), 'html', 'h1', { size: 30 }, 744);
    d = applyOverrideAt(d, 'html', 'h1', { lh: 1.15 }, 1280);
    d = applyOverride(d, 'html', 'h2', { gr: 1.3 });
    d = applyOverrideAt(d, 'ai', 'chatMessage', { lh: 1.6 }, 1024);
    const out = buildExport(d, 'changed');
    const h1 = (out.contexts.html as { roles: Record<string, Record<string, unknown>> }).roles.h1;
    expect(h1.screenOverrides).toEqual({ 744: { fontSizePx: 30 }, 1280: { lineHeight: 1.15 } });
    expect((h1.responsive as { minWidthPx: number }[]).some((x) => x.minWidthPx === 744)).toBe(true);
    const back = importData(JSON.parse(JSON.stringify(out)), fresh(), 'admin').decisions;
    for (const w of BREAKPOINTS) {
      expect(size(back, 'html', 'h1', w)).toBe(size(d, 'html', 'h1', w));
      expect(size(back, 'html', 'h2', w)).toBe(size(d, 'html', 'h2', w));
    }
    expect(resolveAt(back, 'ai', 'chatMessage', 1440).lh).toBe(1.6);
    expect((out.decisions as { byScreen: Record<number, Record<string, number>> }).byScreen[1920].h1).toBe(40);
  });
  it('kontroller kırılım değerleriyle hesaplanır', () => {
    const d = applyOverrideAt(fresh(), 'html', 'h2', { size: 36 }, 960);
    const c = computeChecks(d, 'html').find((x) => x.title.startsWith('Ardışık başlık oranı'));
    expect(c?.detail).toMatch(/Laptop H1\/H2 = 1/);
  });
  it('temel ekrandaki (320) boyut dışı ezme kırılımlarda "320 px\'ten" görünür', () => {
    const d = applyOverride(fresh(), 'html', 'h4', { w: 600 });
    expect(screenSource(d, 'html', 'h4', 'w', 1440)).toEqual({ kind: 'base' });
    expect(resolveRole(d, 'html', 'h4').w).toBe(600);
  });
});

describe('ekrana göre listesi', () => {
  it('liste bütün ekranlarda aynıdır (temel ekrandan dolar)', () => {
    const d = applyOverrideAt(fresh(), 'admin', 'h1', { mode: 'tiers' }, 1440);
    for (const w of [320, 744, 1440, 2560]) expect(resolveAt(d, 'admin', 'h1', w).sizes).toEqual({ mobile: 32, tablet: 32, laptop: 32, desktop: 32 });
  });
});
