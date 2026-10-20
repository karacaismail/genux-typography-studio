import { CloseButton, Transition } from '@mantine/core';
import { useEffect, useRef } from 'react';
import { useUi } from '../../store/ui';
import { MOTION } from '../../theme/tokens';
import { Inspector } from './Inspector';
import classes from './Inspector.module.scss';

/** Dar ekranda denetçi: modal olmayan alt bölge. Tuval üstte görünür ve kullanılabilir kalır;
 *  odak tuzağı yok. Açılınca odak panele geçer, kapanınca açan düğmeye döner; Esc kapatır. */
export function InspectorSheet() {
  const open = useUi((s) => s.inspectorOpen);
  const headRef = useRef<HTMLHeadingElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);
  const close = () => useUi.getState().set({ inspectorOpen: false });

  useEffect(() => {
    if (open && !wasOpen.current) {
      trigger.current = document.activeElement as HTMLElement | null;
      requestAnimationFrame(() => headRef.current?.focus());
    }
    if (!open && wasOpen.current) {
      const t = trigger.current;
      const back = t && t !== document.body && t.isConnected ? t : document.querySelector<HTMLElement>('[data-inspector-trigger]');
      requestAnimationFrame(() => back?.focus());
    }
    wasOpen.current = open;
  }, [open]);

  return (
    <Transition mounted={open} transition="slide-up" duration={MOTION.base} timingFunction={MOTION.ease}>
      {(styles) => (
        <section
          className={classes.sheet} style={styles} aria-labelledby="gx-sheet-title"
          onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } }}
        >
          <div className={classes.sheetHead}>
            <h2 id="gx-sheet-title" ref={headRef} tabIndex={-1} className={classes.sheetTitle}>Ayarlar</h2>
            <CloseButton aria-label="Ayarları kapat" onClick={close} />
          </div>
          <div className={classes.sheetBody}><Inspector /></div>
        </section>
      )}
    </Transition>
  );
}
