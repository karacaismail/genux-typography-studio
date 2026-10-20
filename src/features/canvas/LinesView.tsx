import { useLayoutEffect, useRef, useState } from 'react';
import { CHOICES, ROLE, contrastInfo, sampleOf, sizeAt, type ContextId, type ContextSettings, type RoleProps, type Theme } from '../../core';
import { fmt, round } from '../../core/util';
import { fillLines } from './lines';
import classes from './LinesView.module.scss';

interface CardProps {
  ctx: ContextId;
  id: string;
  r: RoleProps;
  fs: number;
  target: 1 | 2 | 5;
  guides: boolean;
}
function LineCard({ ctx, id, r, fs, target, guides }: CardProps) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [got, setGot] = useState<number>(target);
  const lhpx = fs * r.lh;
  const base = sampleOf(ctx, id) || ROLE[id].label;
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const run = () => {
      if (target === 1) { el.textContent = base; setGot(1); } else setGot(fillLines(el, base, fs, lhpx, target));
    };
    run();
    // Genişlik değişince yeniden ölç (yalnız genişlik: yükseklik değişimi döngü yaratır).
    let w = el.parentElement?.clientWidth ?? 0;
    const ro = new ResizeObserver(() => {
      const nw = el.parentElement?.clientWidth ?? 0;
      if (nw !== w) { w = nw; run(); }
    });
    if (el.parentElement) ro.observe(el.parentElement);
    return () => ro.disconnect();
  }, [base, fs, lhpx, target, r]);
  return (
    <div className={classes.card}>
      <div className={classes.cardHead}>
        <span>{target === 1 ? 'Tek satır' : `${target} satır`}</span>
        <span>{got !== target ? `${got} satıra sığdı` : `${fmt(round(lhpx, 1))} px satır kutusu`}</span>
      </div>
      <div className={classes.sampleBox}>
        <p
          ref={ref}
          className={`r-${id} ${classes.sample}${target === 1 ? ` ${classes.oneLine}` : ''}`}
          data-guides={guides || undefined}
          data-role-sample={id}
          data-lines={target}
          style={{ ['--lhpx' as string]: `${round(lhpx, 3)}px` }}
        />
      </div>
    </div>
  );
}

interface Props {
  ctx: ContextId;
  ids: string[];
  resolved: Record<string, RoleProps>;
  settings: ContextSettings;
  width: number;
  theme: Theme;
  guides: boolean;
}

/** Satır testi: her tür için tek, iki ve beş satır; satır kutuları şeritle görünür. Genişlik cihaz genişliğidir. */
export function LinesView({ ctx, ids, resolved, settings, width, theme, guides }: Props) {
  return (
    <div className={classes.wrap} style={{ maxWidth: width }}>
      {ids.map((id) => {
        const r = resolved[id];
        const fs = sizeAt(r, settings, id, width);
        const lhpx = fs * r.lh;
        const gap = lhpx - fs;
        const c = contrastInfo(r, id, theme);
        const ff = CHOICES.ff.find(([k]) => k === r.ff)?.[1];
        return (
          <section key={id} className={classes.cards} aria-label={`${ROLE[id].label} satır testi`}>
            <div className={classes.head}>
              <h3 className={classes.roleTitle}>{ROLE[id].label}</h3>
              <span>{fmt(fs)} px · {r.w} · {ff} · satır {fmt(r.lh)} · kontrast {fmt(c.ratio, 2)}:1</span>
            </div>
            <p className={classes.legend}>
              Satır kutusu {fmt(lhpx, 1)} px = {fmt(r.lh)} × {fmt(fs)} px.{' '}
              {gap >= 0
                ? `Satırlar arası boşluk ${fmt(gap, 1)} px (yazının üstünde ve altında ${fmt(gap / 2, 1)} px).`
                : `Satır kutusu yazıdan ${fmt(-gap, 1)} px küçük: satırlar üst üste biner.`}
              {r.clamp > 0 ? ' Satır sınırı test kartlarında uygulanmaz.' : ''}
            </p>
            {([1, 2, 5] as const).map((n) => <LineCard key={n} ctx={ctx} id={id} r={r} fs={fs} target={n} guides={guides} />)}
          </section>
        );
      })}
    </div>
  );
}
