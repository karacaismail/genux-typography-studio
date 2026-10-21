import { TextInput } from '@mantine/core';
import { useEffect, useId, useState, type CSSProperties } from 'react';
import { COLOR_TOKENS } from '../../theme/tokens';
import { BG, GRAYS, contrast, isLargeText, contrastInfo, grayHex, normalizeGray, type RoleProps, type Theme } from '../../core';
import { fmt } from '../../core/util';
import { RecommendationMark } from '../recommendations/Recommendation';
import { FieldEvidence,type FieldSource } from '../recommendations/FieldEvidence';
import classes from './Inspector.module.scss';

interface Props {
  recommended?: string;
  backgrounds?: string[];
  source?:FieldSource;
  id: string;
  r: RoleProps;
  theme: Theme;
  onChange: (hex: string) => void;
}

const THEME_LABEL: Record<Theme, string> = { light: 'Açık tema', dark: 'Koyu tema' };

/** Çıktı rengi: yalnız siyah, beyaz ve gri. Hazır griler radyo grubu; özel değer onaltılık alanla. */
export function ColorField({ id, r, theme, onChange, recommended, backgrounds, source }: Props) {
  const name = useId();
  const value = r.c[theme];
  const [text, setText] = useState(value);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { setText(value); setError(null); }, [value]);
  const standard = contrastInfo(r, id, theme);
  const ratio = backgrounds?.length ? Math.min(...backgrounds.map(bg=>contrast(r.c[theme],bg))) : standard.ratio;
  const need = backgrounds?.length ? (isLargeText(r.size,r.w)?3:4.5) : standard.need;
  const c = backgrounds?.length ? {ratio,need,on:'politika zeminleri',pass:ratio>=need,aaa:ratio>=(need===3?4.5:7)} : standard;
  const bg = BG[theme].surface;
  const tones = theme === 'light' ? GRAYS.filter((g) => g <= 128) : GRAYS.filter((g) => g >= 128);

  return (
    <div className={classes.colorField} data-output-theme={theme} style={Object.fromEntries(Object.entries(COLOR_TOKENS[theme]).map(([key,value])=>[`--gx-${key}`,value])) as CSSProperties}>
      <span>{THEME_LABEL[theme]}</span><FieldEvidence source={source}/>
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
              {hex===recommended && <span className={classes.recommendedSwatch}><RecommendationMark value={hex}/></span>}
            </span>
          );
        })}
      </div>
      <TextInput
        styles={{input:{background:"var(--gx-surface)",color:"var(--gx-text)",borderColor:"var(--gx-line-field)"},label:{color:"var(--gx-text)"},error:{color:"var(--gx-warn)"}}}
        size="sm" aria-label="Onaltılık değer" label={<span>Onaltılık değer{recommended && !tones.some(g=>grayHex(g)===recommended) && <RecommendationMark value={recommended}/>}</span>} value={text} error={error} aria-invalid={!!error}
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
