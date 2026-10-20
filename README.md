# GenUX Typography Studio

GenUX tipografi kararlarını ürün türüne göre (HTML5 temel katmanı, SaaS Admin, Marketing, E-ticaret, Analytics & BI, AI & Conversational) veren, önizleyen ve JSON olarak dışa aktaran çalışma aracı. Eski tek dosyalık `genux-tipografi-lab.html` laboratuvarının Mantine ile baştan tasarlanmış hâlidir; alan kuralları birebir taşınmıştır.

## Çalıştırma

```bash
npm install
```

```bash
npm run dev
```

Geliştirme sunucusu `http://localhost:5190` adresinde açılır.

## Kontroller

| Komut | Ne denetler |
|---|---|
| `npm run typecheck` | Uygulama, testler ve Node yapılandırması (TypeScript 6, strict) |
| `npm test` | Vitest: alan çekirdeği (`src/core`), geçmiş, proje kapısı (`src/test/gates.test.ts`) |
| `npm run test:e2e` | Playwright (Chromium; hedef tarayıcı Chrome): 320 / 932×430 / 820 / 1280 / 1920 px; seçim, kurallar, JSON, iki sekme, odak, hareket, ağ |
| `npm run build` | Üretim derlemesi |

Hedef tarayıcı Chrome (kullanıcı kararı 2026-10-18). Firefox ve WebKit testleri isteğe bağlıdır: `npx playwright test`.

## Ürün türleri

| Görünen ad | Tam ad | Set | Not |
|---|---|---|---|
| HTML | HTML5 temel katmanı | expressive | Elementlerin temel kararları; ürün türleri buradan devralır |
| SaaS | SaaS Admin | productive | Tablo ve etiket 14 px (yoğun) |
| Marketing | Marketing | expressive | Display akışkan |
| E-ticaret | E-ticaret | expressive | |
| BI | Analytics & BI | productive | KPI, değişim, grafik başlığı, lejant, veri etiketi, filtre çipi |
| AI | AI & Conversational | productive | Sohbet mesajı ve komut girdisi okuma metnidir (≥ 16 px); kaynak, araç adımı, karar istemi |

Görünen kısa adlar arayüzde, tam adlar ipucunda, ekran okuyucu adında ve JSON'da (`contexts.<id>.label`; kısa ad `shortLabel`) kullanılır.

## Kırılımlar, gruplar ve otomatik ölçek (kullanıcı kararları 2026-10-19)

| Grup | Başlangıç | Kırılımlar (cihaz genişliği) |
|---|---|---|
| Mobil | 320 (iPhone 4 / SE, temel) | 320 · 360 · 375 · 390 · 414 · 430 |
| Tablet | 600 (7" tablet, katlanabilir) | 600 · 744 · 768 · 820 · 834 |
| Laptop | 960 (Full HD %200 ölçek) | 960 · 1024 · 1280 · 1366 · 1440 · 1536 · 1680 |
| Masaüstü | 1920 (Full HD monitör) | 1920 · 2560 · 3440 · 3840 |

- **Otomatik ölçek:** `boyut(w) = çapa × (min(w, 1920) / çapa genişliği) ^ (ln(büyüme) / ln(6))`, 0,1 px'e yuvarlanır. Çapa, en yakın alt kırılımdaki özel değer ya da 320 değeridir; 1920 üstünde büyüme durur.
- 320'de bir değeri değiştirince o türün bütün kırılımları yeniden hesaplanır. Bir kırılıma özel değer girilirse o kırılım çapa olur; üstü ondan hesaplanır, altı değişmez. Her tür bağımsızdır.
- "Ekranla büyüme" (denetçi, Boyut) 320 → 1920 arası toplam çarpandır; 1 = sabit. Varsayılanlar: H1–H3 1,25 · H4 1,24 · H5 1,22 · H6 1,125; okuma metni, istisna ve pill 1.
- Varsayılan sonuçlar (H1–H6): mobil 320 → 32/28/24/21/18/16 · masaüstü 1920 → 40/35/30/26/22/18. Ardışık başlık oranı her kırılımda en az 1,125.
- Boyut dışı özellikler (satır yüksekliği, ağırlık…) küçükten büyüğe kalıtılır; renk, boyut modu, büyüme ve "ekrana göre" listesi bütün ekranlar için ortaktır. Renkte açık ve koyu ayrıdır.
- Denetçide her özelliğin kaynağı görünür: "Otomatik · 320 px'ten", "Bu ekranda (744 px)", "744 px'ten", "HTML 1280 px'ten"; tek tıkla kalıtılana dönülür.
- JSON: türün üst düzey değerleri 320 içindir; `screenOverrides` (özel değerler), `responsive` (her `@media (min-width)` kırılımında değişen değerler), `decisions.byScreen` (bütün kırılımlarda karar tablosu) ve formül eklenir.

## Kesin kurallar (alan)

- Okuma metni 16 (en az 16) · istisna varsayılanı 14 · etiket ve pill 12 · en alt sınır 12 · uzun okuma 18 sabit.
- Uzun okuma koşulu: makale, blog, yardım/doküman, politika ve sözleşme sayfası, uzun ürün açıklaması; birden çok paragraf ve yaklaşık 150 kelimeden uzun. Kart metni, form yardımı, bildirim ve kısa açıklama 16'dır.
- Başlık kararları (320 temel): H1 32 · H2 28 · H3 24 · H4 21 · H5 18 · H6 16; büyük ekranlarda otomatik ölçek.
- Çıktı metin renkleri yalnız siyah, beyaz ve gri (R = G = B). Kontrast, türün durduğu en zayıf zemine göre ölçülür.
- Ürün türleri HTML5 elementlerini temel katmandan devralır; devralma özellik başınadır. Denetçide her ezilmiş özellik tek tıkla devralınana döner.
- Kurallar her düzenlemede, içe aktarmada ve çözümlemede `src/core/enforce.ts` süzgecinden geçer.

## Arayüz kuralları (aracın kendisi)

- Mantine 9, nötr renk dili (`src/theme/tokens.ts`). Mavi yalnız seçili durum ve birincil eylemde.
- Aracın metni en az 14 CSS px; yazı tipi Outfit.
- Çevreleyen odak halkası yok. Görünür odak yalnız Tab ve Shift+Tab ile açılır (`src/theme/focus-mode.ts`), tek kenar çizgisiyle gösterilir; fare ve dokunma kapatır. Yüksek karşıtlık modunda tek istisna `outline: 2px solid CanvasText`.
- Hareket: simetrik easeInOut Cubic `cubic-bezier(.65, 0, .35, 1)`; süreler tokenlardan (120 / 180 / 240 ms). Mantine iç yüzeyleri `src/theme/global.scss` adaptörüyle aynı tokenlara bağlıdır. Az hareket tercihinde süreler sıfırlanır.
- Seçim kutuları native açılır menü değil (Mantine Select / Combobox).

## Mimari

```
src/core      saf TypeScript alan modeli: katalog, kurallar, çözümleme, boyut, kontrast, kontroller, JSON
src/store     Zustand: kararlar + geçmiş (300 ms gruplama, 50 adım), arayüz durumu, kalıcılık
src/theme     Mantine teması, tokenlar, odak modu, hareket adaptörü
src/features  toolbar, navigator, canvas, inspector, status, command, io, onboarding, preview
src/app       AppShell, yönlendirici (URL: ctx, role, device, orient, theme, view), eylemler
e2e           Playwright testleri
```

- Kalıcılık: `localStorage` anahtarı `genux-type-lab-v2` (eski laboratuvarla aynı JSON v2 biçimi + `ui` bloğu). Hazır ayarlar `genux-type-lab-presets`.
- JSON v2'ye eklenen alanlar: `category`, `overrides` (ezilen özellikler). Eski laboratuvar dosyaları içe aktarılabilir; devralan elementler ezme üretmez.
- İlk ekranda gerekmeyen özellikler (dışa aktarma ve kod vurgulama, içe aktarma ve bırakma alanı, tanıtım turu, tam ekran) ilk kullanıldıklarında yüklenir.

## Durum

Yerel depo; uzak depo ve açık kaynak lisansı henüz seçilmedi.
