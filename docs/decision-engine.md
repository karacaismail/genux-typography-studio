# Mobil öncelikli tipografi karar motoru

Motor tarayıcıda çalışan, sürümlü ve deterministik bir Event–Condition–Action (ECA) motorudur. Harici model/API veya sahte öğrenme yüzdesi kullanmaz. Aynı onaylar ve aynı katalog sürümü aynı sonucu üretir.

## Olaylar ve öncelikler

`step-entered`, `decision-approved`, `decision-changed`, `recalculate` değerlendirme olaylarıdır. Yeni aşamaya giriş otomatik taslak hazırlar. Manuel değişiklik o hedefi kilitler. Onay, sonraki hedeflerin kullanabileceği doğrulanmış bir çapa oluşturur. Kaynak değişikliği onaysız taslağı yeniden hesaplar; onaylı sonucu değiştirmez, bağımlı onayını geçersiz kılar. Kullanıcı yeniden hesaplayabilir veya mevcut değeri tekrar onaylayabilir.

| Öncelik | Koşul | Eylem |
| --- | --- | --- |
| 10 | Aynı element için daha küçük/eşit ekranda geçerli onay | En yakın karardan ağırlık/ritim/ton/boşluk taşı; boyutu katalog oranıyla büyüt |
| 10 | En az iki farklı genişlikte aynı element onayı | Normalize oranların çiftler arası medyan eğilimi; sınırlı ileri tahmin |
| 20 | Aynı element çapası yok, önceki ilişkili küme kararları var | En fazla beş onaydan medyan boyut oranı, ağırlık farkı ve satır ritmi |
| 30 | H1–H6, üst başlık onaylı | Alt başlık üst başlıktan büyük olamaz |
| 40 | Her otomatik sonuç | Proje minimumu, tam sayı px, izinli satır yüksekliği; uzun okuma 18 px sabit |
| 50 | Açık/koyu çıktı tonu yetersiz | Gerçek metin boyutu/ağırlığı ve ilgili zeminlere göre en yakın güvenli gri |

Kurallar tek geçişte, sabit öncelikle çalışır. Otomatik taslak onaylanmadan kaynak olmaz. Yalnız aynı ürün bağlamı kullanılır. Büyük ekrandan küçüğe, TV'den telefona veya başka ürün türünden öğrenme yapılmaz. Aynı genişlikteki farklı cihazlar kanıt sayısını yapay olarak çoğaltmaz. En fazla beş genişlik eğilim için kullanılır. Katalog başlangıcı, ilişkili karar, aynı element ve eğilim ayrı kanıt türleridir; istatistiksel güven yüzdesi değildir.

## Kullanıcı kararı ve geri alma

- Elle düzenlenmiş ve daha önce kaydedilmiş açık kararlar otomatik olarak ezilmez.
- Geçerli onay zorla yeniden hesaplamaya karşı da korunur.
- Kaynağı değişen onay eski değerlerini korur fakat yeniden inceleme gerektirir.
- Yeniden hesapla, önceki profil ve bir önceki motor durumunu tek seviyeli geri alma için kaydeder. Geri alma manuel değeri ve kilidini geri getirir; otomatik değer tekrar hemen uygulanmaz.
- Profil, nedenler, kaynak kimlikleri/fingerprint'leri ve motor sürümü IndexedDB ile JSON workflow uzantısında saklanır. Kaynak fingerprint'leri içinde sabit uzunluklu bağımlılık özeti kullanılır; bu bir güvenlik imzası değildir.
- İçe aktarılan snapshot alanları öğrenmede kullanılmaz. Kaynak değerleri mevcut, fingerprint'i geçerli çözümden yeniden hesaplanır. Bozuk/yeni sürümlü motor metaverisi elenir; eski karar kayıtları korunur. Döngüler ve aşırı bağımlılık derinliği reddedilir.

## Standart JSON ve serbest editör

`projectWorkflowDecisions` standart cihaz profillerini mevcut v2 karar modeline aktarır. JSON'un ana `contexts` alanı ve serbest editör bu aynı projeksiyonu kullanır. TV ve ek monitör profilleri farklı aileleri birbirine ezmemek için workflow uzantısında kalır. Akıştan editöre geçişte hedeflerin projeksiyon anı kaydedilir; dönüşte yalnız editörde değiştirilen özellikler manuel karar olarak birleştirilir. Böylece editördeki değişiklik bir sonraki aktarımda eski akış profiliyle ezilmez. Statik olmayan eski profiller aktarılırken `sizeAt` ile o genişlikteki gerçek uygulanan boyut hesaplanır.

v2 renkleri element başına ortaktır; workflow ise ekran/aile profillerini tam olarak saklar. Ana v2 aktarımı, küçükten büyüğe boyutları korur ve ortak rengi dışa aktarılan boyutlarda güvenli tutar. Workflow uzantısı kesin ekran bazlı renkleri ve kaynakları kayıpsız korur. Onay, kullanıcı tercihi ve otomatik taslak ayrımı bu uzantıdadır.

## WCAG 2.2 AA kapsamı

[1.4.3 Kontrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum): normal metin en az 4,5:1; büyük metin en az 3:1. Büyük metin ≥24 CSS px veya ≥18,66 CSS px ve 700+ ağırlıktır. İki tema ve elementin tanımlı zeminleri denetlenir. Yetersiz manuel kontrast hem arayüzde hem onay fonksiyonunda engellenir.

Projenin 14/16/18 px sınırları ve okuma satır yüksekliği ≥1,5 önerisi WCAG font boyutu zorunluluğu değildir. [1.4.12 Metin aralığı](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing) varsayılan satır yüksekliğinden ziyade kullanıcı override'ında içerik kaybı olmamasını gerektirir. [1.4.4 %200 büyütme](https://www.w3.org/WAI/WCAG22/Understanding/resize-text) ve [1.4.10 yeniden akış](https://www.w3.org/WAI/WCAG22/Understanding/reflow) gerçek çıktı üzerinde ayrıca test edilmelidir. Motor tüm sayfa için AA sertifikası vermez.

## Gerçek doğrulama komutları

- `npm run typecheck`
- `npm test`
- `npx playwright test e2e/workflow.spec.ts --project=chromium`
- `npx playwright test e2e/workflow.spec.ts --project=firefox --project=webkit --grep 'engine|collects a decision'`
- `npm run build`

Gerçek Safari/iOS/Android cihazları, ekran okuyucu ve bütün hedef sayfalar bu komutların başarılı olmasıyla doğrulanmış sayılmaz.

## Teslim kanıtı (21 Ekim 2026)

- Node 24.21.0; React 19.3.0, Mantine 9.7.2, TypeScript 6.0.3; bağımlılık eklenmedi.
- Typecheck ve 129 birim testi geçti. Kapsam: öğrenme kaynağı, yön/bağlam sınırı, medyan eğilim, manuel/onay koruması, kaynak geçersizleşmesi, tek seviyeli undo, import metaverisi, döngü sınırı, dört statik olmayan boyut modu, standart JSON projeksiyonu ve editör uzlaştırması.
- Chromium: güncel 35 workflow senaryosu geçti; üretim build geçti.
- Firefox/WebKit: 16 hedefli tarayıcı senaryosu geçti. Dahil: 320 px motor akışı, JSON/IndexedDB, editör gidiş-dönüşü, başarısız workspace yazımı sonrası reload, gecikmeli handoff sırasında girdi koruması, görünür klavye odağı.
- 320 CSS px H2 formu, motor paneli açıkken axe taraması: 0 ihlal; sayfa scrollWidth 320. Bu form taramasıdır, bütün ürün denetimi değildir.
- 1.000 onaylı kayıt üzerinde saf motor benchmark'ı: 10 değerlendirme toplam 13,2 ms, ilerleme taraması 5,3 ms (yerel Node/jsdom; gerçek cihaz performans garantisi değil).
- Bağımsız salt okunur incelemede açık eyleme dönük bulgu kalmadı. 320 px ve masaüstü ekran görüntüleri ayrıca incelendi; yeni piksel baseline onaylanmadı.
- Gerçek Safari/iOS/Android cihaz testi ve tüm son kullanıcı sayfalarının WCAG denetimi `not_run`.
