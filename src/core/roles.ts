import { CONTEXT_IDS, DECISION_GROWTH, PRODUCT_IDS } from './constants';
import type { BgKey, CategoryId, ContextId, GrayPair, Kind, RoleDef, RoleOverrides, RoleProps } from './types';

const pair = (light: string, dark: string): GrayPair => ({ light, dark });
export const C_HEAD = pair('#141414', '#f2f2f2');
export const C_TEXT = pair('#262626', '#e0e0e0');
export const C_SEC = pair('#5c5c5c', '#a6a6a6');

const BASE: Omit<RoleProps, 'size' | 'max' | 'w' | 'lh' | 'c'> = {
  mode: 'static', sizes: null, em: 1, gr: 1, ls: 0, ws: 0, ff: 'sans', fst: 'normal', tt: 'none', td: 'none',
  num: 'normal', ta: 'start', wrap: 'wrap', mw: 0, clamp: 0, mt: 0, mb: 0,
};
type Def = Partial<RoleProps> & Pick<RoleProps, 'lh' | 'w' | 'c'>;
const full = (d: Def): RoleProps => ({ size: 16, max: 16, ...BASE, ...d, c: { ...d.c } });

const role = (
  id: string, label: string, group: string, category: CategoryId, kind: Kind, ctx: ContextId[], def: Def,
  bgs: BgKey[], src: string, sample: string, samples?: RoleDef['samples'],
): RoleDef => ({ id, label, group, category, kind, ctx, def: full(def), bgs, src, sample, samples });
/** HTML5 metin elementi: temel katmanda ve her ürün türünde bulunur; ürünler temelden devralır. */
const EL = (
  id: string, label: string, group: string, category: CategoryId, kind: Kind, def: Def,
  bgs: BgKey[], src: string, sample: string, samples?: RoleDef['samples'],
): RoleDef => ({ ...role(id, label, group, category, kind, [...CONTEXT_IDS], def, bgs, src, sample, samples), el: true });
/** Üst öğeye göre boyut (em): satır içi elementler boyutu içinde bulundukları metinden alır. */
const REL = (em: number, extra: Def): Def => ({ size: 16, max: 16, ...extra, mode: 'relative', em });
const IN = (extra: Partial<Def>): Def => REL(1, { lh: 1.5, w: 400, c: C_TEXT, ...extra });

const HS: BgKey[] = ['surface', 'bg'];
const P = [...PRODUCT_IDS];

export const ROLES: RoleDef[] = [
  role('display', 'Display / Hero', 'Başlıklar', 'headings', 'display', ['marketing', 'ecommerce'], { size: 40, max: 64, lh: 1.12, w: 600, ls: -0.02, wrap: 'balance', c: C_HEAD }, HS, 'Öneri: hero 32–48 · merdiven +5 40→64 · 500–600', 'Arayüzünüzü dakikalar içinde yayınlayın'),
  EL('h1', 'H1', 'HTML · Başlıklar', 'headings', 'heading', { size: 32, max: 40, lh: 1.25, w: 600, ls: -0.01, wrap: 'balance', c: C_HEAD }, HS, 'Karar: 32 · 34 · 36 · 40 px (mobil 320 · tablet 600 · laptop 960 · masaüstü 1920)', 'HTML5 metin elementleri', { admin: 'Siparişler', marketing: 'Tipografi kararları neden önemli?', ecommerce: 'Aydınlatma', bi: 'Satış panosu', ai: 'Satış asistanı' }),
  EL('h2', 'H2', 'HTML · Başlıklar', 'headings', 'heading', { size: 28, max: 36, lh: 1.286, w: 600, ls: -0.005, wrap: 'balance', c: C_HEAD }, HS, 'Karar: 28 · 30 · 32 · 35 px', 'Bölüm başlığı', { admin: 'Son siparişler', marketing: 'Neden GenUX?', ecommerce: 'Değerlendirmeler', bi: 'Aylık gelir', ai: 'Kaynaklar' }),
  EL('h3', 'H3', 'HTML · Başlıklar', 'headings', 'heading', { size: 24, max: 32, lh: 1.333, w: 500, wrap: 'balance', c: C_HEAD }, HS, 'Karar: 24 · 26 · 28 · 30 px', 'Alt bölüm başlığı', { admin: 'Haftalık satış', marketing: 'Tutarlı tokenlar', ecommerce: 'Ürün açıklaması', bi: 'Bölge performansı', ai: 'Satış veri ambarı' }),
  EL('h4', 'H4', 'HTML · Başlıklar', 'headings', 'heading', { size: 21, max: 28, lh: 1.333, w: 500, c: C_HEAD }, HS, 'Karar: 21 · 22 · 24 · 26 px', 'Kart başlığı', { admin: 'Filtreler', marketing: 'Sık sorulan sorular', ecommerce: 'Teknik özellikler', bi: 'Uyarı kuralları', ai: 'Erişim' }),
  EL('h5', 'H5', 'HTML · Başlıklar', 'headings', 'heading', { size: 18, max: 24, lh: 1.444, w: 500, c: C_HEAD }, HS, 'Karar: 18 · 19 · 20 · 22 px', 'Grup başlığı', { admin: 'Teslimat kuralları', marketing: 'Ücretsiz plan var mı?', ecommerce: 'Malzeme', bi: 'Notlar', ai: 'Saklama süresi' }),
  EL('h6', 'H6', 'HTML · Başlıklar', 'headings', 'heading', { size: 16, max: 18, lh: 1.5, w: 500, c: C_HEAD }, HS, 'Karar: 16 · 16 · 16 · 18 px', 'Küçük başlık', { admin: 'Kargo firması seçimi', marketing: 'Faturalandırma', ecommerce: 'Kutu içeriği', bi: 'Tanımlar', ai: 'Kayıt politikası' }),
  EL('hgroupSub', 'Alt başlık (hgroup p)', 'HTML · Başlıklar', 'headings', 'ui', { size: 18, max: 20, lh: 1.44, w: 400, c: C_SEC }, ['surface'], 'Başlık grubunun alt başlığı', 'Her element kendi tür ayarını kullanır'),
  role('overline', 'Üst etiket (eyebrow)', 'Arayüz metni', 'headings', 'ui', ['marketing', 'ecommerce'], { size: 14, max: 14, lh: 1.43, w: 600, ls: 0.08, tt: 'uppercase', c: C_SEC }, HS, 'Ek seçenek: büyük harf + harf aralığı', 'Yeni · Sürüm 3'),

  role('lead', 'Giriş (lead)', 'Okuma metni', 'body', 'reading', P, { size: 18, max: 20, lh: 1.56, w: 400, mw: 64, c: C_TEXT }, HS, 'Öneri: giriş 18/28', 'Hazır bileşenler ve tutarlı tokenlarla ekibiniz tek dilde ilerler.'),
  EL('paragraph', 'Paragraf', 'HTML · Blok metin', 'body', 'reading', { size: 16, max: 18, lh: 1.63, w: 400, mw: 72, wrap: 'pretty', c: C_TEXT }, HS, 'Karar: 16 px · öneri 16/26', 'Paragraf metni okuma içindir; 16 pikselin altına inmez.'),
  EL('body', 'Gövde', 'HTML · Blok metin', 'body', 'reading', { size: 16, max: 18, lh: 1.5, w: 400, c: C_TEXT }, HS, 'Karar: 16 px', 'Arayüzdeki açıklama ve kısa metinler.'),
  EL('long', 'Uzun okuma (article)', 'HTML · Blok metin', 'body', 'long', { size: 18, max: 18, lh: 1.67, w: 400, mw: 72, wrap: 'pretty', c: C_TEXT }, ['surface'], 'Kesin karar: 18 px · makale, blog, yardım/doküman, politika sayfası; birden çok paragraf, ~150 kelimeden uzun', 'Uzun okuma metni dakikalarca okunan içerik içindir.'),
  role('notification', 'Bildirim metni', 'Okuma metni', 'body', 'reading', ['admin', 'bi', 'ai'], { size: 16, max: 16, lh: 1.5, w: 400, c: C_TEXT }, ['bg'], 'Öneri 14–16 · okuma metni olduğu için 16', '3 siparişin teslim süresi bugün doluyor.'),
  role('legal', 'Yasal metin', 'Okuma metni', 'body', 'reading', ['marketing', 'ecommerce'], { size: 16, max: 16, lh: 1.5, w: 400, mw: 80, c: C_SEC }, ['surface'], 'Öneri 14 · okuma metni olduğu için 16', 'Fiyatlara KDV dahildir.'),
  role('caption', 'Caption / ikincil', 'Arayüz metni', 'body', 'ui', P, { size: 14, max: 14, lh: 1.43, w: 300, c: C_SEC }, HS, 'Öneri: 14 px + ikincil ton + 300', 'Ölçüler yaklaşık değerdir.'),
  EL('small', 'Küçük not (small)', 'HTML · Satır içi', 'body', 'ui', { size: 14, max: 14, lh: 1.43, w: 400, c: C_SEC }, HS, 'Öneri: small → Caption 14 px (istisna)', 'Destekleyici açıklama'),
  EL('address', 'Adres', 'HTML · Blok metin', 'body', 'ui', { size: 16, max: 16, lh: 1.5, w: 400, c: C_TEXT }, ['surface'], 'Tarayıcı varsayılanı italiktir; burada normal', 'GenUX Atölye · Kadıköy, İstanbul'),

  EL('input', 'Girdi değeri (input)', 'HTML · Form', 'interface', 'reading', { size: 16, max: 16, lh: 1.5, w: 400, c: C_TEXT }, ['field'], 'Öneri: 16/24 · iOS 16 altı girdide yakınlaştırır', 'ornek@genux.com'),
  EL('textarea', 'Çok satırlı girdi', 'HTML · Form', 'interface', 'reading', { size: 16, max: 16, lh: 1.5, w: 400, c: C_TEXT }, ['field'], 'Okuma metni; iOS 16 altında yakınlaştırır', 'Mesajınızı yazın'),
  EL('label', 'Form etiketi (label)', 'HTML · Form', 'interface', 'ui', { size: 16, max: 16, lh: 1.5, w: 500, c: C_TEXT }, HS, 'Öneri: form label 14/20 · 500', 'Müşteri e-postası'),
  role('helper', 'Yardım / hata', 'Arayüz metni', 'interface', 'ui', ['admin', 'ecommerce', 'bi', 'ai'], { size: 14, max: 14, lh: 1.43, w: 400, c: C_SEC }, ['surface'], 'Öneri: helper / error 14/20 · 400', 'Bu adresle kayıtlı müşteri bulunamadı.'),
  EL('legend', 'Grup başlığı (legend)', 'HTML · Form', 'interface', 'ui', { size: 16, max: 16, lh: 1.5, w: 600, c: C_HEAD }, ['surface'], 'Öneri: legend → form bölüm başlığı', 'İletişim bilgileri'),
  EL('button', 'Buton', 'HTML · Form', 'interface', 'ui', { size: 16, max: 16, lh: 1.5, w: 500, c: C_TEXT }, ['field'], 'Öneri: 16/24 · 500', 'Değişiklikleri kaydet'),
  role('cta', 'Büyük buton (CTA)', 'Arayüz metni', 'interface', 'ui', ['marketing', 'ecommerce'], { size: 18, max: 18, lh: 1.44, w: 500, c: C_HEAD }, ['field'], 'Öneri: Button Large 18/26 · 64 px kontrol', 'Sepete ekle'),
  EL('option', 'Seçenek (option)', 'HTML · Form', 'interface', 'ui', { size: 16, max: 16, lh: 1.5, w: 400, c: C_TEXT }, ['surface'], 'Liste kutusu içinde; açılır menü değil', 'İstanbul'),
  EL('optgroup', 'Seçenek grubu (optgroup)', 'HTML · Form', 'interface', 'ui', { size: 16, max: 16, lh: 1.5, w: 600, c: C_SEC }, ['surface'], 'Seçenek grubunun etiketi', 'Marmara'),
  EL('output', 'Sonuç (output)', 'HTML · Form', 'interface', 'ui', { size: 16, max: 16, lh: 1.5, w: 600, num: 'tabular-nums', c: C_HEAD }, ['surface'], 'Hesaplanmış sonuç', 'Toplam: 3 öğe'),
  EL('summary', 'Özet (summary)', 'HTML · Etkileşim ve medya', 'interface', 'ui', { size: 16, max: 16, lh: 1.5, w: 500, c: C_HEAD }, ['surface'], 'Öneri: summary → Body veya Component Title', 'Teslimat koşulları'),
  EL('link', 'Bağlantı (a)', 'HTML · Satır içi', 'interface', 'inline', REL(1, { size: 16, max: 16, lh: 1.5, w: 500, td: 'underline', c: C_HEAD }), ['surface'], 'Öneri: içinde bulunduğu metnin boyutunu kullanır', 'Fiyatları görün'),
  role('nav', 'Menü / navigasyon', 'Navigasyon', 'interface', 'ui', P, { size: 14, max: 16, lh: 1.43, w: 500, c: C_TEXT }, HS, 'Öneri: menü 14–16 / 20–24 · 500', 'Siparişler'),
  role('tab', 'Sekme', 'Navigasyon', 'interface', 'ui', ['admin', 'ecommerce', 'bi', 'ai'], { size: 14, max: 16, lh: 1.43, w: 500, c: C_TEXT }, ['surface'], 'Öneri: tabs 14–16 · 500', 'Kargoda'),
  role('breadcrumb', 'Breadcrumb', 'Navigasyon', 'interface', 'ui', ['admin', 'ecommerce', 'bi', 'ai'], { size: 14, max: 14, lh: 1.43, w: 400, c: C_SEC }, ['surface'], 'Öneri: breadcrumb 14/20 · 400', 'Ana sayfa › Aydınlatma'),
  role('menuItem', 'Açılır menü seçeneği', 'Navigasyon', 'interface', 'ui', ['admin', 'bi', 'ai'], { size: 14, max: 16, lh: 1.43, w: 400, c: C_TEXT }, ['bg'], 'Öneri: dropdown seçeneği 14–16', 'Son 30 gün'),
  role('tooltip', 'Tooltip', 'Arayüz metni', 'interface', 'ui', ['admin', 'bi', 'ai'], { size: 14, max: 14, lh: 1.43, w: 400, c: C_TEXT }, ['field'], 'Öneri: tooltip 14/20', 'Kaydedilmemiş değişiklik yok'),
  role('footer', 'Footer bağlantısı', 'Navigasyon', 'interface', 'ui', ['marketing', 'ecommerce'], { size: 14, max: 16, lh: 1.43, w: 400, c: C_TEXT }, ['surface'], 'Öneri: footer bağlantısı 14–16 · 400', 'İade koşulları'),

  role('kpi', 'KPI değeri', 'Veri', 'data', 'ui', ['admin', 'bi'], { size: 28, max: 32, lh: 1.286, w: 600, ls: -0.01, num: 'tabular-nums', c: C_HEAD }, ['bg'], 'Öneri: KPI 24–32 / 32–40 · 600', '48.920 ₺'),
  role('kpiLabel', 'KPI etiketi', 'Veri', 'data', 'ui', ['admin', 'bi'], { size: 14, max: 14, lh: 1.43, w: 400, c: C_SEC }, ['bg'], 'Öneri: KPI etiketi 14/20 · 400', 'Bugünkü ciro'),
  EL('th', 'Başlık hücresi (th)', 'HTML · Tablo', 'data', 'ui', { size: 16, max: 16, lh: 1.43, w: 500, c: C_TEXT }, ['field'], 'Öneri: table header 14/20 · 500', 'Sipariş'),
  EL('td', 'Veri hücresi (td)', 'HTML · Tablo', 'data', 'ui', { size: 16, max: 16, lh: 1.57, w: 400, num: 'tabular-nums', c: C_TEXT }, ['surface'], 'Öneri: table cell 14/22 · 400', '#100482 · 1.249 ₺'),
  EL('tcaption', 'Tablo açıklaması (caption)', 'HTML · Tablo', 'data', 'ui', { size: 14, max: 14, lh: 1.43, w: 400, c: C_SEC }, ['surface'], 'Tablonun açıklaması (istisna 14)', 'Son siparişler, 2 kayıt'),
  role('axis', 'Grafik eksen etiketi', 'Veri', 'data', 'ui', ['admin', 'bi'], { size: 14, max: 14, lh: 1.43, w: 400, num: 'tabular-nums', c: C_SEC }, ['surface'], 'Öneri: grafik ekseni 14/20 · 400', 'Pzt  Sal  Çar'),
  role('emptyTitle', 'Boş durum başlığı', 'Veri', 'data', 'ui', ['admin', 'bi', 'ai'], { size: 18, max: 20, lh: 1.444, w: 500, c: C_HEAD }, ['bg'], 'Öneri: empty state 18–20 / 26–28 · 500', 'Henüz iade yok'),
  role('badge', 'Rozet / durum', 'Arayüz metni', 'data', 'tag', P, { size: 12, max: 12, lh: 1.333, w: 500, c: C_TEXT }, ['field'], 'Karar: tag / pill 12/16 · 500', '%22 indirim'),
  role('stat', 'İstatistik rakamı', 'Pazarlama', 'data', 'ui', ['marketing'], { size: 40, max: 56, lh: 1.2, w: 600, ls: -0.02, num: 'tabular-nums', c: C_HEAD }, ['surface'], 'Ek seçenek: fark edilen sayı (+4/+5)', '%42'),
  EL('time', 'Zaman (time)', 'HTML · Satır içi', 'data', 'inline', IN({ num: 'tabular-nums' }), HS, 'Makine okunur tarih (datetime)', '18 Ekim 2026'),
  EL('data', 'Veri değeri (data)', 'HTML · Satır içi', 'data', 'inline', IN({ num: 'tabular-nums' }), HS, 'Makine okunur değer (value)', '1.249 ₺'),

  role('chartTitle', 'Grafik başlığı', 'Veri', 'data', 'ui', ['bi'], { size: 18, max: 18, lh: 1.44, w: 600, c: C_HEAD }, ['surface'], 'Ek seçenek: grafik ve kart başlığı 16–18 · 600', 'Aylık gelir'),
  role('chartLegend', 'Lejant etiketi', 'Veri', 'data', 'ui', ['bi'], { size: 14, max: 14, lh: 1.43, w: 400, c: C_SEC }, ['surface'], 'Öneri: lejant 14/20 · 400 (istisna)', 'Kurumsal · KOBİ · Bireysel'),
  role('dataLabel', 'Grafik veri etiketi', 'Veri', 'data', 'ui', ['bi'], { size: 14, max: 14, lh: 1.43, w: 500, num: 'tabular-nums', c: C_TEXT }, ['surface'], 'Öneri: değer etiketi 12–14 · eş genişlik rakam', '1,2 M'),
  role('delta', 'Değişim (trend)', 'Veri', 'data', 'ui', ['bi'], { size: 14, max: 14, lh: 1.43, w: 600, num: 'tabular-nums', c: C_TEXT }, ['bg'], 'Ek seçenek: KPI altı değişim; yön renkle değil işaretle (▲ ▼)', '▲ %12,4 geçen aya göre'),
  role('filterChip', 'Filtre çipi', 'Veri', 'interface', 'tag', ['bi'], { size: 12, max: 12, lh: 1.333, w: 500, c: C_TEXT }, ['field'], 'Karar: pill 12/16 · 500', 'Son 30 gün'),

  role('chatMessage', 'Sohbet mesajı', 'Sohbet', 'conversation', 'reading', ['ai'], { size: 16, max: 16, lh: 1.5, w: 400, mw: 68, wrap: 'pretty', c: C_TEXT }, ['bg', 'surface'], 'Okuma metni: en az 16 · satır uzunluğu sınırlı', 'Geçen ayın satışlarını bölgeye göre özetledim.'),
  role('chatMeta', 'Mesaj bilgisi', 'Sohbet', 'conversation', 'ui', ['ai'], { size: 14, max: 14, lh: 1.43, w: 400, c: C_SEC }, HS, 'Öneri: gönderen, saat, model 14 · ikincil ton (istisna)', 'Asistan · 14:31'),
  role('promptInput', 'Komut girdisi', 'Sohbet', 'conversation', 'reading', ['ai'], { size: 16, max: 16, lh: 1.5, w: 400, c: C_TEXT }, ['field'], 'Okuma metni; iOS 16 altında yakınlaştırır', 'Bu tabloyu bölgeye göre özetle'),
  role('suggestion', 'Öneri komutu (çip)', 'Sohbet', 'conversation', 'tag', ['ai'], { size: 12, max: 12, lh: 1.333, w: 500, c: C_TEXT }, ['field'], 'Karar: pill 12/16 · 500', 'Gelir trendini göster'),
  role('citation', 'Kaynak / atıf', 'Sohbet', 'conversation', 'tag', ['ai'], { size: 12, max: 12, lh: 1.333, w: 500, num: 'tabular-nums', c: C_SEC }, ['field'], 'Karar: pill 12/16 · AI-first: kaynak görünür olmalı', '[1] satis_2026_q3.csv'),
  role('toolStep', 'Araç adımı', 'Sohbet', 'conversation', 'ui', ['ai'], { size: 14, max: 14, lh: 1.43, w: 500, num: 'tabular-nums', c: C_TEXT }, ['bg'], 'AI-first: gerçek araç olayı (ad, durum, süre); sahte ilerleme yok', 'satis_2026_q3 tablosu okundu · 1,2 sn'),
  role('decisionTitle', 'Karar istemi', 'Sohbet', 'conversation', 'ui', ['ai'], { size: 16, max: 16, lh: 1.5, w: 600, c: C_HEAD }, ['bg'], 'AI-first: onay gerektiren adımın başlığı (önce/sonra inceleme)', 'Rapor taslağı ekiple paylaşılsın mı?'),

  role('categoryTitle', 'Kategori başlığı', 'E-ticaret', 'commerce', 'ui', ['ecommerce'], { size: 21, max: 28, lh: 1.333, w: 500, c: C_HEAD }, ['surface'], 'Öneri: kategori 24–28 / 32–36 · 500', 'Masa lambaları · 128 ürün'),
  role('productTitle', 'Ürün kartı başlığı', 'E-ticaret', 'commerce', 'ui', ['ecommerce'], { size: 16, max: 16, lh: 1.5, w: 500, clamp: 2, c: C_HEAD }, ['bg'], 'Öneri: ürün kartı 16/24 · 500 · çok tekrar eder', 'Masa lambası, pirinç gövde, keten başlık'),
  role('productDetail', 'Ürün detay başlığı', 'E-ticaret', 'commerce', 'ui', ['ecommerce'], { size: 24, max: 28, lh: 1.333, w: 500, wrap: 'balance', c: C_HEAD }, ['surface'], 'Öneri: ürün detay 20–28 / 28–36 · 500', 'Masa lambası, pirinç gövde'),
  role('price', 'Fiyat', 'E-ticaret', 'commerce', 'ui', ['ecommerce'], { size: 24, max: 32, lh: 1.333, w: 600, num: 'tabular-nums', c: C_HEAD }, HS, 'Öneri: fiyat 24–32 / 32–40 · 600', '1.249 ₺'),
  role('oldprice', 'Eski fiyat', 'E-ticaret', 'commerce', 'ui', ['ecommerce'], { size: 14, max: 16, lh: 1.43, w: 400, td: 'line-through', num: 'tabular-nums', c: C_SEC }, HS, 'Öneri: eski fiyat 14–16 / 20–24 · 400', '1.599 ₺'),
  role('shipping', 'Kargo / stok bilgisi', 'E-ticaret', 'commerce', 'ui', ['ecommerce'], { size: 14, max: 14, lh: 1.43, w: 500, c: C_TEXT }, HS, 'Ek seçenek: kargo ve stok satırı', 'Yarın kargoda'),
  role('rating', 'Değerlendirme / yorum', 'Okuma metni', 'commerce', 'reading', ['ecommerce'], { size: 16, max: 16, lh: 1.5, w: 400, c: C_TEXT }, ['bg'], 'Öneri 14–16 · okuma metni olduğu için 16', 'Işığı yumuşak, kurulumu çok kolay.'),

  EL('quote', 'Alıntı (blockquote)', 'HTML · Blok metin', 'editorial', 'reading', { size: 18, max: 20, lh: 1.5, w: 400, mw: 60, c: C_TEXT }, ['surface'], 'Öneri: blockquote → Body Large veya Quote', '“Kaybettiğimiz günleri geri kazandık.”'),
  EL('li', 'Liste öğesi (li)', 'HTML · Listeler', 'editorial', 'reading', { size: 16, max: 16, lh: 1.5, w: 400, c: C_TEXT }, HS, 'Öneri: li → Body Default', 'İhtiyacı belirle, arayüzü oluştur'),
  EL('dt', 'Terim (dt)', 'HTML · Listeler', 'editorial', 'ui', { size: 16, max: 16, lh: 1.5, w: 600, c: C_HEAD }, ['surface'], 'Öneri: dt → Body / Compact, vurgulu', 'Satır yüksekliği'),
  EL('dd', 'Tanım (dd)', 'HTML · Listeler', 'editorial', 'reading', { size: 16, max: 16, lh: 1.5, w: 400, c: C_TEXT }, ['surface'], 'Öneri: dd → Body Default', 'Bir satırın kapladığı dikey alan.'),
  EL('figcaption', 'Görsel açıklaması', 'HTML · Etkileşim ve medya', 'editorial', 'ui', { size: 14, max: 14, lh: 1.43, w: 400, c: C_SEC }, ['surface'], 'Öneri: figcaption → Caption (istisna 14)', 'Masa lambası, yandan görünüm'),
  EL('strong', 'Güçlü vurgu (strong)', 'HTML · Satır içi', 'editorial', 'inline', IN({ w: 600, c: C_HEAD }), HS, 'Boyutu miras alır, ağırlık değişir', 'önemli ifade'),
  EL('b', 'Dikkat çeken (b)', 'HTML · Satır içi', 'editorial', 'inline', IN({ w: 600 }), HS, 'Anlam değil dikkat; boyut miras', 'anahtar kelime'),
  EL('em', 'Vurgu (em)', 'HTML · Satır içi', 'editorial', 'inline', IN({ fst: 'italic' }), HS, 'Boyut miras · Outfit italik kesimi yok', 'vurgulu düşünce'),
  EL('i', 'Ayrı ses (i)', 'HTML · Satır içi', 'editorial', 'inline', IN({ fst: 'italic' }), HS, 'Terim, yabancı sözcük, iç ses', 'en passant'),
  EL('mark', 'İşaret (mark)', 'HTML · Satır içi', 'editorial', 'inline', IN({ c: C_HEAD }), ['field'], 'Zemin nötr gri; yazı rengi çıktı kuralına tabi', 'işaretli bölüm'),
  EL('span', 'Satır içi kap (span)', 'HTML · Satır içi', 'editorial', 'inline', IN({}), HS, 'Üst öğeden miras alır', 'satır içi öğe'),
  EL('abbr', 'Kısaltma (abbr)', 'HTML · Satır içi', 'editorial', 'inline', IN({ td: 'underline' }), HS, 'Noktalı alt çizgi; title ile açılım', 'W3C'),
  EL('cite', 'Eser adı (cite)', 'HTML · Satır içi', 'editorial', 'inline', IN({ fst: 'italic' }), HS, 'Kitap, makale, eser adı', 'Tipografinin Öğeleri'),
  EL('dfn', 'Tanımlanan terim (dfn)', 'HTML · Satır içi', 'editorial', 'inline', IN({ w: 500, fst: 'italic', c: C_HEAD }), HS, 'Terimin tanımlandığı yer', 'satır yüksekliği'),
  EL('q', 'Satır içi alıntı (q)', 'HTML · Satır içi', 'editorial', 'inline', IN({}), HS, 'Tırnakları tarayıcı ekler', 'kısa bir alıntı'),
  EL('sub', 'Alt simge (sub)', 'HTML · Satır içi', 'editorial', 'inline', REL(0.75, { lh: 1, w: 400, c: C_TEXT }), HS, "Üst öğenin %75'i; en az 12 px", 'H₂O'),
  EL('sup', 'Üst simge (sup)', 'HTML · Satır içi', 'editorial', 'inline', REL(0.75, { lh: 1, w: 400, c: C_TEXT }), HS, "Üst öğenin %75'i; en az 12 px", 'x²'),
  EL('del', 'Silinen (del)', 'HTML · Düzeltme', 'editorial', 'inline', IN({ td: 'line-through', c: C_SEC }), HS, 'Belgeden çıkarılan metin', 'eski fiyat'),
  EL('ins', 'Eklenen (ins)', 'HTML · Düzeltme', 'editorial', 'inline', IN({ td: 'underline' }), HS, 'Belgeye eklenen metin', 'yeni fiyat'),
  EL('s', 'Geçersiz (s)', 'HTML · Düzeltme', 'editorial', 'inline', IN({ td: 'line-through', c: C_SEC }), HS, 'Artık doğru olmayan bilgi', 'tükendi'),
  EL('u', 'Açıklama işareti (u)', 'HTML · Düzeltme', 'editorial', 'inline', IN({ td: 'underline' }), HS, 'Yazım hatası işareti gibi', 'yanlış yazım'),
  EL('bdi', 'Yön yalıtımı (bdi)', 'HTML · Yön ve ruby', 'editorial', 'inline', IN({}), HS, 'Yönü bilinmeyen kullanıcı metni', 'إيان'),
  EL('bdo', 'Yön zorlama (bdo)', 'HTML · Yön ve ruby', 'editorial', 'inline', IN({}), HS, 'dir özniteliğiyle yön zorlanır', 'ters yön'),
  EL('ruby', 'Ruby tabanı (ruby)', 'HTML · Yön ve ruby', 'editorial', 'inline', IN({}), HS, 'Doğu Asya okunuş açıklamasının tabanı', '漢字'),
  EL('rt', 'Ruby açıklaması (rt)', 'HTML · Yön ve ruby', 'editorial', 'inline', REL(0.5, { lh: 1, w: 400, c: C_SEC }), HS, 'Tarayıcı varsayılanı %50; en az 12 px', 'かんじ'),

  EL('code', 'Kod (code)', 'HTML · Satır içi', 'technical', 'inline', REL(0.875, { size: 14, max: 16, lh: 1.5, w: 400, ff: 'mono', c: C_TEXT }), ['field'], "Öneri: code 14–16 monospace (üst öğenin %87,5'i)", 'GET /api/orders'),
  EL('pre', 'Ön biçimli (pre)', 'HTML · Blok metin', 'technical', 'ui', { size: 14, max: 16, lh: 1.6, w: 400, ff: 'mono', c: C_TEXT }, ['field'], 'Öneri: code/pre 14–16 monospace · 16 altı istisna', 'GET /api/orders?limit=20'),
  EL('kbd', 'Klavye girdisi (kbd)', 'HTML · Satır içi', 'technical', 'inline', REL(0.875, { lh: 1.5, w: 500, ff: 'mono', c: C_TEXT }), ['field'], 'Öneri: kbd 14–16 monospace', 'Ctrl + S'),
  EL('samp', 'Örnek çıktı (samp)', 'HTML · Satır içi', 'technical', 'inline', REL(0.875, { lh: 1.5, w: 400, ff: 'mono', c: C_TEXT }), HS, 'Program çıktısı', 'Kaydedildi.'),
  EL('var', 'Değişken (var)', 'HTML · Satır içi', 'technical', 'inline', IN({ fst: 'italic' }), HS, 'Matematik ya da programlama değişkeni', 'x'),
];

/** Başlık merdivenine oturan diğer türlerin büyümesi (masaüstü hedefi / mobil temel). */
const GROWTH_EXTRA: Record<string, number> = { kpi: 32 / 28, emptyTitle: 20 / 18, categoryTitle: 24 / 21, productDetail: 28 / 24, price: 28 / 24, display: 1.25, stat: 1.25 };
for (const r of ROLES) {
  const g = DECISION_GROWTH[r.id] ?? GROWTH_EXTRA[r.id];
  if (g) r.def.gr = Math.round(g * 1000) / 1000;
}

export const ROLE: Record<string, RoleDef> = Object.assign(Object.create(null), Object.fromEntries(ROLES.map((r) => [r.id, r])));
export const ROLE_IDS = ROLES.map((r) => r.id);

/** Ürün türüne özel varsayılan farkları. Element türleri için buradaki her değer o üründe "bağlam" katmanıdır. */
export const CTX_DEF: Record<ContextId, Record<string, RoleOverrides>> = {
  html: {},
  admin: { label: { size: 14, max: 14, lh: 1.43, w: 500 }, th: { size: 14, max: 14, lh: 1.43 }, td: { size: 14, max: 14 } },
  marketing: { display: { mode: 'fluid' }, nav: { size: 16 }, quote: { size: 20, max: 24 } },
  ecommerce: { display: { size: 32, max: 48, mode: 'fluid' } },
  // Yoğun veri ekranı: SaaS ile aynı tablo ve etiket yoğunluğu.
  bi: { label: { size: 14, max: 14, lh: 1.43, w: 500 }, th: { size: 14, max: 14, lh: 1.43 }, td: { size: 14, max: 14 } },
  ai: {},
};

const byCtx = Object.fromEntries(CONTEXT_IDS.map((c) => [c, ROLES.filter((r) => r.ctx.includes(c))])) as Record<ContextId, RoleDef[]>;
export const rolesOf = (ctx: ContextId): RoleDef[] => byCtx[ctx];
export const hasRole = (ctx: ContextId, id: string) => !!ROLE[id] && ROLE[id].ctx.includes(ctx);

/** Satır sınırı (display:-webkit-box) bu türlerin yapısını bozar. Satır içi öğeler de kesilmez. */
const NO_CLAMP = new Set(['button', 'cta', 'input', 'th', 'td', 'textarea', 'option', 'optgroup', 'output', 'legend', 'summary', 'tcaption']);
export const noClamp = (id: string) => NO_CLAMP.has(id) || ROLE[id].kind === 'inline';
export const isEl = (id: string) => ROLE[id]?.el === true;
export const isReading = (id: string) => ROLE[id].kind === 'reading' || ROLE[id].kind === 'long';
export const isLong = (id: string) => ROLE[id].kind === 'long';
export const HEADINGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
export const sampleOf = (ctx: ContextId, id: string) => ROLE[id].samples?.[ctx] ?? ROLE[id].sample;

export const KIND_LABEL: Record<Kind, string> = {
  heading: 'Başlık · mobil 320 temelinden büyük ekranlara merdiven',
  display: 'Display · istisnada en az 12',
  ui: 'Arayüz metni · varsayılan 16, istisnada 14 (en az 12)',
  tag: 'Etiket / pill · 12 px (en az 12)',
  reading: 'Okuma metni · 16 px (en az 16, kesin karar)',
  long: 'Uzun okuma (makale, blog, politika) · 18 px sabit',
  inline: 'Satır içi · üst öğeye göre, en az 12 px',
};
