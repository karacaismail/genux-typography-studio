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

## Karar akışı (2026-10-21)

- Varsayılan çalışma alanı, aşamalı formdur. `workspace=free` mevcut serbest editörü korur; eski e2e testleri bu açık modu kullanır.
- Sıra: HTML → SaaS → Marketing → E-ticaret → BI → AI; her üründe cihaz ailesi → alt genişlik → Headings/Sub-title/diğer kümeler → element. Alt profiller `features/workflow/model.ts` WORKFLOW_DEVICES kaynağındadır.
- TV mantıksal CSS viewport profilidir; gerçek TV/tarayıcı veya kumanda desteğinin doğrulandığı anlamına gelmez. Aynı genişlikte TV ve monitör bağımsızdır. HTML profil katmanı ürün profilinden önce uygulanır.
- Onaylı değerler, kaynak parmak izi, tarih, seçili adım ve notlar IndexedDB `genux-typography-workflow` içinde atomik kayıtla tutulur; eski localStorage akış kaydı yalnız migration girdisi olarak okunur, silinmez. Kararlar mevcut v2 formatını korur.
- JSON `workflow` uzantısı profil ezmeleri, cihaz listesi, onaylar ve devam konumunu taşır. Kaynak değer değiştiğinde bağımlı onay yeniden inceleme durumuna döner. İçe aktarma biçimleri hata durumunda mevcut çalışmayı değiştirmez.
- Kullanıcı isteğiyle gerçek Ant Design 6.6.7 yalnız lazy yüklenen örnek sayfalar için eklendi; araç kontrolleri Mantine9 kalır. Ortak rol stil eşlemesi `features/workflow/roleStyle.ts`; sayfa/kart/detay satırı ve 1/2/5 satır örnekleri aynı değerleri kullanır.
- Hedefli browser kontrolü: `npx playwright test e2e/workflow.spec.ts --project=chromium`. Kalıcılık, anında editör geçişi, JSON round-trip, alt kırılımlar,320 px ve klavye odağını kapsar. Gerçek TV ve diğer motorlar bu teslimde not_run.

## Eşzamanlı küme karşılaştırması ve örnek zeminleri (2026-10-21)

Akışın Ekran1'i seçili elementi, Ekran2'si geçerli kümenin bütün rollerini gösterir; rol seçimi ikinci ekranı kapatmaz. İki DeviceStage aynı genişlik/cihaz/zoom değerlerini kullanır. Form örneği, satır testleri ve karşılaştırma zemini `canvasVars(scheme)` üzerinden bağımsız önizleme temasını izler; panel temasının zeminini kullanmaz. Seçilen çıktı renkleri sessizce değiştirilmez; gerçek örnek zemini üzerinden kontrast oranı gösterilir. Regresyonlar `e2e/workflow.spec.ts` live full-group / specimen text senaryolarıdır.

## Akış form kontrol tercihleri (2026-10-21)

Sayısal alanlar NumberStepper kullanır: solda eksi, sağda artı; Mantine sayısal ayrıştırması, min/max ve klavye okları korunur. Kontrol ve butonlar en az44 px yüksekliktedir. Ağırlık300–900 ve satır yüksekliği1,0/1,1/1,2/1,25/1,3/1,4/1,5/1,6/1,75/2,0 yatay sekme görünümlü Radio.Card seçenekleridir; dar alanda sarılır. Başka satır yüksekliği seçeneği sunulmaz. Açık tema kartelası #000000–#808080, koyu tema kartelası #808080–#ffffff aralığında altışar ton içerir. Her radio grubunda yalnız seçili kart (eski değer listede yoksa ilk kart) Tab durağıdır; oklar seçenek değiştirir. Radio geçiş parçaları merkezi hareket adaptöründe tokenlara bağlıdır.

## Kompakt çalışma alanı ve denetçi (2026-10-21)

Bağlam/başlık/ilerleme aynı satırda; element gezgini ve önizleme bilgisi ortak araç satırındadır. Dış boşluk ve44px hedefler korunur. Masaüstü denetçi sticky ve viewport yüksekliğiyle sınırlı bağımsız kayar; iç başlık sabitlenmez ve kontrolleri örtmez. Dar/kısa görünüm normal akıştır. Sayısal kontrol tek yüzeydir: sade eksi / ortalanmış değer / sade artı; dar alanda tek sütun. Satır yüksekliği seçeneklerinin hemen altında2/5 satırlık, yüksek kontrastlı ve satır kutusu kılavuzlu ölçüm testi bulunur; bu ölçüm görünümü kayıtlı çıktı rengini değiştirmez. İlgili Chromium testleri compact workspace / smart sticky / numeric spinner.

Karar akışındaki iki cihaz önizlemesi varsayılan olarak 1:1 CSS piksel ölçüsünde açılır. Sahne yüksekliği çerçevenin tamamını kapsar; sabit 520/680 px yükseklik veya 900 px ekran yüksekliği kırpması uygulanmaz. Dar alanda yatay kaydırma önizleme içinde kalır; sığdırma kullanıcı seçeneğidir.

İç önizleme ekranı ve sağ denetçi scroll zincirini kesmez: overscroll-behavior:auto. İç sınırda wheel/dokunma hareketi doğal olarak dış kapsayıcıya ve sayfaya aktarılır; özel wheel preventDefault veya odak taşıma uygulanmaz.

Cihaz kasaları temsilidir; karma model adları birebir donanım kopyası iddiası taşımaz. m320 ve t768 klasik fiziksel ana ekran düğmeli kasa kullanır. Kamera/hoparlör ve kasa ekranın CSS alanını örtmez; kasa geometrisi DeviceStage içindeki ölçülerden üretilir.

İkili karşılaştırmada başlık satırları aynı yüksekliği kullanır. Masaüstünde cihazlar ortak üst/alt hizadadır ve merkeze yaklaştırılır; sütun aralığı lg/4, sahne yatay dolgusu xl tokenıdır. Mobilde tek sütun akışı korunur.
