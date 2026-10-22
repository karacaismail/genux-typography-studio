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

- Okuma metni 16 (≥ 16) · istisna 14 · etiket/pill 14 · en alt sınır 14 · uzun okuma 18 sabit.
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
- Kararlar: `DECISIONS` (320) + `DECISION_GROWTH`; `decisionAt(id, w)`. Okuma 16 · istisna 14 · pill 14 · uzun okuma 18 (`HARD`, `LONG_READING_CONDITION`). Başlık oranı eşiği `DEFAULT_RATIO` 1,125.
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

Bağlam/başlık/ilerleme aynı satırda; element gezgini ve önizleme bilgisi sağ karar panelindedir. Dış boşluk ve44px hedefler korunur. Masaüstü denetçi sticky ve viewport yüksekliğiyle sınırlı bağımsız kayar; iç başlık sabitlenmez ve kontrolleri örtmez. Dar/kısa görünüm normal akıştır. Sayısal kontrol tek yüzeydir: sade eksi / ortalanmış değer / sade artı; dar alanda tek sütun. Satır testleri denetçide değil, seçili cihazın ekranı içinde “İçerik / Satır testleri” görünüm seçiminin arkasındadır. 1/2/5 satır örnekleri seçili elementin değerlerini kullanır; görünüm değişimi kayıtlı çıktı değerlerini değiştirmez. İlgili Chromium testleri compact workspace / smart sticky / numeric spinner.

Karar akışındaki iki cihaz önizlemesi varsayılan olarak 1:1 CSS piksel ölçüsünde açılır. Sahne yüksekliği çerçevenin tamamını kapsar; sabit 520/680 px yükseklik veya 900 px ekran yüksekliği kırpması uygulanmaz. Dar alanda yatay kaydırma önizleme içinde kalır; sığdırma kullanıcı seçeneğidir.

İç önizleme ekranı ve sağ denetçi scroll zincirini kesmez: overscroll-behavior:auto. İç sınırda wheel/dokunma hareketi doğal olarak dış kapsayıcıya ve sayfaya aktarılır; özel wheel preventDefault veya odak taşıma uygulanmaz.

Mobil model eşleşmeleri ve fiziksel gövde oranları hardware.ts içindedir. m320 ve t768 fiziksel ana ekran düğmesi kullanır. Modeli belirtilmeyen tablet/laptop/desktop/TV aileleri temsilidir. Optik çerçeve ve güvenli alan ayrıntıları docs/device-mockups.md içinde açıklanır.

İkili karşılaştırmada başlık satırları aynı yüksekliği kullanır. Masaüstünde cihazlar ortak üst/alt hizadadır ve merkeze yaklaştırılır; sütun aralığı lg/4, sahne yatay dolgusu xl tokenıdır. Mobilde tek sütun akışı korunur.

Cihaz grubu seçimi native/dropdown değildir: Mobil, Tablet, Laptop, Bilgisayar, TV için etiketli 32 px Phosphor ikonlarıyla yatay Radio.Card grubu kullanılır. Seçili seçenek tek Tab durağıdır; ok tuşları seçimi değiştirir. Dar ekranda yalnız grup yatay kayar; sayfa taşmaz.

Cihaz grubu ikonları üst header içindedir. Ürün türü yalnız header içinde GenUX kimliğinin yanındaki Mantine dropdown ile seçilir. Sidebar birincil alanı alt kırılımları, ikincil alanı metin kümelerini içerir; ilerleme sahne başlığının sağındadır. Masaüstünde kırılımlar alt alta, 320 px telefonda sarılarak sunulur; metin kümesi listesi yerel yatay kayar.

Öneri işaretleri: `src/core/recommendations.ts` güvenli katalog başlangıcının kaynağıdır. Serbest editörde öneriler kullanıcı kararlarından bağımsızdır; workflow ECA motoru geçerli önceki onaylardan öneri/taslak üretir. Hiçbiri WCAG sertifikası değildir. Satır yüksekliği kullanıcı onaylı seçeneklerden seçilir; okuma için en az 1,5 proje önerisidir. W3C 1.4.12, bu değeri varsayılan yapmayı değil kullanıcı override durumunda içeriği korumayı gerektirir. Renk önerileri her iki temada kayıtlı zeminlerin tamamında en az 4,5:1 sağlar. Yeşil CheckCircle + erişilebilir Önerilen etiketi, seçim durumundan ayrıdır. Karar akışı ve serbest denetçi ortak öneri kaynağını kullanır. Cihaz grubu ikonları header içindedir; ürün türü header içindedir; sidebar sırası alt kırılım → metin kümesidir.

Alt kırılım seçimi `BreakpointChoice` bileşenidir: px ölçüsü radyo butonunda, cihaz adı ilişkili açıklamada buton altında. Seçim katmanı ResizeObserver ile gerçek buton konumuna göre kayar; CSS merkezi süre/eğri tokenlarını kullanır, reduced-motion genel adaptörü geçerlidir. Seçim semantiği hareketin bitmesini beklemez. Dar alanda wrapper içinde sarılır; klavye okları ve tek Tab durağı korunur.

Sol sidebar birincil alanı cihaz alt kırılımı navigasyonuyla başlar; burada ilerleme sayacı veya çubuğu bulunmaz. Tanıtım/çalışma planı metinleri kaldırılmıştır. Sonrasında semantik separator ve kullanıcı isteğiyle taşınan metin kümesi navigasyonu bulunur; birinci alandaki liste satırı görünümünü kullanır. Kaydet/içe aktar/serbest editör işlemleri header'da korunur.

Alt kırılımda px ve model açıklaması tek `a[role=radio]` hedefinin içindedir; ayrı iç buton/bağlantı eklenmez. Tıklama, Enter, Space ve oklarla seçim desteklenir; yalnız seçili öğe Tab durağıdır. Hareketli katman yalnız üstteki 28 px ölçü yüzeyini izler; açıklama stili ve renkleri korunur.

Ürün seçiminde “Çalışılıyor” metni kullanılmaz; dropdown seçimi yeterlidir. Küme adları yalnız “Headings” ve “Sub-title” olarak gösterilir; tekrar eden Türkçe açıklama eklenmez.

Workflow header en fazla 120 CSS px yüksekliğindedir (`--gx-workflow-header-max`). Tek satır düzen ve dar alanda yerel yatay kaydırma kullanılır; cihaz grubu etiketi erişilebilir ad olarak korunup görsel olarak gizlenir. Eylem butonları en az 44 px kalır (`--gx-workflow-header-hit`); kontroller kesilmez veya küçük yazıya dönüştürülmez.

Seçim gruplarının sol üstünde iş akışı sırası gösterilir: 1 Ürün türü, 2 Cihaz grubu, 3 Alt kırılım, 4 Metin kümesi, 5 Element, 6 Kullanım konumu. Bu sıra mevcut bağlam → cihaz → genişlik → küme → rol akışıdır; seçimi kilitlemez. Önizleme üzerindeki “Ekran 1/2” görünen başlıkları kaldırılmıştır; erişilebilir bölge adları korunur. Element sekmelerinin üst ve alt padding'i eşittir; ortak spacing-xs tokenını kullanır.

Kırılım kartları kompakt yoğunluk kullanır: 4 px iç dolgu, 4 px ölçü–açıklama aralığı, wrapper için spacing-xs (8 px) boşluk/dolgu. Ölçü yüzeyi 28 px tokenıyla yönetilir; tıklama hedefi bütün bağlantıdır ve 44 px altına inmez (tek satır açıklamada yaklaşık 62 px). Metin boyutu küçültülmez; uzun açıklama doğal sarılır.

Karar panelinin üstünde element seçimi, ölçü özeti ve önizleme teması bulunur. Tekrarlanan büyük specimen/açıklama alanı kullanılmaz; onay durumu kompakt, kontrast uyarısı yalnız core contrastInfo başarısızsa gösterilir. Adım rozetleri eşit en/boy, radius %100 ve 2px kırmızı kenarlık kullanır.

Workflow çıktı tonları açık/koyu bölümü sürekli görünürdür; accordion veya kapatma kontrolü kullanılmaz.

Çıktı renk alanları kendi light/dark semantik tokenlarını kapsar; kartela, onaltılık alanı ve kontrast açıklamasının zemini/metni uygulama temasından bağımsızdır.

Seçili cihazın içindeki satır testlerinin zemini ve metni bağımsız önizleme temasını izler; denetçi temasına bağlanmaz. Çıktı renk alanlarının kendi açık/koyu zeminleri korunur.

Cihaz kasaları ortak DEVICE_MATERIAL tokenlarıyla cam, metal kenar ve kontrollü statik yansıma katmanları kullanır. Tekrarlayan çapraz desen kullanılmaz. Ekran ağzındaki pointer-events:none iç gölge yalnız kenar derinliği oluşturur; ekran boyutları korunur. TV ayrı ince çerçeve ve çift ayak profili kullanır.

Mobil cihaz seçimi, adı ve geometrisi src/core/hardware.ts içindeki tek model kaynağından gelir. Gövde oranı üretici mm ölçüleri ve panel bilgileriyle hesaplanır; optik kesit ve köşe eğrileri çizim rekonstrüksiyonudur. m320 iPhone 4 ekranı 320x480 CSS px olarak düzeltilmiştir. Modern kamera/çentikler ekran bölgesindedir; içerik modelin güvenli boşluğuyla korunur. Bu görüntüler CAD veya üretici fotoğrafı diye sunulmaz. Üretici kaynakları ve kapsam: docs/device-mockups.md.

Seçili rol adı ve ölçü özeti tek kalın satırda gösterilir; açık/koyu önizleme kontrolü ve onay durumu aynı sağa hizalı satırda yer alır. Ayrı, tekrarlayan rol/ölçü satırı eklenmez; 320 px görünümünde doğal sarılır.

Genel küme ilerlemesi ve geçerli kümenin element ilerlemesi sahne başlığının sağında tek kompakt WorkflowProgress bileşeninde birleşir. Etiketler “0 / 1144 onaylı küme” ve “0 / 6 element onaylandı” biçimini korur; değerler gerçek toplam ve onay sayılarından gelir. İki ilerleme metriğinin erişilebilir etiketleri ayrıdır; solda genel sayaç/çubuk veya sağda ayrı tekrarlayan element sayacı tutulmaz.

Telefon ve tablet önizlemelerinde “Dikey / Yatay” yalnız önizleme yönünü değiştirir. Seçili karar genişliği, cihaz profili, ECA/onay anahtarları ve kayıtlı değerler korunur; yataya geçiş başka kırılım veya cihaz ailesi seçmez. İçerik ve satır testleri aynı önizleme yönünü kullanır; kasa ve güvenli alanlar bu yöne uyarlanır.

## Mobil öncelikli ECA karar motoru

Workflow sürümlü, deterministik ECA kuralları kullanır; keyfî eval veya ML yoktur. Kaynaklar yalnız geçerli insan incelemelerinin canlı çözümleridir; aynı bağlam ve eşleşen elementlerde HTML → ürün kalıtımı uygulanır. Büyük genişlik/sonraki aileden geriye öğrenilmez. Manuel, insan onayı, kabul edilmiş motor (`auto`), çakışma/eski ve taslak ayrı durumlardır; otomatik kararlar insan kanıtı olmaz. Onay/kapsam olayları ileri hedefleri değerlendirir; kaynak değişimi ters bağımlılık grafiğinin geçişli kapanışını tarar. İnsan ve manuel değerler ezilmez. Geri alma/ileri alma 20 snapshot ile sınırlıdır; sürüm yenileme mevcut motor sonuçlarını yeniden değerlendirir.

`projectWorkflowDecisions` geçerli insan/manuel/kabul edilmiş motor değerlerini temsil edilebilir v2 genişliklerine taşır. Desktop 3440/3840 standart katalogdadır; TV ve v2'de temsil edilmeyen genişlikler workflow uzantısında korunur. Gerçek katalog kelimesinin normal genişliği insan onay kapısındadır; otomatik aday ayrıca gerçek örneğin aralık stresine göre sınırlandırılır. Sentetik uzun kelimeler ve okuma varsayılanları uyarıdır; fallback heuristiği ve canvas ölçümü bütün ürün AA garantisi değildir. Başlık oranı istisnası gerekçe ister. İnsan çiftlerinden çıkarılmış oran geometrik ortalamayla hesaplanır ve 0,025 yakınlıkta standart oranlara oturtulur; açık özel politika aynen korunur. Güncel 14 CSS px alt sınırı eski 12 px import değerlerini düzeltme raporuyla yükseltir; tarihsel inceleme snapshot’ı korunur ve güncel onay yeniden değerlendirilir. Kalıcılıkta `JOURNAL_KEY` yalnız kullanıcı farkları/not/politika için sınırlı acil günlüktür; tam defter kopyalanmaz. Senkron günlük ardından acil IDB yazımı kullanılır; hata/çakışmada günlük ve daha yeni insan değeri korunur, otomatik yazım durdurulur. Bu process kill garantisi değildir. Politika katkıları en fazla 30; kompakt bağımlılık tokenları eski fingerprint karşılaştırmasıyla uyumludur, sürüm ve köken regresyonları korunmalıdır. Ayrıntılar ve dürüst PASS/FAIL/not_run kaydı: `docs/decision-engine.md`, `docs/engine-audit-actions.md`.

### iPhone 4 ön yüz geometrisi (22 Ekim 2026)

`m320` gövdesi Apple'ın 58,6 × 115,2 mm oranını ve 320 × 480 CSS px ekranını korur. Köşe yarıçapı (56 CSS px), düz ekran köşeleri ve 68 CSS px Home tuşu kullanıcı ön yüz referansından optik rekonstrüksiyondur; üretici CAD ölçüsü diye sunulmaz. Donanım düzeltmeleri yalnız `m320` kapsamındadır; Home merkezi hem dikey hem yatay ekran dışında kalır. `hardware.test.ts` ve workflow içindeki iPhone 4 geometri regresyonu korunmalıdır.

### iPhone 13 mini ön yüz geometrisi (22 Ekim 2026)

`m375` Apple'ın 64,2 × 131,5 mm gövde oranını ve mevcut 375 × 812 mantıksal ekranını korur. Kullanıcının fotoğraflarından optik olarak yeniden kurulan gövde/ekran köşeleri 70/52 CSS px; çentik 178 × 38 CSS px'tir. Bunlar üretici CAD ölçüsü değildir. Ahize çentik içinde değil üst kenardadır; kamera çentik içindedir. Mini'ye özgü metal kenar ve yan tuşlar diğer telefon stillerini değiştirmez. Yatayda çentik ekran kenarına bağlı ve aynı derinlikte kalmalı; içerik güvenli alanı donanımla kesişmemelidir. İlgili hardware birim ve workflow tarayıcı regresyonlarını koru.

### iPhone 12 ön yüz geometrisi (22 Ekim 2026)

`m390` Apple'ın 71,5 × 146,7 × 7,4 mm gövde ölçülerini ve 390 × 844 mantıksal ekranını korur. Resmi ön görünüşten optik olarak yeniden kurulan gövde/ekran köşeleri 64/47 CSS px, geniş/sığ çentik 210 × 32 CSS px'tir; üretici CAD ölçüsü değildir. Ahize mini'den farklı olarak çentik içinde ortalanır; kamera sağdadır. Modelin metal kenarı ve yan tuşları yalnız m390'a uygulanır. Yatayda çentik aynı derinlikle ekran kenarına bağlanır ve güvenli içerik alanına girmez. `hardware.test.ts` ve iPhone 12 workflow geometri regresyonu bu sözleşmeyi korur.

### iPhone 11 ön yüz geometrisi (22 Ekim 2026)

`m414` Apple'ın 75,7 × 150,9 × 8,3 mm gövde ölçülerini ve 414 × 896 mantıksal ekranını korur. LCD ekranın daha kalın çevresi fiziksel gövde/ekran oranından gelir; iPhone 12'nin düz kenarı yerine yuvarlatılmış kenar ışıkları kullanılır. Optik rekonstrüksiyon gövde/ekran köşeleri 76/46 CSS px, çentik 210 × 34 CSS px'tir; bunlar üretici CAD ölçüsü değildir. Ahize çentik içinde ortalı, kamera sağdadır. Yatayda çentik aynı derinlikle ekran kenarında kalır; güvenli içerik alanı donanımla kesişmez. Model değişikliği yalnız m414 kapsamındadır; hardware ve workflow geometri regresyonları korunmalıdır.

### iPhone 15 Pro Max ön yüz geometrisi (22 Ekim 2026)

`m430` Apple'ın 76,7 × 159,9 × 8,25 mm gövde ölçülerini ve 430 × 932 mantıksal ekranını korur. Optik rekonstrüksiyonda gövde/ekran köşeleri 72/55 CSS px, Dynamic Island kapsülü 126 × 37 CSS px ve ekran kenarından boşluğu 11 CSS px'tir; üretici CAD ölçüsü değildir. Ada çentik gibi kenara bağlanmaz; yatayda da 11 px ayrım korunur. Doğal titanyum kenar ışıkları ve Action düğmesi yalnız m430'a uygulanır. Güvenli içerik alanı kapsülün dışında kalır. Yeni `cutout.inset` isteğe bağlıdır; çentikli modellerin varsayılanı sıfırdır. Hardware ve workflow geometri regresyonları korunmalıdır.

### Galaxy S20 ön yüz geometrisi (22 Ekim 2026)

`m360` Samsung'un 69,1 × 151,7 × 7,9 mm gövde ölçülerini ve 360 × 800 mantıksal ekranını korur. Optik rekonstrüksiyon gövde/ekran köşeleri 40/30 CSS px, ortadaki dairesel kamera deliği 12 × 12 CSS px ve ekran kenarından boşluğu 9 CSS px'tir; üretici CAD ölçüsü değildir. Kavisli cam kenar ışıkları yalnız m360'a uygulanır. Ses ve güç tuşları sağ kenardadır; iPhone tarzı sol tuşlar yoktur. Yatayda kamera kısa kenarın ortasına ve sağ tuşlar üst kenara döner; güvenli içerik kamera deliğinin dışında kalır. Hardware ve workflow geometri regresyonları korunmalıdır.

### Modele bağlı tablet çerçeveleri (22 Ekim 2026)

Tablet grubu mevcut `t600/t744/t768/t820/t834` kimlik ve CSS genişliklerini korur. Sırasıyla Nexus 7 (2013), iPad mini 6, iPad Air 2, iPad Air 5 ve iPad Pro 11″ (4. nesil) temsil edilir; nesiller görünür adlarda belirtilir. Nexus 7'nin 600 × 960 seçimi 1200 × 1920 paneliyle eşleşir; belirsiz “katlanabilir” etiketi artık kullanılmaz. Laptop grubundaki `t1024` seçimi tablet eşlemesine dahil değildir; laptop model eşlemesinde PowerBook G4 12″ olarak tanımlanır.

`TABLET_MODELS` üretici gövde/panel verisinin tek kaynağıdır. Kaynaklar Google Nexus teknik özellikleri (`support.google.com/nexus/answer/6102470`) ve Apple `111886/112017/111887/111842` teknik özellik sayfalarıdır. Gövde oranı ekranın fiziksel ölçülerinden hesaplanır; CSS piksel fiziksel piksel veya monitörde kalibre mm değildir. Köşe ve kamera ayrıntıları optik rekonstrüksiyondur, üretici CAD iddiası değildir.

`hardwareModel` seçili/tablet karşılaştırması, serbest Canvas ve kırılım etiketleri tarafından ortak kullanılır. Bilinen modellerin ekranı içerik uzadı diye büyümez; ekran içinde kaydırılır. Air 2'nin fiziksel Home tuşu, modern iPad'lerin ekran içi gesture göstergesi ve Nexus 7'nin merkezden kayık kamerası ayrıdır. Kameralar kısa kenardaki çerçevede kalır; yatayda gövdeyle birlikte döner. Tablet kamera tokenları `--device-tablet-camera-*` ad alanındadır; telefon kamera tokenları ezilmez. `tablets.test.ts`, tablet tarayıcı geometrisi ve mevcut telefon/klasik Home regresyonları korunmalıdır.

### Modele bağlı laptop çerçeveleri (22 Ekim 2026)

Yedi mevcut laptop kimliği ve viewport boyutu korunur. `l960/l1536` Dell XPS 13 9360'ın FHD ölçekli görünümleri; `t1024` kamerasız PowerBook G4 12″ (2005); `l1366` HD ThinkPad T480; `l1280/l1440/l1680` MacBook Air M1'in 16:10 görünümleridir. t1024 artık iPad/netbook karışık etiketi değildir. Bunlar belirli model/panel eşlemeleridir; tarayıcı veya eski işletim sistemi destek sözü değildir.

`LAPTOP_MODELS` üretici kaynaklı kapalı kasa genişliği/derinliği/yüksekliği ve panel çözünürlüğü/diagonal verilerini tutar. Kaynaklar Apple `111883` ve 2005 taşınabilir karşılaştırması, Dell 9360 resmi kurulum/özellik PDF'i, Lenovo T480 güncel PSREF PDF'idir. Kapalı kasa derinliği açık kapağın yüksekliği diye kullanılmaz. `lid.bezelMm/frontMm`, köşe ve kamera ayrıntıları optik ön görünüş rekonstrüksiyonudur, CAD ölçüsü değildir. Ekran fiziksel genişliğinden ölçeklenir; kapak yan boşlukları gerçek kasa genişliğinden, üst/alt boşluklar ayrı optik değerlerden hesaplanır. Alt kasa ön dudağı aynı gövde genişliğinde ve ayrılmış sınırlar içindedir; yüksekliği kardeş elemana açıkça aktarılır.

XPS kamerası alt-sol çerçevede; M1/T480 kameraları üst ortadadır. PowerBook'a sahte kamera eklenmez; ön çerçevesi alüminyumdur. Telefon/tablet kamera tokenları değiştirilmez. Bilinen laptopların ekranı uzun içerikle uzamaz; ekran içinde kaydırılır. Laptop yön değiştirme kontrolü yoktur. `laptops.test.ts` ve `laptop-hardware.spec.ts` sabit ekran, kamera, alt kasa hizası, 320 px görünüm ve editör aktarımını korur.
