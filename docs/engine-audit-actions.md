# Denetim eylemleri ve doğrulama — 21 Ekim 2026

Kullanıcının iki denetimi eski `cc213f0` commit’ine aittir. Mevcut değişiklikler `59c839f` üzerine uygulanmıştır. Eklerdeki istemler talimat yerine bulgu olarak değerlendirilmiştir. Önceki cihaz/yerleşim çalışmaları korunur.

PASS aşağıdaki belirli uygulama sözleşmesini ve adı verilen test kapsamını ifade eder. Tam ürün WCAG uygunluğu, gerçek donanım veya bütün olası veriler için garanti değildir. D3/D4/D5’te daha geniş kabul kapsamı ayrıca not_run’dır.

| Kimlik | Özgün konu | Yapılan işlem | Kanıt |
| --- | --- | --- | --- |
| A1 | catalog overwrites editor/import | Inherited editor/import değerleri korunur. | audit-regressions, persistence |
| A2 | full style transfer | Aynı rolün bütün tipografik alanları aktarılır. | audit-regressions |
| A3 | HTML inheritance | HTML insan kararları ürün kalıtımını besler. | audit-regressions |
| A4 | draft projection | Geçici ve geçersiz otomatik taslaklar dışa aktarılmaz. | projection |
| A5 | weights | Ağırlık 300–900; aynı rol tekrarlı azaltılmaz. | audit-regressions, policy |
| A6 | 2560 monitors | Desktop 2560/3440/3840 doğru v2 genişliğine; TV ayrı. | projection, engine-actions (üç motor) |
| A7 | plain import history | Varsayılan koruma, iptal ve açık değiştirme seçeneği. | persistence, engine-audit (üç motor) |
| B1 | ratio | Seçili oran korunur veya çakışma gösterilir; insan istisnası gerekçeli. | audit-regressions, model, engine-actions |
| B2 | policy | HTML politikası, bağlam override ve açık benimseme. | policy |
| B3 | inference | Yalnız geçerli insan kaynakları; ileri yön ve bütün katkı bağımlılıkları. | policy, audit-regressions |
| C1 | events | Sürümlü olay/öncelik/kapsam, sonlu bağımlılık kapanışı. | propagation |
| C2 | auto + bulk | Motor kabulü insandan ayrı; zayıf kanıt inceleme kuyruğunda. | propagation, engine-actions |
| C3 | propagation | Ziyaret gerekmeden bağımlılar güncellenir; insan kaydı ezilmez. | propagation, engine-actions |
| D1 | contrast | İki temada örnek ve politika zeminleri denetlenir. | policy, model |
| D2 | links | Gri inline linkte alt çizgi veya gerekçeli insan istisnası. | policy, model |
| D3 | reflow stress | Gerçek örnek kelime kapısı, otomatik stres kısıtı ve canvas ölçümü. | policy, MeasuredReflow, engine-actions |
| D4 | clamp | Okuma kırpması uyarısı; gerçek içerik kaybı otomatik kanıtlanmaz. | policy |
| D5 | targets | 24×24 uyarısı tipografiden ayrı gerçek etkileşim alanı gerektirir. | policy |
| D6 | backgrounds | Yapılandırılabilir gri zeminler ve güvenli ton çözümü. | policy |
| E1 | deep URL | Açık URL kalıcı konumdan öncelikli; seçimler URL ile eşleşir. | navigation, engine-audit |
| E2 | persistence full scale | 300 ms birleştirme, acil kayıt/günlük, revizyon ve köken kontrolü. | persistence, journal, full-ledger, engine-audit |
| E3 | catalog undo | Boş katalog undo yok; kabul edilmiş motor çok adımlı undo/redo. | engine, propagation |
| E4 | functional approve | Güncel değerler ve kaynaklar modelde doğrulanır. | model, audit-regressions, engine-actions |
| E5 | sources + effects + history | Alan kaynakları, etki tablosu, 20 adımlı geçmiş. | engine, propagation; bağımsız görsel inceleme |
| E6 | readability | Motor/model/projection ve ilgili motor modülleri ayrı biçimlendirme commit’inde (`64b2f93`). | Derlenen JS AST eşitliği, 213 test, typecheck/build ve bağımsız diff incelemesi PASS |

## Gerçek koşular

Çalışma dizini: `/Users/w6x/Developer/genux-typography-studio`. Node 24.21.0; React 19.3.0, Mantine 9.7.2, TypeScript 6.0.3, Playwright 1.64.0 mevcut kurulumu kullanıldı; paket eklenmedi.

- `npm run typecheck`: PASS.
- `npm test`: 24 dosya / 213 test PASS. Kapsam: tarihsel 12 px inceleme snapshot’ını değiştirmeden etkin çıktıyı 14 px’e yükseltme; oran/köken/kalıtım; 24 tohumlu özellik denemesi; günlük revizyonu, ara manuel commit kökeni ve başarısız başlangıç kurtarma pointer’ı.
- `npm run build`: PASS. Mevcut büyük chunk uyarısı sürer; bu bir performans bütçesi PASS sonucu değildir.
- Chromium: workflow + engine-actions + engine-audit + full-ledger + device-selection ilk koşuda 53/54 PASS; tek FAIL eski hata mesajı beklentisiydi. Düzeltme sonrası desteklenmeyen IDB kaydını koruma regresyonu PASS.
- Firefox ve WebKit: engine-actions + engine-audit ilk 8 senaryo × 2 motor = 16 PASS. WebKit gerçek Safari değildir.
- Son acil reload / çoğaltılmış sekme / desteklenmeyen kayıt üç motor regresyonu: 8 PASS / 1 Firefox test-harness FAIL (arka plandaki sekmeye giriş). Hedef sekmeyi öne alma düzeltmesi sonrası kalan Firefox regresyonu 1 PASS. Anında reload üç motorda 33 px değerini korudu. Önceki testin “33” beklentisi alanın “33 px” gösterimine düzeltildi; uygulama değeri zaten korunuyordu.
- Yeni yüklü ekran görüntüleri `/tmp/genux-audit-loaded-320.png` ve `/tmp/genux-audit-loaded-1440.png`; seçili gerçek örnek ve fontlar yüklendikten sonra alındı. Her iki görünümde document genişliği viewport’a eşit; görünür 14 px altı metin yok. Bağımsız salt okunur görsel incelemede ek bulgu yok. Bu ekran görüntüleri klavye veya kontrast ölçümünün yerine geçmez.
- Bağımsız salt okunur standart incelemesinin bulduğu ileriye dönük politika sızıntısı, aynı rol ağırlık azaltması, onay çakışması, sahte/eksik otomatik köken ve günlük sahipliği açıkları düzeltildi. Son kaynak incelemesinde açık uygulanabilir bulgu yok; testleri ana ajan çalıştırdı.

Son biçimlendirme sonrası koşu:

```sh
npx playwright test e2e/engine-actions.spec.ts e2e/engine-audit.spec.ts e2e/workflow.spec.ts --grep 'engine-actions|engine-audit|visible keyboard focus|product dropdown' --project=chromium --project=firefox --project=webkit
```

39/39 PASS (her motorda 13). Motor yayılımı, kuyruk, oran, canvas ölçümü, 2560 editör dönüşü, URL, import, pagehide, kayıt hatası, anında reload, çoğaltılmış sekme günlükleri ve 320 px klavye/dropdown kapsamı dahildir. `npm run typecheck`, 213 birim testi ve `npm run build` biçimlendirmeden sonra tekrar PASS. Bağımsız incelemede davranış değişikliği bulunmadı; printer’ın düşürdüğü bir açıklama yorumu geri kondu.

İşlevsel commit `0a45666`; yalnız okunabilirlik commit’i `64b2f93`. Yazar ve committer kişisel Git politikasıyla doğrulandı. Yayın durumu ayrıca GitHub Pages koşusundan izlenir.

## Ölçek ve kalıcılık

`src/test/workflowLedger.ts` ile 11.816 insan profili/inceleme ve 1.232 küme oluşturuldu. Gerçek Chromium IDB kaydı 13.125.909 bayt; CDP payload aktarımını içeren seed yaklaşık 2,19 sn, tüm ilerleme reload yaklaşık 2,21 sn. 13 not karakteri tek IDB yazımında birleştirildi. Bunlar yerel tek koşu ölçümleridir, SLA değildir.

Birim ölçek koşusunda serialize ~24,6 ms, JSON okuma ~24,3 ms, parse ~54,6 ms, soğuk ilerleme ~442,8 ms, 10 tahmin ~74,9 ms, projeksiyon ~477,6 ms, export ~88,2 ms, import ~215,1 ms gözlendi. Bellek-içi writer ~22,3 ms gerçek IndexedDB süresi değildir.

Acil günlük tam defterin ikinci kopyası değildir. Yalnız kullanıcı farkları/not/politikaları ve commit kökeni taşır. Her belge ayrı yazıcı UUID’si kullanır; önceki kurtarma pointer’ı kopyalama başarılı olana kadar korunur. Yalnız aynı revizyon commit sonrasında temizlenir. Çakışma/okuma hatasında kayıt korunur ve otomatik yazım engellenir; kurtarma farkı indirilebilir. OS çökmesi/process kill veya tarayıcı kotası için mutlak garanti yoktur. Eşzamanlı bütün-defter düzenleme bir ortak çalışma/merge özelliği değildir.

## Açık sınırlar — not_run

Tam ürün WCAG 2.2 AA denetimi; bütün içeriklerde DOM reflow/metin aralığı override/zoom; gerçek hit-area matrisi; gerçek Safari/iOS/Android/TV donanımı; CI sonucu ve production doğrulaması bu yerel testlerden çıkarılmaz. D3 canvas ölçümü DOM reflow kanıtı değildir; D4/D5 uyarıları erişilebilirlik sertifikası değildir.
