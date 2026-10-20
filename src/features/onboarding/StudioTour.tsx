import { Tour } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { useUi } from '../../store/ui';
import { MOTION } from '../../theme/tokens';

/** İlk açılışta kısa tanıtım. Bir kez tamamlanınca ya da kapatılınca tekrar açılmaz (menüden yeniden başlatılır). */
export function StudioTour() {
  const done = useUi((s) => s.tourDone);
  const wide = useMediaQuery('(min-width: 75em)', true);
  const close = () => useUi.getState().set({ tourDone: true });
  return (
    <Tour
      active={!done}
      onClose={close}
      transitionProps={{ duration: MOTION.base, timingFunction: MOTION.ease, transition: 'fade' }}
      stepTransitionDuration={MOTION.base}
      overlayColor="var(--gx-scrim)"
      labels={{ skip: 'Geç', back: 'Geri', next: 'İleri', close: 'Bitir', stepCounter: (c, t) => `${c} / ${t}` }}
      maxWidth={340}
    >
      <Tour.Step target="[data-tour='toolbar']" title="Ürün türü ve kararlar" position="bottom">
        SaaS Admin, Marketing, E-ticaret ve HTML5 temel katmanı ayrı ayarlanır. Ürün türleri HTML5 elementlerini temelden devralır.
      </Tour.Step>
      {wide ? (
        <Tour.Step target="[data-tour='navigator']" title="Tür gezgini" position="right">
          Bir türü seçin; önizlemede bütün örnekleri işaretlenir. Ok tuşlarıyla gezinip Enter ile seçebilirsiniz.
        </Tour.Step>
      ) : null}
      <Tour.Step target="[data-tour='strip']" title="Düzenlenen tür" position="bottom">
        Seçili tür her zaman üstte, gerçek boyutunda ve canlı görünür.
      </Tour.Step>
      <Tour.Step target="[data-tour='canvas-toolbar']" title="Cihaz ve görünüm" position="bottom">
        Sayfa, satır testi (1, 2 ve 5 satır) ve tip ölçeği arasında geçin; her ekran sınıfı için ayrı boyut verebilirsiniz.
      </Tour.Step>
      {wide ? (
        <Tour.Step target="[data-tour='inspector']" title="Denetçi" position="left">
          Boyut, ağırlık, aralık, biçim ve renk. Değiştirilen özellik tek tıkla devralınan değere döner.
        </Tour.Step>
      ) : null}
      <Tour.Step target="[data-tour='status']" title="Kontroller" position="top">
        Kesin kurallar ve uyarılar burada. Komut paleti için ⌘K / Ctrl K.
      </Tour.Step>
    </Tour>
  );
}
