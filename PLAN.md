# GenUX Typography Studio — plan ve kararlar

Kaynak: iki brif (sanat yönetimi + Mantine yeniden tasarım promptu) ve mevcut `genux-tipografi-lab.html`.
Alan kuralları birebir taşınır; arayüz sıfırdan kurulur.

## Kullanıcı kararları (2026-10-18)

| Konu | Karar | Gerekçe |
|---|---|---|
| Mantine | 9.7.2 | Mart 2026'dan beri kararlı; 1. brif "güncel kararlı sürüm" der. 2. brifteki "Mantine 8" bu nedenle 9 olarak uygulanır. |
| Renk dili | Nötr (1. brif) | Açık: kırık beyaz + çok açık nötr gri. Koyu: saf siyah değil, katmanlı koyu griler. Mavi yalnız seçili durum ve birincil eylemde. |
| Konum | `~/Developer/genux-typography-studio`, yerel git | Uzak depoya gönderim ve lisans seçimi ayrıca sorulur. |

## Brif sapmaları (gerekçeli)

- **react-resizable-panels yok:** Mantine 9 `AppShell` yeniden boyutlandırmayı (`useAppShellResize`) ve `Splitter` bileşenini içerir. 1. brif "Mantine'in karşılayamadığı ihtiyaç dışında ek kütüphane ekleme" der.
- **Onboarding `Tour` ile:** Mantine 9 `Tour` hedef öğeyi işaretleyen adımlı turu kendisi sağlar; `Stepper` gerekmez.
- **`focusRing: 'never'`:** 2. brif `'auto'` der; `'auto'` çevreleyen halka çizer. Kullanıcının kesin odak kuralı nedeniyle halka kapatılır, yalnız klavye modunda 3 px alt çizgi gösterilir. `forced-colors` istisnası korunur.
- **TypeScript 6.0.3:** 7.x Go tabanlı sürüm; araç uyumluluğu için 6 seçildi.
- **Devralma özellik başına:** 2. brif 5.1'e uygun olarak bağlamda yalnız ezilen değerler tutulur; her özellik ayrı ayrı "devralınana döner".
- **Bildirimler ve tur adaptörü:** `@mantine/notifications` ve `Tour` satır içi, yapılandırılamayan taşmalı eğri / `ease` / `linear` kullanır. Hareket sözleşmesi gereği yalnız bu iki yüzeyde `!important` ile token eğrisine bağlandı; kapı başka yerde `!important` geçişi reddeder.
- **`zod/mini`:** URL doğrulaması için tam zod yerine (paket boyutu).
- **Tembel yükleme:** dışa aktarma (kod vurgulama), içe aktarma (bırakma alanı), tur ve tam ekran ilk açılışta yüklenir; ana JS 1014 KB → 639 KB (gzip 308 → 189 KB).

## 1. Test planı

- **Birim (Vitest, `src/core`):** enforceRole (12/16/18, long kilidi, tiers, göreli em, gri renk), resolveRole zinciri (temel → ürün varsayılanı → ezme), sizeAt/cssSize/cssTiers (statik, tiers, fluid vw/cqi, productive, negatif kesişim, göreli), contrast/contrastInfo (büyük metin eşiği, en zayıf zemin), computeChecks (her kural), buildExport/importData (v2 gidiş-dönüş, v1, changed, ui, bozuk JSON, düzeltme raporu), history (gruplama, toplu adım, 50 sınırı).
- **Bileşen (Vitest + Testing Library):** SliderNumber (virgül, aralık dışı hata, blur'da en yakın değer), Navigator (arama, klavye, aria-current), Inspector (long kilidi, devralınana dön yalnız ezilende), ColorSection (renkli hex reddi).
- **Uçtan uca (Playwright 1.64; Chromium, Firefox, WebKit; 320/820/1280/1920):** tür seçimi → vurgu ve kaydırma; cihaz değişimi; JSON indir/içe aktar; ⌘K ve ⌘Z; tam ekran ve odak dönüşü; klavye turu (halka yok, alt çizgi var); axe kritik ihlal 0.

## 2. Veri modeli

- `RoleDef` (katalog, değişmez), `RoleProps` (çözümlenmiş değerler), `ContextState { settings, overrides: Record<RoleId, Partial<RoleProps>> }`, `Decisions { contexts, ratio }`, `UiState`.
- Çözümleme: `resolveRole(ctx, id) = enforce(def ⊕ (el ise temelin çözümü) ⊕ CTX_DEF[ctx][id] ⊕ overrides)`.
- Kalıcılık: localStorage `genux-type-lab-v2`, v2 dışa aktarma biçimi + `ui`; v2 dosyaları (eski laboratuvar dahil) içe aktarılabilir.
- JSON v2 korunur; ek alan `overrides: string[]` (özellik başına ezme listesi).

## 3. Mimari

`src/core` (saf TS, testli) → `src/store` (Zustand: decisions, ui, history; persist; türetmeler selector ile) → `src/theme` (MantineProvider teması, cssVariablesResolver, odak ve tuval SCSS) → `src/features` (navigator, canvas, inspector, statusbar, command, io, onboarding) → `src/app` (AppShell, router).

## 4. Edge case ve riskler

Kelime taşması (bölme yok, uyarı), 12 altına inme girişimi (kilit + bildirim), italik Outfit, başka sekme değişikliği (`storage`), dar paneller (min genişlik, otomatik daraltma), Fullscreen API reddi (sabit katman), reduced motion, forced colors, kaba işaretçi (48 px), dar ekranda SegmentedControl taşması (Select'e düşer), store göçü başarısızsa varsayılan + bildirim.

## 5. Uygulama adımları

1–9 tamamlandı (2026-10-18): iskelet, `src/core` + testler, tema ve odak, store/geçmiş/URL, AppShell + gezgin + denetçi + tuval + durum çubuğu, komut paleti, dışa/içe aktarma, kısayollar, tur, hazır ayarlar, tip ölçeği, karşılaştırma, tam ekran, Playwright + axe, README ve AGENTS.md.

Ek ürün türleri (kullanıcı kararı 2026-10-18): BI (Analytics & BI) ve AI (AI & Conversational) eklendi; görünen adlar HTML, SaaS, Marketing, E-ticaret, BI, AI.

Sonraki adaylar: Mantine bileşen başına CSS içe aktarımı; gerçek Safari / iOS / Android doğrulaması.
