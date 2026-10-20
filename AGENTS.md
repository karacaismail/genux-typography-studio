# GenUX Typography Studio — ajan ve geliştirici kuralları

Bu dosya projenin kalıcı kararlarını ve gerçek kontrol komutlarını tutar. Kullanıcının genel talimatları (`~/.claude/CLAUDE.md`, `~/AGENT.md`) geçerlidir; bu dosya onları zayıflatmaz.

## Kapsam (kullanıcı kararı 2026-10-18)

- Hedef tarayıcı Chrome. Amaç: tipografiyi seçmek ve JSON olarak dışa aktarmak. Ek erişilebilirlik (ARIA) ve çok tarayıcılı sağlamlaştırma bu projede istenmiyor; mevcut uygulama korunur, genişletilmez.
- `npm run test:e2e` yalnız Chromium'da çalışır. Firefox ve WebKit projeleri `playwright.config.ts` içinde durur; isteğe bağlı: `npx playwright test`.

## Yığın (kurulu, sabit sürüm)

React 19.3, Vite 8, TypeScript 6.0 (strict), Mantine 9.7.2 (core, hooks, spotlight, notifications, modals, dropzone, code-highlight), Zustand 5, TanStack Router 1.170 + `zod/mini`, Phosphor Icons (`*Icon` adları), SCSS modülleri, Vitest 5 + Testing Library, Playwright 1.64 + axe-core. Ek UI kütüphanesi eklenmez; Mantine'in karşılayamadığı somut ihtiyaç önce belgelenir.

## Kontrol komutları (değişiklikten sonra çalıştır)

```bash
npm run typecheck
```

```bash
npm test
```

```bash
npm run test:e2e
```

```bash
npm run build
```

`npm test` içindeki `src/test/gates.test.ts` proje kapısıdır: onaysız eğri (`ease`, `linear`, `steps`), `transition: all`, sabit süre, ham `cubic-bezier` (token dosyası dışında), adaptörü olmayan Mantine geçiş yüzeyi ve odak halkası FAIL verir. Kapıyı gevşetme; ihlali kaynağında düzelt.

## Alan kuralları (kullanıcı kararı, değişmez)

- Okuma metni 16 (≥ 16) · istisna 14 · etiket/pill 12 · en alt sınır 12 · uzun okuma 18 sabit.
- Başlıklar 320'de H1 32 · H2 28 · H3 24 · H4 21 · H5 18 · H6 16; 1920'de 40/35/30/26/22/18 (otomatik ölçek).
- Çıktı renkleri yalnız gri (R = G = B). Arayüz renkleri bu kurala tabi değildir.
- Kurallar yalnız `src/core/enforce.ts` içinde uygulanır; arayüz katmanında kural tekrarlanmaz.
- JSON biçimi `genux-typography-decisions` sürüm 2 korunur; eski dosyalar içe aktarılabilir kalır.

## Ürün türleri (kullanıcı kararı 2026-10-18)

- Görünen adlar: HTML, SaaS, Marketing, E-ticaret, BI, AI. Tam adlar (`CONTEXTS[].name`): HTML5 temel katmanı, SaaS Admin, Marketing, E-ticaret, Analytics & BI, AI & Conversational. Erişilebilir ad tam addır ve görünen adı içerir.
- Yeni ürün türü eklerken: `constants.ts` CONTEXTS, `roles.ts` (tür bağlamları, `CTX_DEF`), `src/features/canvas/pages/<id>.html`. `src/test/pages.test.ts` her türün önizlemede örneği olmasını denetler.
- AI önizlemesi AI-first kurallarına uyar: kapsam/kiracı/mod, gerçek araç olayları (geçmiş zaman, süre), kaynaklar, onay gerektiren karar görünür; sahte ilerleme veya iç düşünce gösterilmez.

## Kırılımlar ve otomatik ölçek (kullanıcı kararları 2026-10-19)

- Gruplar: mobil 320–599 · tablet 600–959 · laptop 960–1919 · masaüstü 1920+ (`TIERS`, `GROUP_BPS`, `GROUP_FIRST`). Kırılımlar = `DEVICES` genişlikleri; 320 temel.
- Boyut otomatik: `autoScale` (`constants.ts`), çapa = en yakın alt kırılımdaki özel `size` ya da 320 değeri; üs `ln(gr)/ln(1920/320)`; 0,1 px yuvarlama (tam/yarım piksel yuvarlama 1,125 oranını bozuyordu).
- `gr` (ekranla büyüme), `c`, `mode`, `sizes` kırılıma girmez (`SCREEN_EXCLUDED`); düzenlemeleri temel katmana yazılır. Diğer özellikler kırılımlarda küçükten büyüğe kalıtılır.
- Kararlar: `DECISIONS` (320) + `DECISION_GROWTH`; `decisionAt(id, w)`. Okuma 16 · istisna 14 · pill 12 · uzun okuma 18 (`HARD`, `LONG_READING_CONDITION`). Başlık oranı eşiği `DEFAULT_RATIO` 1,125.
- Kayıtlı çalışma alanı yüklenirken üst katmana eşit temel ezmeler kaldırılır (`pruneRedundant`).

## Arayüz kuralları

- Renk, boşluk, yarıçap, gölge, odak ve hareket değerleri `src/theme/tokens.ts` + `theme.ts` (cssVariablesResolver) üzerinden gelir. Tuval (önizleme) renkleri `CANVAS_TOKENS`; bileşende sabit renk yazma.
- Aracın metni en az 14 CSS px. Mantine'in 14 px altına inen yardımcı boyutları `global.scss` içinde yükseltilmiştir; yeni bileşen eklerken e2e `smallToolText` denetimi geçmelidir.
- Odak: `focusRing: 'never'`; görünür odak yalnız `html[data-focus='kbd']` + `:focus-visible` ile, tek kenar çizgisi. Görünmez girdili kontroller (SegmentedControl, Switch, kartela) göstergeyi görünen kardeşe çizer. Odak göstergesi geçişli bir özelliğe bağlanmaz (beklemeden görünür).
- Hareket: yalnız `--gx-ease`, `--gx-dur-fast|--gx-dur|--gx-dur-slow` ve JS'te `MOTION`. Yeni Mantine bileşeni kullanınca geçiş yapan iç parçalarını `global.scss` adaptörüne ekle; kapı eksik parçayı bildirir.
- Kütüphanenin satır içi, yapılandırılamayan geçişleri yalnız belgeli kapsamda `!important` ile bağlanır: Notifications ve Tour. Başka yerde `!important` geçiş yasak.
- Tablolar kendi kabında yatay kayar; sayfa yatay taşmaz. Kelime ortasından bölme yok.
- Mobil öncelik: 320 px kabulü önce. Dar ya da kısa ekranda (`max-width: 48em`, `max-height: 600px`) tuval bütünüyle kayar, "düzenleniyor" şeridi yapışık kalır; denetçi alt paneldir.

## Bilinen sınırlar

- Mantine çekirdek CSS'i bütün olarak yüklenir (gzip ~36 KB); bileşen başına CSS içe aktarımı ayrı bir iş olarak değerlendirilmeli.
- forced-colors öykünmesi yalnız Chromium'da test edilir; Firefox ve WebKit'te `not_run`.
- Gerçek Safari, iOS ve Android cihaz testleri yapılmadı (`not_run`).

## İki uç boyut modu (2026-10-20)

`endpoints`: 320 ve 3840 px için iki ortak tam sayı boyut; arası doğrusal hesaplanır ve Math.round ile tam sayıya yuvarlanır. Bütün ürün setlerinde çalışır; eski ara ekran size/max ezmelerini uygulamaz, diğer özellikleri korur. Uzun okuma18 sabit kalır. JSON fontSize.byDevice bütün cihazların hesaplanmış tam sayı boyutlarını ve uç genişlikleri içerir. Eski modlar ve dosyalar desteklenir.
