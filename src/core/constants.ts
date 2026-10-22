import { PHONE_MODELS, TABLET_MODELS, LAPTOP_MODELS } from './hardware';
import type { BgKey, CategoryId, ContextId, ContextSettings, Device, ProductId, Theme, TierId } from './types';

/** GenUX kuralı (kullanıcı kararları 2026-10-18 ve 2026-10-19): okuma metni varsayılanı 16 (en az 16);
 *  istisna varsayılanı 14; etiket ve pill bileşenleri 14; 14 en alt sınır; uzun okuma 18 sabit. */
export const HARD = { minReadable: 14, standard: 16, exception: 14, tagPill: 14, minReading: 16, longReading: 18, minWeight: 300 } as const;

/** Kararlar, mobil öncelikli: temel ekran 320 px (kullanıcı kararı 2026-10-19). */
export const DECISIONS: Record<string, number> = { h1: 32, h2: 28, h3: 24, h4: 21, h5: 18, h6: 16, body: 16, paragraph: 16, long: 18 };
/** Otomatik ölçek (kullanıcı kararı 2026-10-19): boyut, en yakın alt çapadan genişlik oranıyla büyür.
 *  boyut(w) = çapa × (min(w, 1920) / min(çapa genişliği, 1920)) ^ üs,  üs = ln(büyüme) / ln(1920 / 320).
 *  "büyüme" 320 → 1920 arasındaki toplam çarpandır (1 = sabit). 1920 üstünde büyüme durur.
 *  Sonuç 0,1 px'e yuvarlanır: tam ya da yarım piksel yuvarlama ardışık başlık oranını 1,125'in altına düşürüyordu. */
export const SCALE_FROM = 320;
export const SCALE_CAP = 1920;
export function autoScale(size: number, fromW: number, toW: number, growth: number): number {
  if (growth === 1 || toW <= fromW || fromW >= SCALE_CAP) return size;
  const e = Math.log(growth) / Math.log(SCALE_CAP / SCALE_FROM);
  return Math.round(size * (Math.min(toW, SCALE_CAP) / Math.max(fromW, SCALE_FROM)) ** e * 10) / 10;
}
/** Karar verilmiş türlerin varsayılan büyümesi: masaüstünde (1920) H1 40, H2 35, H3 30, H4 26, H5 22, H6 18. */
export const DECISION_GROWTH: Record<string, number> = { h1: 1.25, h2: 1.25, h3: 1.25, h4: 1.24, h5: 1.22, h6: 1.125, body: 1, paragraph: 1, long: 1 };
/** Merdivenin basamakları = ekran gruplarının ilk kırılımları: mobil, tablet, laptop, masaüstü.
 *  Grubun diğer cihazları ilk kırılımdan kalıtır (telefonlar 320'den, tabletler 600'den, laptoplar 960'tan, monitörler 1920'den). */
export const GROUP_BPS = [320, 600, 960, 1920] as const;
/** Uzun okumanın koşulu (dışa aktarmada ve denetçide gösterilir). */
export const LONG_READING_CONDITION = 'Dakikalarca kesintisiz okunan metin: makale, blog yazısı, yardım ve doküman makalesi, politika ve sözleşme sayfası, uzun ürün açıklaması. Ölçüt: birden çok paragraf ve yaklaşık 150 kelimeden uzun (1 dakikadan uzun okuma). Kart metni, form yardımı, bildirim ve kısa açıklama uzun okuma değildir (16).';
/** Bir genişlikteki karar değeri (karar verilmemiş türde null). */
export function decisionAt(id: string, w: number): number | null {
  if (!(id in DECISIONS)) return null;
  return autoScale(DECISIONS[id], SCALE_FROM, w, DECISION_GROWTH[id] ?? 1);
}
export const DEFAULT_RATIO = 1.125;

export const FORMAT = 'genux-typography-decisions';
export const STORAGE_KEY = 'genux-type-lab-v2';
export const SIZE_MAX = 120;
export const MAX_MAX = 160;

export const BASE_CTX: ContextId = 'html';
/** label: arayüzde görünen kısa ad (kullanıcı kararı 2026-10-18); name: tam ad (ipucu, ekran okuyucu, JSON). */
export const CONTEXTS: { id: ContextId; label: string; name: string; set: ContextSettings['set'] }[] = [
  { id: 'html', label: 'HTML', name: 'HTML5 temel katmanı', set: 'expressive' },
  { id: 'admin', label: 'SaaS', name: 'SaaS Admin', set: 'productive' },
  { id: 'marketing', label: 'Marketing', name: 'Marketing', set: 'expressive' },
  { id: 'ecommerce', label: 'E-ticaret', name: 'E-ticaret', set: 'expressive' },
  { id: 'bi', label: 'BI', name: 'Analytics & BI', set: 'productive' },
  { id: 'ai', label: 'AI', name: 'AI & Conversational', set: 'productive' },
];
export const CONTEXT_IDS = CONTEXTS.map((c) => c.id);
export const PRODUCT_IDS = CONTEXT_IDS.filter((c): c is ProductId => c !== BASE_CTX);
export const contextLabel = (id: ContextId) => CONTEXTS.find((c) => c.id === id)!.label;
export const contextName = (id: ContextId) => CONTEXTS.find((c) => c.id === id)!.name;

export const RANGES = {
  lh: { min: 0.6, max: 2.5, step: 0.05 },
  ls: { min: -0.05, max: 0.2, step: 0.005 },
  ws: { min: 0, max: 0.5, step: 0.01 },
  mt: { min: 0, max: 3, step: 0.05 },
  mb: { min: 0, max: 3, step: 0.05 },
  mw: { min: 0, max: 120, step: 1 },
  w: { min: 100, max: 900, step: 100 },
  em: { min: 0.5, max: 2, step: 0.05 },
  gr: { min: 1, max: 1.6, step: 0.01 },
} as const;

export const CHOICES = {
  ff: [['sans', 'Outfit'], ['mono', 'Mono'], ['system', 'Sistem']],
  fst: [['normal', 'Normal'], ['italic', 'İtalik']],
  tt: [['none', 'Yok'], ['uppercase', 'BÜYÜK'], ['capitalize', 'İlk Harf'], ['lowercase', 'küçük']],
  td: [['none', 'Yok'], ['underline', 'Altı çizili'], ['line-through', 'Üstü çizili']],
  num: [['normal', 'Normal'], ['tabular-nums', 'Eş genişlik'], ['proportional-nums', 'Orantılı']],
  ta: [['start', 'Başa'], ['center', 'Ortaya'], ['end', 'Sona']],
  wrap: [['wrap', 'Normal'], ['balance', 'Dengeli'], ['pretty', 'Dul satırsız']],
} as const;
export const CLAMP_CHOICES = [0, 1, 2, 3, 4] as const;
export const WEIGHT_NAME: Record<number, string> = {
  100: 'Thin', 200: 'ExtraLight', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black',
};

export const FONT_STACK = {
  sans: '"Outfit", system-ui, -apple-system, "Segoe UI", sans-serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  system: 'system-ui, -apple-system, "Segoe UI", sans-serif',
} as const;

/** Önizleme tuvalindeki gerçek zeminler. Kontrast en zayıf zemine göre ölçülür. */
export const BG: Record<Theme, Record<BgKey, string>> = {
  light: { surface: '#ffffff', field: '#ececec', bg: '#f4f4f4' },
  dark: { surface: '#1a1a1a', field: '#262626', bg: '#0e0e0e' },
};
export const BG_NAME: Record<BgKey, string> = { surface: 'tuval', field: 'alan', bg: 'kart' };
export const GRAYS = [0, 26, 51, 77, 102, 128, 153, 179, 204, 230, 255];

/** Ekran grupları (kullanıcı kararı 2026-10-19): mobil 320–599 · tablet 600–959 · laptop 960–1919 · masaüstü 1920+.
 *  Tablet 600'de başlar (7" tablet, açık katlanabilir); laptop 960'ta (Full HD %200 ölçek); masaüstü 1920'de (Full HD monitör). */
export const TIERS: { id: TierId; label: string; range: string; min: number }[] = [
  { id: 'mobile', label: 'Mobil', range: '320–599 px', min: 0 },
  { id: 'tablet', label: 'Tablet', range: '600–959 px', min: 600 },
  { id: 'laptop', label: 'Laptop', range: '960–1919 px', min: 960 },
  { id: 'desktop', label: 'Masaüstü', range: '1920 px ve üstü', min: 1920 },
];
export const TIER_IDS = TIERS.map((t) => t.id);
export const tierOf = (w: number): TierId => [...TIERS].reverse().find((t) => w >= t.min)!.id;

/** Önizleme cihazları = kırılımlar (CSS px, dikey). Her grubun ilki o grubun ilk kırılımıdır. */
export const DEVICES: Device[] = [
  ...PHONE_MODELS.map(model=>({id:model.id,group:'mobile' as const,w:model.width,h:model.height,name:model.name})),
  ...TABLET_MODELS.map(model=>({id:model.id,group:'tablet' as const,w:model.width,h:model.height,name:model.name})),
  ...LAPTOP_MODELS.map(model=>({id:model.id,group:'laptop' as const,w:model.width,h:model.height,name:model.name})),
  { id: 'l1920', group: 'desktop', w: 1920, h: 1080, name: 'Full HD monitör (%100)' },
  { id: 'd2560', group: 'desktop', w: 2560, h: 1440, name: 'QHD monitör' },
  { id: 'd3440', group: 'desktop', w: 3440, h: 1440, name: 'Ultra geniş monitör' },
  { id: 'd3840', group: 'desktop', w: 3840, h: 2160, name: '4K monitör' },
];
/** Grup seçilince açılan cihaz: grubun ilk kırılımı (mobil öncelik). */
export const GROUP_FIRST: Record<TierId, string> = { mobile: 'm320', tablet: 't600', laptop: 'l960', desktop: 'l1920' };
export const DEVICE_GROUPS: { id: TierId; label: string }[] = [
  { id: 'mobile', label: 'Mobil' },
  { id: 'tablet', label: 'Tablet' },
  { id: 'laptop', label: 'Laptop' },
  { id: 'desktop', label: 'Masaüstü' },
];
/** Kırılım zinciri: cihaz genişlikleri küçükten büyüğe. İlki temel ekrandır; her kırılım bir öncekinden kalıtır. */
export const BREAKPOINTS: number[] = [...new Set(DEVICES.map((d) => d.w))].sort((a, b) => a - b);
export const BASE_BP = BREAKPOINTS[0];
/** Bir genişlikte düzenlenen kırılım: o genişliğe kadarki en büyük kırılım. */
export const breakpointAt = (w: number) => [...BREAKPOINTS].reverse().find((b) => b <= w) ?? BASE_BP;
export const deviceAtBreakpoint = (bp: number) => DEVICES.find((d) => d.w === bp)!;
export const deviceById = (id: string) => DEVICES.find((d) => d.id === id) ?? DEVICES.find((d) => d.id === 'l1280')!;
export function deviceDims(id: string, orient: 'portrait' | 'landscape') {
  const d = deviceById(id);
  const land = orient === 'landscape' && (d.group === 'mobile' || d.group === 'tablet');
  return { d, land, w: land ? d.h : d.w, h: land ? d.w : d.h };
}

export const CATEGORIES: { id: CategoryId; label: string; hint: string }[] = [
  { id: 'headings', label: 'Headings', hint: 'H1–H6 ve başlık rolleri' },
  { id: 'body', label: 'Body', hint: 'Gövde, paragraf, makale, açıklama' },
  { id: 'interface', label: 'Interface', hint: 'Button, input, label, menu, tab' },
  { id: 'data', label: 'Data', hint: 'Tablo, metrik, rozet, sayı' },
  { id: 'commerce', label: 'Commerce', hint: 'Ürün başlığı, fiyat, stok' },
  { id: 'conversation', label: 'Conversation', hint: 'Sohbet, komut, kaynak, araç adımı' },
  { id: 'editorial', label: 'Editorial', hint: 'Alıntı, liste, satır içi anlam' },
  { id: 'technical', label: 'Technical', hint: 'Code, pre, kbd' },
];

export const DEFAULT_SETTINGS = (ctx: ContextId): ContextSettings => ({
  set: CONTEXTS.find((c) => c.id === ctx)!.set,
  basis: 'viewport',
  minW: 320,
  maxW: 1280,
});
