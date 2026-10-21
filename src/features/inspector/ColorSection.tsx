import { TextInput } from '@mantine/core';
import { useEffect, useId, useState } from 'react';
import { BG, GRAYS, contrastInfo, grayHex, normalizeGray, type RoleProps, type Theme } from '../../core';
import { fmt } from '../../core/util';
import classes from './Inspector.module.scss';

interface Props {
  id: string;
  r: RoleProps;
  theme: Theme;
  onChange: (hex: string) => void;
}

const THEME_LABEL: Record<Theme, string> = { light: 'Açık tema', dark: 'Koyu tema' };

/** Çıktı rengi: yalnız siyah, beyaz ve gri. Hazır griler radyo grubu; özel değer onaltılık alanla. */
export function ColorField({ id, r, theme, onChange }: Props) {
  const name = useId();
  const value = r.c[theme];
  const [text, setText] = useState(value);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { setText(value); setError(null); }, [value]);
  const c = contrastInfo(r, id, theme);
  const bg = BG[theme].surface;
  const tones = theme === 'light' ? GRAYS.filter((g) => g <= 128) : GRAYS.filter((g) => g >= 128);

  return (
    <div className={classes.colorField}>
      <div className={classes.swatches} role="radiogroup" aria-label={`${THEME_LABEL[theme]} metin rengi`}>
        {tones.map((g) => {
          const hex = grayHex(g);
          return (
            <span key={g} className={classes.swatchItem}>
              <input
                type="radio" className={classes.swatchInput} id={`${name}-${g}`} name={name} value={hex}
                checked={hex === value} onChange={() => onChange(hex)}
              />
              <label htmlFor={`${name}-${g}`} className={classes.swatch} style={{ ['--sw' as string]: hex, ['--sw-bg' as string]: bg }}>
                <span className="gx-sr-only">{hex}</span>
              </label>
            </span>
          );
        })}
      </div>
      <TextInput
        size="sm" label="Onaltılık değer" value={text} error={error} aria-invalid={!!error}
        onChange={(e) => {
          const v = e.currentTarget.value;
          setText(v);
          const g = normalizeGray(v);
          if (g) { setError(null); onChange(g); } else setError('Yalnız gri: R = G = B (ör. #5c5c5c)');
        }}
        onBlur={() => { if (!normalizeGray(text)) { setText(value); setError(null); } }}
      />
      <p className={classes.contrast} data-pass={c.pass || undefined}>
        Kontrast {fmt(c.ratio, 2)}:1 · en zayıf zemin: {c.on} · gereken {fmt(c.need)}:1 · {c.pass ? (c.aaa ? 'AAA' : 'AA') : 'AA altında'}
      </p>
    </div>
  );
}
