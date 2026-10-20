import { Button, FocusTrap, Portal } from '@mantine/core';
import { useWindowEvent } from '@mantine/hooks';
import { XIcon } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import { resolveContextAt } from '../../core';
import { useCurrent } from '../../app/useCurrent';
import { useUi } from '../../store/ui';
import { PageView } from '../canvas/PageView';
import { PreviewSurface } from '../canvas/PreviewSurface';
import classes from './FullscreenPreview.module.scss';

/** "Önizle": yalnız sonuç, gerçek ekran genişliğinde. Tam ekran isteği tıklamada yapılır (actions.openFullscreen);
 *  reddedilirse katman sabit konumlu tam sayfa olarak kalır. */
export function FullscreenPreview() {
  const open = useUi((s) => s.fullscreen);
  const { ctx, id, decisions, settings, search } = useCurrent();
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(() => window.innerWidth);
  const close = () => useUi.getState().set({ fullscreen: false });

  useWindowEvent('resize', () => setWidth(ref.current?.clientWidth ?? window.innerWidth));
  // Esc odak nerede olursa olsun kapatır (katman yeni açılmışken odak henüz içeri geçmemiş olabilir).
  useWindowEvent('keydown', (e) => { if (open && e.key === 'Escape') { e.preventDefault(); close(); } });
  // Açılış ve kapanış geçişleri bir kez işlenir (efektin yeniden çalışması tam ekrandan çıkarmaz).
  const wasOpen = useRef(false);
  const trigger = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (open && !wasOpen.current) {
      trigger.current = document.activeElement as HTMLElement | null;
      setWidth(ref.current?.clientWidth ?? window.innerWidth);
    }
    if (!open && wasOpen.current) {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      // Safari düğmeye tıklayınca odak vermez (etkin öğe body kalır): o durumda tetikleyici düğmeye dönülür.
      const t = trigger.current;
      const back = t && t !== document.body && t.isConnected ? t : document.querySelector<HTMLElement>('[data-fullscreen-trigger]');
      requestAnimationFrame(() => back?.focus());
    }
    wasOpen.current = open;
  }, [open]);
  // Tam ekrandan tarayıcı yoluyla çıkılırsa (Esc, sistem hareketi) katman da kapanır.
  useEffect(() => {
    if (!open) return undefined;
    const onFs = () => { if (!document.fullscreenElement) close(); else setWidth(ref.current?.clientWidth ?? window.innerWidth); };
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, [open]);

  if (!open) return null;
  // Tam ekranda gerçek pencere genişliğinin kırılımı uygulanır.
  const resolved = resolveContextAt(decisions, ctx, width);
  return (
    <Portal>
      <FocusTrap active>
        <div ref={ref} className={classes.layer} role="dialog" aria-modal="true" aria-label="Tam ekran önizleme">
          <Button className={classes.close} variant="default" leftSection={<XIcon size={16} />} onClick={close} data-autofocus>
            Önizlemeden çık (Esc)
          </Button>
          <PreviewSurface ctx={ctx} resolved={resolved} settings={settings} width={width} theme={search.theme} clean>
            <PageView ctx={ctx} selected={id} resolved={resolved} prefix="fs" showTag={false} />
          </PreviewSurface>
        </div>
      </FocusTrap>
    </Portal>
  );
}
