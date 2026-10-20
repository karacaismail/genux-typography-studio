import { Button } from '@mantine/core';
import { SlidersHorizontalIcon } from '@phosphor-icons/react';
import { CHOICES, decisionAt, contrastInfo, changeCount, sampleOf, sizeAt } from '../../core';
import { fmt } from '../../core/util';
import { useCurrent } from '../../app/useCurrent';
import { useUi } from '../../store/ui';
import { PreviewSurface } from './PreviewSurface';
import classes from './SelectedStrip.module.scss';

/** "Düzenleniyor" şeridi: seçili tür her zaman tuvalin üstünde, gerçek boyutunda ve canlı. */
export function SelectedStrip({ showInspectorButton }: { showInspectorButton: boolean }) {
  const { ctx, id, def, r, resolved, settings, dims, search, decisions } = useCurrent();
  const fs = sizeAt(r, settings, id, dims.w);
  const c = contrastInfo(r, id, search.theme);
  const changed = changeCount(decisions, ctx, id);
  const ff = CHOICES.ff.find(([k]) => k === r.ff)?.[1];
  const sheetOpen = useUi((st) => st.inspectorOpen);
  return (
    <section className={classes.strip} aria-label="Düzenlenen tür" data-tour="strip">
      <div className={classes.top}>
        <span className={classes.badge}>{def.label}</span>
        <span className={classes.editing}>düzenleniyor</span>
        <span className={classes.meta}>
          {fmt(fs)} px · {r.w} · {ff} · satır {fmt(r.lh)} · kontrast {fmt(c.ratio, 2)}:1 {c.pass ? 'AA' : 'AA altında'}
          {decisionAt(id, dims.w) !== null ? ` · karar ${decisionAt(id, dims.w)} px` : ''}
          {changed ? ` · ${changed} özellik değişti` : ''}
        </span>
        {showInspectorButton && (
          <div className={classes.actions}>
            <Button
              size="sm" variant="filled" leftSection={<SlidersHorizontalIcon size={18} />} data-inspector-trigger
              aria-expanded={sheetOpen}
              onClick={() => useUi.getState().set({ inspectorOpen: !sheetOpen })}
            >
              Ayarlar
            </Button>
          </div>
        )}
      </div>
      <div className={classes.sampleRow} tabIndex={0} role="region" aria-label="Canlı örnek, yatay kaydırılabilir">
        <PreviewSurface ctx={ctx} resolved={resolved} settings={settings} width={dims.w} theme={search.theme} className={classes.sample}>
          <p className={`r-${id}`} data-strip-sample>{sampleOf(ctx, id) || def.label}</p>
        </PreviewSurface>
      </div>
    </section>
  );
}
