# Mobil öncelikli tipografi karar motoru

Motor tarayıcıda çalışan sürümlü, deterministik Event–Condition–Action (ECA) sistemidir. Kodda tanımlı kurallar ve doğrulanmış insan kararları kullanılır; keyfî ifade çalıştırma/eval, ML, harici model veya güven yüzdesi yoktur. Aynı veri ve kural sürümü aynı sonucu üretir.

## Durum ve kaynak sözleşmesi

| Durum | Anlamı | Öğrenme kaynağı |
| --- | --- | --- |
| İnsan onayı (`approved`) | Fingerprint, kaynak zinciri ve model kapıları geçerli insan incelemesi | Evet |
| Manuel (`manual`) | Kullanıcının açık düzenlemesi; otomatik ezilmeden korunur | İnsan onayına kadar hayır |
| Kabul edilmiş motor (`auto`) | Geçerli insan kanıtından, güncel kural sürümüyle kabul edilmiş sonuç | Hayır |
| Çakışma / eski (`conflict`, görünür `stale`) | Kaynak, kural sürümü veya engelleyici denetim geçersiz | Hayır |
| Taslak (`automatic`, görünür `draft`) | Önizleme/katalog veya henüz kabul edilmemiş öneri | Hayır |

`stepDone` bütün elementlerde insan onayı ister; `stepSettled` geçerli insan onayı veya kabul edilmiş motor sonucunu kabul eder. Bu iki sayaç birbirinin kanıtı değildir. Kaynaklar, içe aktarılmış snapshot değerlerinden değil, fingerprint'i geçerli inceleme kayıtlarının canlı çözümünden alınır. Ürün bağlamı içindeki kararlar ve element eşlemesi bulunan HTML insan kararları kullanılabilir. HTML → ürün kalıtımı vardır; ürünler arasında serbest çapraz öğrenme yoktur. Genişlik ve aile sırası geriye akışı engeller; aynı rol/genişlikteki tekrarlar eğilim kanıtını çoğaltmaz.

## Olaylar, politika ve yayılım

`step-entered`, `decision-approved`, `decision-changed`, `recalculate` değerlendirme nedenleridir. Hedef değerlendirmesi öncelikli kurallar kullanır; sistemin tamamı yalnız tek geçiş diye tanımlanmaz. `propagation.ts` onay ve kapsamlı yeniden hesaplama için uygun ileri hedefleri seçer; kaynak değişiminde ters bağımlılık grafiğinin geçişli kapanışını sonlu kayıt kümesi üzerinde tarar. Aynı hedef kapanışta tekrar kuyruğa alınmaz. Bir olayın değerlendirmesi sabit kaynak snapshot'ı kullanır; otomatik sonuç insan kanıtına dönüşmez.

Aynı elementin yakın insan kararı, farklı genişliklerin sınırlı eğilimi, ilişkili roller, başlık ilişkileri, politika, proje sınırları ve kontrast ayrı kurallardır. Politika kapsamı ürün, aile, genişlik ve küme ile daraltılabilir. HTML politikası ürün varsayılanına kalıtılır; açık ürün politikası korunur. Çıkarılmış politika öneridir, kendiliğinden kaydedilmiş politika değildir.

B3 güncellemesi: insan başlık çiftlerinden oran çıkarımı geometrik ortalamadır. Tam sayı boyut geri beslemesini azaltmak için 0,025 yakınlığında 1,125 / 1,2 / 1,25 / 1,333 / 1,414 standartlarına oturtulur. Açık özel politika oranı aynen korunur. Bu son değişikliğin test sonucu ana ajan tarafından doldurulacak; burada PASS sayılmaz.

## Koruma, geçmiş ve kalıcılık

Manuel kararlar ve insan onayları otomatik yayılımda ezilmez. Kaynağı değişen insan kararının eski değeri korunur, geçerliliği düşer. Açık yeniden onay model kapılarını tekrar uygular; başlık oranı istisnası gerekçe ister. Gerekçe bütün kontrolleri devre dışı bırakmaz: model yalnız izin verilen başlık-oranı ve bağlantı-alt-çizgi istisnalarını kabul eder.

Geri alma/ileri alma profil ve motor metaverisinin en fazla 20 geçmiş/gelecek snapshot'ını tutar. İnsan onaylı kayıtlarda işlem korumaları vardır; geri alma sonsuz geçmiş veya otomatik yeniden onay değildir. Kaynak bağımlılık özeti güvenlik imzası değildir. Döngü/derinlik ve import biçim sınırları korunur. Kural sürümü yenilemesi mevcut kabul edilmiş motor kayıtlarını yeniden değerlendirir; insan kayıtlarını ezmez. Gerçek kabul edilmiş motor undo/redo ve sürüm yenileme/geçişli kapanış testlerinin yeni sonuçları henüz bekleniyor.

Profil, inceleme, politika, nedenler, kaynak fingerprint'leri ve motor sürümü IndexedDB ve JSON workflow uzantısında saklanır. Not yazımları birleştirilir; saf birim benchmark'ının bellek içi yazıcısı gerçek IndexedDB I/O değildir.

### E2 kurtarma günlüğü ve yazım sırası

Gerçek Chrome'da async IndexedDB commit tamamlanmadan anında reload, manuel 33 px değerini kaybedebiliyordu. Yeni kurtarma katmanının mevcut kaynak adı `src/features/workflow/journal.ts` dosyasıdır (ilk bildirimde recoveryjournal adı kullanıldı). `JOURNAL_KEY`, localStorage'da 1 MiB sınır kontrolüne sahip acil fark günlüğüdür; 13 MB tam defterin ikinci kopyası değildir. Yalnız manuel/geri alınmış veya insan incelemesi değişmiş profillerin ilgili farkları, notlar, politikalar ve önceki değer karşılaştırmaları; ayrıca devam konumu tutulur. Mevcut sınır denetimi serialize metnin `length` değeridir; fiziksel UTF-8 bayt veya tarayıcı kota garantisi sayılmaz.

Kurtarma, kararlı kanonik önce/sonra karşılaştırması yapar. Mevcut değer önceki ya da uygulanacak değerle uyuşuyorsa fark uygulanabilir. Daha yeni çakışan insan değeri korunur; çakışma görünür hata ve `readable=false` ile otomatik yazımı durdurur. İnsan incelemesi olmayan üretilmiş ara profil/motor değerleri değiştirilebilir. Hata/çakışmada günlük korunur; sessizce silinmez.

Açık kaydetme ve `pagehide` önce senkron günlüğü yazmayı dener, sonra acil atomik IndexedDB yazımını başlatır. `flushImmediate` eski kuyruk isteklerini geçersiz kılar; aktif IndexedDB işlem sırası ve eski snapshot koruması daha eski core kararının yeniyi ezmesini önlemeyi amaçlar. Güncel snapshot başarıyla kalıcılaştırıldıktan sonra günlük silinir. Günlük kota hatası IndexedDB'nin başarılı olmasını engellemek zorunda değildir; her iki yolun başarısı varsayılmaz. `pagehide` veya senkron localStorage, process kill/OS çökmesi için %100 kalıcılık garantisi vermez.

Günlük birim regresyonları revizyon karşılaştırmasını, ara manuel commit kökenini ve kesilen başlangıç okumasından kurtarmayı kapsar. Her belge yeni bir yazıcı UUID’si alır; önceki pointer ancak kurtarma kopyalandıktan sonra ilerler. Gerçek tarayıcı sonuçları denetim defterindedir.

Politika katkı kaynaklarının import sınırı en fazla 30'dur (ana ajan bildirimi). Bağımlılık tokenı kompakt 16 karakterdir; `matchesDependency` eski tam fingerprint ile yeni token karşılaştırmasını destekler. Bu özet güvenlik imzası değildir. Sürüm/geriye uyumluluk regresyonları birim suite içinde doğrulandı. Birincil ve gelişmiş alanlarda kaynak ipuçları gösterilir; yüklü ekranlar bağımsız görsel incelemeye sunuldu.

## JSON ve serbest editör

`projectWorkflowDecisions` geçerli insan, manuel ve kabul edilmiş motor profillerini temsil edilebilir v2 genişliklerine taşır; taslak ve geçersiz motor sonucu aktarılmaz. Desktop 3440/3840 artık standart katalogda temsil edilir; bütün ek monitörleri dışarıda saymak yanlıştır. TV ve v2 kırılım kümesinde olmayan genişlikler workflow uzantısında korunur; aileler aynı genişlikte birbirine ezilmez. v2 ortak rol rengi kullanır; workflow kesin aile/genişlik renklerini korur. Editöre geçiş baseline'ı dönüşte yalnız gerçekten değişen alanların manuel uzlaştırılmasını sağlar.

## Tipografi ve erişilebilirlik sınırları

Güncel kullanıcı kararı bütün okunabilir metinlerde en az 14 CSS px'tir. Ana ajan `HARD.minReadable` ve `tagPill` değerlerini 14'e yükselttiğini bildirdi; önceki 12 px açıklamaları geçerli sözleşme değildir. Eski 12 px dosyalar enforce/import sırasında 14'e düzeltilir ve içe aktarma düzeltme raporunda belirtilir. Uyumluluk regresyonu PASS: etkin değer 14 px olurken tarihsel insan incelemesindeki özgün 12 px snapshot korunur ve güncel onay geçersizleşir. Uzun okuma 18 px kararı korunur.

Kontrollerin kapsamları ayrıdır:

- Gerçek katalog örneğinin normal kelime genişliği (`max-word-width`) modelde insan onayını engelleyebilir; 120 px başarısız örnek bildirildi.
- Otomatik aday gerçek katalog kelimelerine %12 harf / %16 kelime aralığı stresi altında sığacak şekilde sınırlandırılır; proje minimumu ihlal edilmez, çözümsüz durum çakışmadır.
- Gerçek örneğin stres uyarısı, sentetik uzun Türkçe kelimeler, okuma satır uzunluğu/kırpma ve hedef satır kutusu uyarıları tek başına insan onayını engellemez. Sentetik kelimeyi gerçek seçili içerik gibi değerlendirme.
- Saf genişlik hesabı font duyarlı bir fallback heuristiğidir; gerçek font çizimi veya tüm sayfa reflow kanıtı değildir. Tarayıcı canvas stres ölçümü ayrıca gösterilir; canvas genişliği DOM yerleşimi veya AA sertifikası değildir.
- İki tema ve tanımlı zeminler için kontrast denetlenir. Okuma varsayılanları/proje önerileri WCAG'nin evrensel font boyutu veya varsayılan satır yüksekliği şartı değildir.

İlk kelime-stres/AA değerlendirmesi bütün ürün için güvence sayılmaz. %200 büyütme, yeniden akış, kullanıcı metin aralığı override'ı, tüm içerik ve gerçek cihazlar ayrıca doğrulanmalıdır. Bu belge WCAG uygunluk sertifikası vermez.

## Kanıt durumu — 21 Ekim 2026

Güncel komutlar, gerçek koşu sonuçları ve eksik kapsam [denetim eylem defterindedir](engine-audit-actions.md). Test dosyasının varlığı tek başına PASS sayılmaz; yerel sonuç CI/production sonucu değildir.
