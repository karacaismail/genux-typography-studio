import { ActionIcon, Tooltip } from '@mantine/core';
import { ArrowCounterClockwiseIcon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { BASE_BP, type Inheritance, type ScreenSource } from '../../core';
import classes from './Inspector.module.scss';

const BASE_LABEL: Record<'context' | 'inherited' | 'default', string> = {
  context: 'Ürün varsayılanı',
  inherited: "HTML'den",
  default: 'Varsayılan',
};
const RESET_LABEL: Record<Exclude<Inheritance, 'overridden'>, string> = {
  context: 'Ürün varsayılanına dön',
  inherited: "HTML'deki değere dön",
  default: 'Varsayılana dön',
};

/** Değerin nereden geldiğini kısa etikete çevirir. */
export function sourceLabel(src: ScreenSource, bp: number, screenKey: boolean): string {
  switch (src.kind) {
    case 'here': return bp === BASE_BP || !screenKey ? 'Değiştirildi' : `Bu ekranda (${bp} px)`;
    case 'screen': return `${src.from} px'ten`;
    case 'html-screen': return `HTML ${src.from} px'ten`;
    case 'auto': return `Otomatik · ${src.from} px'ten`;
    case 'base': return `${BASE_BP} px'ten`;
    default: return BASE_LABEL[src.kind];
  }
}

interface Props {
  label: string;
  value?: ReactNode;
  source: ScreenSource;
  /** Düzenlenen kırılım ve özelliğin kırılım zincirine girip girmediği. */
  bp: number;
  screenKey: boolean;
  /** Ezme kaldırılınca dönülecek katman (temel ekranda). */
  parent: Exclude<Inheritance, 'overridden'>;
  onReset: () => void;
  children: ReactNode;
  htmlFor?: string;
}

/** Özellik satırı: etiket, değer, kaynağı ve yalnız bu katmanda değiştirildiyse "kalıtılana dön". */
export function PropertyRow({ label, value, source, bp, screenKey, parent, onReset, children, htmlFor }: Props) {
  const here = source.kind === 'here';
  const reset = bp !== BASE_BP && screenKey ? 'Kalıtılana dön' : RESET_LABEL[parent];
  return (
    <div className={classes.row} data-overridden={here || undefined}>
      <div className={classes.rowHead}>
        <label className={classes.rowLabel} htmlFor={htmlFor}>{label}</label>
        {value !== undefined && <span className={classes.rowValue}>{value}</span>}
        <span className={classes.source} data-source={here ? 'overridden' : source.kind}>{sourceLabel(source, bp, screenKey)}</span>
        {here && (
          <Tooltip label={reset}>
            <ActionIcon size="md" variant="subtle" color="gray" onClick={onReset} aria-label={`${label}: ${reset}`}>
              <ArrowCounterClockwiseIcon size={16} />
            </ActionIcon>
          </Tooltip>
        )}
      </div>
      {children}
    </div>
  );
}
