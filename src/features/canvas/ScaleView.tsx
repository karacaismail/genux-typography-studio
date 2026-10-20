import { Fragment } from 'react';
import { CATEGORIES, ROLE, changeCount, rolesOf, sampleOf, sizeAt, type ContextId, type ContextSettings, type Decisions, type RoleProps } from '../../core';
import { fmt, round } from '../../core/util';
import classes from './ScaleView.module.scss';

interface Props {
  ctx: ContextId;
  decisions: Decisions;
  resolved: Record<string, RoleProps>;
  settings: ContextSettings;
  width: number;
  selected: string;
  onPick: (id: string) => void;
}

/** Tip ölçeği: bağlamdaki bütün türler, cihaz genişliğindeki gerçek boyutlarıyla. Satıra tıklamak türü seçer. */
export function ScaleView({ ctx, decisions, resolved, settings, width, selected, onPick }: Props) {
  const roles = rolesOf(ctx);
  return (
    <div className={classes.scroll} tabIndex={0} role="region" aria-label="Tip ölçeği tablosu, yatay kaydırılabilir">
      <table className={classes.table}>
        <thead>
          <tr>
            <th scope="col">Tür</th>
            <th scope="col">Örnek</th>
            <th scope="col" className={classes.num}>Boyut</th>
            <th scope="col" className={classes.num}>Satır</th>
            <th scope="col" className={classes.num}>Ağırlık</th>
            <th scope="col">Durum</th>
          </tr>
        </thead>
        <tbody>
          {CATEGORIES.map((c) => {
            const list = roles.filter((r) => r.category === c.id);
            if (!list.length) return null;
            return (
              <Fragment key={c.id}>
                <tr className={classes.cat}><td colSpan={6}>{c.label}</td></tr>
                {list.map(({ id }) => {
                  const r = resolved[id];
                  const fs = sizeAt(r, settings, id, width);
                  const changed = changeCount(decisions, ctx, id) > 0;
                  return (
                    <tr key={id} data-selected={id === selected || undefined} onClick={() => onPick(id)}>
                      <td className={classes.name}>
                        <button type="button" className={classes.rowButton} onClick={(e) => { e.stopPropagation(); onPick(id); }} aria-pressed={id === selected}>
                          {ROLE[id].label}
                        </button>
                      </td>
                      <td><span className={`r-${id} ${classes.sample}`}>{sampleOf(ctx, id) || ROLE[id].label}</span></td>
                      <td className={classes.num}>{fmt(fs)} px</td>
                      <td className={classes.num}>{fmt(r.lh)} · {fmt(round(fs * r.lh, 1))} px</td>
                      <td className={classes.num}>{r.w}</td>
                      <td>{changed ? 'Değiştirildi' : ROLE[id].el && ctx !== 'html' ? 'Temelden' : 'Varsayılan'}</td>
                    </tr>
                  );
                })}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
