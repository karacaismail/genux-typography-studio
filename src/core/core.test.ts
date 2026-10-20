import { describe, expect, it } from 'vitest';
import {
  BASE_CTX, CONTEXTS, CONTEXT_IDS, HARD, ROLE, ROLES, applyOverride, buildExport, changedProps, computeChecks, contrast, contrastInfo,
  cssSize, cssTiers, defaultDecisions, enforceRole, enforceSettings, importData, isTiers, layerOf, normalizeGray, parseNum,
  propSource, resetProps, resetRole, resolveContext, resolveRole, roleWarnings, rolesOf, sizeAt,
} from './index';
import type { Decisions } from './types';

const fresh = () => defaultDecisions();
const S = (dec: Decisions, ctx: 'html' | 'admin' | 'marketing' | 'ecommerce') => dec.contexts[ctx].settings;

describe('katalog', () => {
  it('her türün kimliği tekil ve kategorisi tanımlı', () => {
    expect(new Set(ROLES.map((r) => r.id)).size).toBe(ROLES.length);
    ROLES.forEach((r) => expect(r.category).toBeTruthy());
  });
  it('altı ürün türü: görünen kısa adlar ve tam adlar', () => {
    expect(CONTEXTS.map((c) => c.label)).toEqual(['HTML', 'SaaS', 'Marketing', 'E-ticaret', 'BI', 'AI']);
    expect(CONTEXTS.map((c) => c.name)).toEqual(['HTML5 temel katmanı', 'SaaS Admin', 'Marketing', 'E-ticaret', 'Analytics & BI', 'AI & Conversational']);
    // Erişilebilir ad görünen adı içerir (WCAG 2.5.3).
    CONTEXTS.forEach((c) => expect(c.name).toContain(c.label));
  });
  it('sohbet mesajı ve komut girdisi okuma metnidir (16 altına inmez)', () => {
    expect(enforceRole('chatMessage', { size: 12 }).size).toBe(16);
    expect(enforceRole('promptInput', { size: 14 }).size).toBe(16);
  });
  it('elementler temelde ve her ürün türünde var', () => {
    ROLES.filter((r) => r.el).forEach((r) => expect(r.ctx).toEqual(CONTEXT_IDS));
  });
  it('kararlar katalogda birebir', () => {
    // Mobil öncelikli temel (320 px): kullanıcı kararı 2026-10-19.
    expect([ROLE.h1, ROLE.h2, ROLE.h3, ROLE.h4, ROLE.h5, ROLE.h6].map((r) => r.def.size)).toEqual([32, 28, 24, 21, 18, 16]);
    expect(ROLE.badge.def.size).toBe(12);
    expect(ROLE.caption.def.size).toBe(14);
    expect(ROLE.body.def.size).toBe(16);
    expect(ROLE.paragraph.def.size).toBe(16);
    expect(ROLE.long.def.size).toBe(18);
  });
});

describe('enforceRole: kesin kurallar', () => {
  it('istisna türleri 12 px altına inmez', () => {
    expect(enforceRole('caption', { size: 8 }).size).toBe(HARD.minReadable);
  });
  it('okuma metni 16 px altına inmez', () => {
    expect(enforceRole('paragraph', { size: 12 }).size).toBe(16);
    expect(enforceRole('rating', { size: 12 }).size).toBe(16);
  });
  it('uzun okuma 18 px ve statik kilitli', () => {
    const r = enforceRole('long', { size: 24, mode: 'fluid', max: 30, sizes: { mobile: 16, tablet: 20, laptop: 22, desktop: 24 } });
    expect(r.size).toBe(18);
    expect(r.max).toBe(18);
    expect(r.mode).toBe('static');
    expect(r.sizes).toEqual({ mobile: 18, tablet: 18, laptop: 18, desktop: 18 });
  });
  it('ekrana göre boyutların her biri kurallardan geçer', () => {
    const r = enforceRole('h1', { mode: 'tiers', sizes: { mobile: 4, tablet: 32, laptop: 36, desktop: 999 } });
    expect(r.sizes).toEqual({ mobile: 12, tablet: 32, laptop: 36, desktop: 120 });
  });
  it('tiers modunda boyut listesi yoksa tek boyuttan doldurulur', () => {
    expect(enforceRole('h2', { mode: 'tiers' }).sizes).toEqual({ mobile: 28, tablet: 28, laptop: 28, desktop: 28 });
  });
  it('en büyük değer en küçükten küçük olamaz', () => {
    expect(enforceRole('h1', { size: 48, max: 40 }).max).toBe(48);
  });
  it('geçersiz ağırlık ve seçenekler varsayılana döner', () => {
    const r = enforceRole('h1', { w: 450, tt: 'shout', ff: 'comic' });
    expect(r.w).toBe(600);
    expect(r.tt).toBe('none');
    expect(r.ff).toBe('sans');
  });
  it('renkli hex reddedilir, gri kabul edilir', () => {
    const r = enforceRole('h1', { c: { light: '#ff0000', dark: '#ccc' } });
    expect(r.c.light).toBe(ROLE.h1.def.c.light);
    expect(r.c.dark).toBe('#cccccc');
  });
  it('tabloda ve satır içi öğede satır sınırı uygulanmaz', () => {
    expect(enforceRole('td', { clamp: 2 }).clamp).toBe(0);
    expect(enforceRole('strong', { clamp: 2 }).clamp).toBe(0);
    expect(enforceRole('productTitle', { clamp: 3 }).clamp).toBe(3);
  });
  it('göreli em aralıkta kalır', () => {
    expect(enforceRole('code', { em: 5 }).em).toBe(2);
  });
  it('bağlam ayarları sınırlanır', () => {
    expect(enforceSettings('admin', { minW: 100, maxW: 200 })).toEqual({ set: 'productive', basis: 'viewport', minW: 240, maxW: 320 });
  });
});

describe('çözümleme zinciri', () => {
  it('ürün türü farkı uygulanır', () => {
    const d = fresh();
    expect(resolveRole(d, 'admin', 'label').size).toBe(14);
    expect(resolveRole(d, 'html', 'label').size).toBe(16);
    expect(propSource(d, 'admin', 'label', 'size')).toBe('context');
  });
  it('elementler temel katmandan devralır, ezilen özellik ayrılır', () => {
    let d = applyOverride(fresh(), BASE_CTX, 'h3', { size: 30, w: 600 });
    expect(resolveRole(d, 'marketing', 'h3').size).toBe(30);
    expect(propSource(d, 'marketing', 'h3', 'size')).toBe('inherited');
    d = applyOverride(d, 'marketing', 'h3', { size: 26 });
    expect(resolveRole(d, 'marketing', 'h3').size).toBe(26);
    expect(resolveRole(d, 'marketing', 'h3').w).toBe(600); // ağırlık hâlâ temelden
    expect(propSource(d, 'marketing', 'h3', 'size')).toBe('overridden');
    expect(resolveRole(d, 'admin', 'h3').size).toBe(30);
  });
  it('devralınana dön yalnız o özelliği kaldırır', () => {
    let d = applyOverride(fresh(), 'ecommerce', 'h2', { size: 30, lh: 1.3 });
    d = resetProps(d, 'ecommerce', 'h2', ['size']);
    expect(resolveRole(d, 'ecommerce', 'h2').size).toBe(28);
    expect(resolveRole(d, 'ecommerce', 'h2').lh).toBe(1.3);
    d = resetRole(d, 'ecommerce', 'h2');
    expect(d.contexts.ecommerce.overrides.h2).toBeUndefined();
  });
  it('ezme saklanırken kurallardan geçer', () => {
    const d = applyOverride(fresh(), 'admin', 'body', { size: 10 });
    expect(d.contexts.admin.overrides.body?.size).toBe(16);
  });
  it('bağlamlar birbirinden bağımsız', () => {
    const d = applyOverride(fresh(), 'ecommerce', 'price', { size: 28 });
    expect(resolveRole(d, 'ecommerce', 'price').size).toBe(28);
    expect(changedProps(d, 'ecommerce', 'price')).toEqual(['size']);
    expect(resolveRole(applyOverride(fresh(), 'ecommerce', 'h1', { size: 40 }), 'admin', 'h1').size).toBe(32);
  });
  it('girdi nesnesi değişmez (immutability)', () => {
    const d = fresh();
    const snap = JSON.stringify(d);
    applyOverride(d, 'admin', 'h1', { size: 40 });
    expect(JSON.stringify(d)).toBe(snap);
  });
  it('her bağlamdaki her tür çözülür', () => {
    const d = fresh();
    CONTEXT_IDS.forEach((c) => expect(Object.keys(resolveContext(d, c)).length).toBe(rolesOf(c).length));
  });
});

describe('boyut hesapları', () => {
  it('statik', () => {
    const d = fresh();
    expect(sizeAt(resolveRole(d, 'admin', 'h1'), S(d, 'admin'), 'h1', 375)).toBe(32);
    expect(cssSize(resolveRole(d, 'admin', 'h1'), S(d, 'admin'), 'h1')).toBe('2rem');
  });
  it('ekrana göre: kırılım sınırları', () => {
    const d = applyOverride(fresh(), 'admin', 'h1', { mode: 'tiers', sizes: { mobile: 28, tablet: 32, laptop: 36, desktop: 40 } });
    const r = resolveRole(d, 'admin', 'h1');
    // Gruplar: tablet 600, laptop 960, masaüstü 1920.
    expect([320, 599, 600, 959, 960, 1919, 1920].map((w) => sizeAt(r, S(d, 'admin'), 'h1', w))).toEqual([28, 28, 32, 32, 36, 36, 40]);
    expect(isTiers(r) && cssTiers(r)).toEqual({ base: '1.75rem', '@media (min-width: 600px)': '2rem', '@media (min-width: 960px)': '2.25rem', '@media (min-width: 1920px)': '2.5rem' });
  });
  it('akışkan: vw ve cqi, uçlarda sınırlı', () => {
    let d = fresh();
    const r = resolveRole(d, 'marketing', 'display');
    expect(sizeAt(r, S(d, 'marketing'), 'display', 320)).toBe(40);
    expect(sizeAt(r, S(d, 'marketing'), 'display', 800)).toBe(52);
    expect(sizeAt(r, S(d, 'marketing'), 'display', 2000)).toBe(64);
    expect(cssSize(r, S(d, 'marketing'), 'display')).toBe('clamp(2.5rem, 2rem + 2.5vw, 4rem)');
    d = { ...d, contexts: { ...d.contexts, marketing: { ...d.contexts.marketing, settings: { ...S(d, 'marketing'), basis: 'container' } } } };
    expect(cssSize(r, S(d, 'marketing'), 'display')).toContain('cqi');
  });
  it('akışkan: negatif kesişim', () => {
    const d = applyOverride(fresh(), 'marketing', 'display', { size: 16, max: 120 });
    expect(cssSize(resolveRole(d, 'marketing', 'display'), S(d, 'marketing'), 'display')).toMatch(/^clamp\(1rem, [\d.]+vw - [\d.]+rem, 7.5rem\)$/);
  });
  it('productive sette akışkanlık uygulanmaz', () => {
    const d = applyOverride(fresh(), 'admin', 'h1', { mode: 'fluid', max: 48 });
    expect(sizeAt(resolveRole(d, 'admin', 'h1'), S(d, 'admin'), 'h1', 1280)).toBe(32);
  });
  it('göreli: alt sınırlı em', () => {
    const d = fresh();
    expect(cssSize(resolveRole(d, 'html', 'sub'), S(d, 'html'), 'sub')).toBe('max(0.75rem, 0.75em)');
    expect(sizeAt(resolveRole(d, 'html', 'rt'), S(d, 'html'), 'rt', 1280)).toBe(12);
  });
});

describe('kontrast', () => {
  it('siyah-beyaz 21:1', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5);
  });
  it('en zayıf zemine göre ölçülür ve büyük metin eşiği 3', () => {
    const r = enforceRole('h1', { c: { light: '#8a8a8a', dark: '#f2f2f2' } });
    const c = contrastInfo(r, 'h1', 'light');
    expect(c.need).toBe(3);
    expect(c.on).toBe('kart');
  });
  it('gri normalizasyonu', () => {
    expect(normalizeGray('ABC')).toBeNull();
    expect(normalizeGray('#777')).toBe('#777777');
    expect(normalizeGray('7f7f7f')).toBe('#7f7f7f');
  });
});

describe('kontroller', () => {
  it('varsayılanlarda uyarı yok: kararlar birebir, başlık oranı her grupta en az 1,125', () => {
    const d = fresh();
    expect(d.ratio).toBe(1.125);
    CONTEXT_IDS.forEach((c) => {
      const checks = computeChecks(d, c);
      expect(checks.filter((x) => x.status === 'warn').map((w) => w.title), c).toEqual([]);
      expect(checks.find((x) => x.title === 'Başlık ve gövde kararlarıyla birebir')?.status).toBe('pass');
    });
    expect(computeChecks({ ...d, ratio: 1.15 }, 'admin').some((x) => x.title === 'Ardışık başlık oranı 1,15 altında')).toBe(true);
  });
  it('karardan sapma ve başlık oranı uyarısı', () => {
    const d = applyOverride(fresh(), 'admin', 'h2', { size: 35 });
    const titles = computeChecks(d, 'admin').filter((x) => x.status === 'warn').map((x) => x.title);
    expect(titles).toContain('Karardan sapma');
    expect(titles.some((t) => t.startsWith('Ardışık başlık oranı'))).toBe(true);
  });
  it('kontrast uyarısı tür listesini taşır', () => {
    const d = applyOverride(fresh(), 'admin', 'caption', { c: { light: '#bbbbbb', dark: '#a6a6a6' } });
    const c = computeChecks(d, 'admin').find((x) => x.title === 'Kontrast AA altında');
    expect(c?.roles).toContain('caption');
  });
  it('tür uyarıları: satır yüksekliği, italik, büyük harf, satır sınırı, ölçü', () => {
    const r = enforceRole('paragraph', { lh: 1.2, fst: 'italic', tt: 'uppercase', clamp: 2, mw: 100 });
    const codes = roleWarnings(r, defaultDecisions().contexts.html.settings, 'paragraph').map((w) => w.code);
    expect(codes).toEqual(expect.arrayContaining(['lh', 'italic', 'case', 'clamp', 'measure']));
  });
  it('kabına sığmama ve font durumu ortamdan gelir', () => {
    const titles = computeChecks(fresh(), 'admin', { overflow: true, fontStatus: 'fail' }).map((c) => c.title);
    expect(titles).toContain('Önizlemede kabına sığmayan metin var');
    expect(titles).toContain('Outfit yüklenemedi');
  });
});

describe('JSON içe ve dışa aktarma', () => {
  const strip = (o: ReturnType<typeof buildExport>) => {
    const c = JSON.parse(JSON.stringify(o.contexts));
    Object.values(c).forEach((x) => delete (x as Record<string, unknown>).checks);
    return JSON.stringify(c);
  };
  const edited = () => {
    let d = applyOverride(fresh(), BASE_CTX, 'h3', { size: 30 });
    d = applyOverride(d, 'ecommerce', 'h3', { lh: 1.4 });
    d = applyOverride(d, 'admin', 'h1', { mode: 'tiers', sizes: { mobile: 28, tablet: 32, laptop: 36, desktop: 40 } });
    d = applyOverride(d, 'marketing', 'display', { c: { light: '#333333', dark: '#eeeeee' } });
    return { ...d, ratio: 1.2 };
  };
  it('tümü: gidiş-dönüş aynı', () => {
    const d = edited();
    const out = buildExport(d, 'all');
    const back = importData(JSON.parse(JSON.stringify(out)), fresh(), 'admin');
    expect(strip(buildExport(back.decisions, 'all'))).toBe(strip(out));
    expect(back.decisions.ratio).toBe(1.2);
    expect(back.report.adjusted).toEqual([]);
  });
  it('yalnız değişenler: yalnız ezilen türler yazılır ve geri yüklenince aynı', () => {
    const d = edited();
    const changed = buildExport(d, 'changed');
    const roles = Object.fromEntries(Object.entries(changed.contexts).map(([k, v]) => [k, Object.keys((v as { roles: object }).roles)]));
    expect(roles).toEqual({ html: ['h3'], admin: ['h1'], marketing: ['display'], ecommerce: ['h3'], bi: [], ai: [] });
    const back = importData(JSON.parse(JSON.stringify(changed)), fresh(), 'admin');
    expect(strip(buildExport(back.decisions, 'all'))).toBe(strip(buildExport(d, 'all')));
    expect(back.decisions.contexts.ecommerce.overrides.h3).toEqual({ lh: 1.4 });
  });
  it('etkin olmayan ekran boyutları ve em gidiş-dönüşte korunur', () => {
    let d = applyOverride(fresh(), 'admin', 'h1', { mode: 'tiers', sizes: { mobile: 28, tablet: 32, laptop: 36, desktop: 40 } });
    d = applyOverride(d, 'admin', 'h1', { mode: 'static' });
    d = applyOverride(d, 'admin', 'link', { mode: 'static', em: 1.25 });
    const back = importData(JSON.parse(JSON.stringify(buildExport(d, 'changed'))), fresh(), 'admin').decisions;
    const again = applyOverride(back, 'admin', 'h1', { mode: 'tiers' });
    expect(resolveRole(again, 'admin', 'h1').sizes).toEqual({ mobile: 28, tablet: 32, laptop: 36, desktop: 40 });
    expect(resolveRole(applyOverride(back, 'admin', 'link', { mode: 'relative' }), 'admin', 'link').em).toBe(1.25);
  });
  it('sürüm 1 içe aktarma mevcut başlık oranını korur', () => {
    const cur = { ...fresh(), ratio: 1.2 };
    expect(importData({ roles: { h1: { fontSize: { min: 34, max: 34 } } } }, cur, 'admin').decisions.ratio).toBe(1.2);
  });
  it('katman bilgisi', () => {
    const d = edited();
    expect(layerOf(d, 'html', 'h3')).toBe('base');
    expect(layerOf(d, 'admin', 'h3')).toBe('inherited');
    expect(layerOf(d, 'ecommerce', 'h3')).toBe('override');
    expect(layerOf(d, 'admin', 'label')).toBe('override');
    expect(layerOf(d, 'admin', 'kpi')).toBeNull();
  });
  it('kurallar içe aktarmada uygulanır ve raporlanır', () => {
    const file = { format: 'genux-typography-decisions', version: 2, contexts: { admin: { roles: {
      body: { fontSize: { mode: 'static', min: 12, max: 12 } },
      h1: { color: { light: '#ff0000' } },
    } } } };
    const { decisions, report } = importData(file, fresh(), 'admin');
    expect(resolveRole(decisions, 'admin', 'body').size).toBe(16);
    expect(report.adjusted[0]).toContain('12→16');
    expect(report.rejected[0]).toContain('#ff0000');
  });
  it('eski laboratuvar dosyası: devralan element ezme üretmez, özelleştirme yalnız farkları saklar', () => {
    const file = { format: 'genux-typography-decisions', version: 2, contexts: {
      html: { roles: { h4: { fontSize: { mode: 'static', min: 22, max: 26 }, lineHeight: 1.33, fontWeight: 500 } } },
      admin: { roles: { h4: { element: true, inherit: true, fontSize: { mode: 'static', min: 22, max: 26 } } } },
      marketing: { roles: { h4: { element: true, inherit: false, fontSize: { mode: 'static', min: 22, max: 26 }, fontWeight: 600 } } },
    } };
    const { decisions } = importData(file, fresh(), 'admin');
    expect(decisions.contexts.admin.overrides.h4).toBeUndefined();
    expect(resolveRole(decisions, 'admin', 'h4').size).toBe(22);
    expect(decisions.contexts.marketing.overrides.h4).toEqual({ w: 600 });
  });
  it('sürüm 1 dosyası etkin bağlama yüklenir, diğerleri korunur', () => {
    const cur = applyOverride(fresh(), 'marketing', 'h1', { size: 40 });
    const { decisions, report } = importData({ roles: { h1: { fontSize: { min: 34, max: 34 } } } }, cur, 'admin');
    expect(resolveRole(decisions, 'admin', 'h1').size).toBe(34);
    expect(resolveRole(decisions, 'marketing', 'h1').size).toBe(40);
    expect(report.notes[0]).toContain('Sürüm 1');
  });
  it('bozuk dosyalar anlaşılır hata verir', () => {
    expect(() => importData([], fresh(), 'admin')).toThrow('JSON nesnesi');
    expect(() => importData({ format: 'x' }, fresh(), 'admin')).toThrow('Bilinmeyen biçim');
    expect(() => importData({ foo: 1 }, fresh(), 'admin')).toThrow('contexts');
    expect(() => importData({ contexts: { admin: { roles: { nope: {} } } } }, fresh(), 'admin')).toThrow('Tanınan tür');
  });
  it('başlık oranı eşiği 3 ondalıkla korunur (1,125 → 1,13 olmaz)', () => {
    const out = buildExport(fresh(), 'all');
    expect(importData(JSON.parse(JSON.stringify(out)), fresh(), 'admin').decisions.ratio).toBe(1.125);
  });
  it('ui bloğu ayrı döner', () => {
    const out = buildExport(fresh(), 'all', { ui: { ctx: 'marketing' } });
    expect(importData(out, fresh(), 'admin').ui).toEqual({ ctx: 'marketing' });
  });
});

describe('sayı girişi', () => {
  it('virgül ondalık ayırıcı kabul edilir', () => {
    expect(parseNum('1,5')).toBe(1.5);
    expect(parseNum(' 16 ')).toBe(16);
    expect(parseNum('abc')).toBeNull();
    expect(parseNum('')).toBeNull();
  });
});
