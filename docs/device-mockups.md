# Model ile eşleşen cihaz mockup'ları

Mobil seçim, ekran ölçüsü ve kasa geometrisi tek katalogdan gelir: `src/core/hardware.ts`.

| CSS viewport | Tek model | Gövde (mm) | Üretici paneli |
| --- | --- | --- | --- |
| 320 × 480 | iPhone 4 | 58,6 × 115,2 × 9,3 | 640 × 960, 326 ppi |
| 360 × 800 | Galaxy S20 | 69,1 × 151,7 × 7,9 | 1440 × 3200, 6,2 inç |
| 375 × 812 | iPhone 13 mini | 64,2 × 131,5 × 7,65 | 1080 × 2340, 476 ppi |
| 390 × 844 | iPhone 12 | 71,5 × 146,7 × 7,4 | 1170 × 2532, 460 ppi |
| 414 × 896 | iPhone 11 | 75,7 × 150,9 × 8,3 | 828 × 1792, 326 ppi |
| 430 × 932 | iPhone 15 Pro Max | 76,7 × 159,9 × 8,25 | 1290 × 2796, 460 ppi |

Kaynaklar: [iPhone 4](https://support.apple.com/en-il/112562), [Galaxy S20](https://www.samsungmobilepress.com/media-assets/galaxy_s20?tab=specs), [iPhone 13 mini](https://support.apple.com/en-us/111873), [iPhone 12](https://support.apple.com/en-us/111876), [iPhone 11](https://support.apple.com/en-us/111865), [iPhone 15 Pro Max](https://support.apple.com/en-us/111828).

CSS viewport'lar fiziksel piksel çözünürlüğü değildir. Özellikle iPhone mini'nin mantıksal çözünürlüğü fiziksel panelle tam sayı DPR bölümü değildir. Kasa/ekran oranı, yayımlanan ppi veya diyagonal üzerinden hesaplanır. Üreticinin yuvarlanmış verileri nedeniyle ekran kenarı ölçüleri yaklaşık rekonstrüksiyondur; bu bir CAD veya üretici fotoğrafı değildir. Monitördeki %100, 1 CSS px ölçeğini ifade eder; fiziksel milimetre kalibrasyonu değildir.

## Optik katmanlar

- Metal kenar: dar, asimetrik ve yüksek frekanslı olmayan ışık şeritleri.
- Ön cam: geniş ve düşük yoğunluklu yansıma; tekrar eden desen yok.
- Lens/ahize/home düğmesi: bağımsız malzeme ve gölge.
- Ekran ağzı: canlı ekranla aynı konum/boyutta, köşe yarıçapı aynı, `pointer-events:none` inset gölge. İçerik gölge katmanını kaydırmaz; gölge ekran sınırında kalır.
- Modern çentik/kamera ekran bölgesine yerleşir. Üst/alt güvenli boşluklar uygulama metnini donanımdan uzak tutar; mantıksal ekranın dış genişliği/yüksekliği değişmez.
- Tablet/laptop/desktop/TV seçimi belirli bir üretici modeli belirtmediğinden bu ailelerin kasaları temsilidir; üretici ölçüsüne sahip oldukları iddia edilmez. Aynı cam/metal/derinlik katmanlarını kullanırlar.

## Uyumluluk

320 px profilinin eski 568 px yüksekliği iPhone 4'le uyuşmadığından 480 px oldu. Genişlikler, karar anahtarları ve ECA kayıtları korunur; model/çerçeve görüntüsü değişir. `autoHeight` gerçek modelin fiziksel oranını uzatmaz. Telefon ve tablet için “Dikey / Yatay” seçimi yalnız önizlemeyi döndürür: gövde oranı döner ve güvenli alanlar yana taşınır. Seçili karar genişliği, cihaz profili, ECA/onay anahtarları ve kayıtlı tipografi değerleri korunur; yatay önizleme başka bir kırılım veya cihaz ailesi seçmez.

## Önizleme içeriği ve çalışma alanı

Seçili cihazın ekranı “İçerik / Satır testleri” görünüm seçimini kullanır. Satır testleri denetçide satır yüksekliği seçeneklerinin altında yer almaz; seçili cihazın içinde 1/2/5 satır örnekleriyle gösterilir. Seçili elementin tipografi değerleri ve bağımsız açık/koyu önizleme teması kullanılır. Görünüm veya yön seçimi kayıtlı kararları değiştirmez; cihazın çerçevesi, güvenli alanı ve iç kaydırma davranışı her iki görünümde korunur.

Çalışma alanında genel onaylı küme ilerlemesi ile geçerli kümenin element ilerlemesi sahne başlığının sağında tek kompakt bileşende birleşir: “0 / 1144 onaylı küme” ve “0 / 6 element onaylandı”. Sayılar gerçek akış verisinden gelir ve iki metriğin erişilebilir etiketleri ayrıdır; sol sidebar genel ilerleme sayacı/çubuğu içermez. Seçili rol adı ve ölçü özeti tek kalın satırda, önizleme tema kontrolü ve onay durumuyla birlikte gösterilir; dar alanda metin küçültülmeden doğal sarılır.

## Doğrulama

2026-10-21 yerel doğrulaması:

- `npm run typecheck`, `npm test` (139 test) ve `npm run build`: PASS. Derleme mevcut büyük chunk uyarısını korur.
- `npx playwright test e2e/workflow.spec.ts e2e/device-selection.spec.ts --project=chromium`: ilk turda 41 PASS, 2 FAIL. Fiziksel kasa aralığı ölçümü ve birleşik ilerlemenin ARIA sözleşmesi düzeltildi; ilgili testler hedefli tekrarda PASS. İki modern yatay güvenli alan testiyle birlikte 45 farklı Chromium senaryosu PASS.
- Aynı dosyalarda değişen yön, cihaz içi test, tema, ilerleme, optik geometri, kaydırma ve klavye odak senaryoları: Firefox 13, WebKit 13 PASS. Dar editörde ekran altında kalan `figcaption` seçimi ayrıca üç motorda PASS.
- 320 CSS px kontrolünde belge genişliği 320 px; masaüstü, yatay ve cihaz içi test ekran görüntüleri incelendi. Piksel baseline yenilenmedi.
- Bağımsız salt okunur incelemenin bulduğu güvenli alan ve doğru kaydırıcı sorunları düzeltildi ve hedefli regresyonlarla doğrulandı.

WebKit gerçek Safari sonucu değildir. Gerçek iOS/Android cihaz, macOS Safari ve bütün ürünün WCAG 2.2 AA denetimi `not_run`; bu kontroller tüm ürün için uyumluluk iddiası oluşturmaz.
