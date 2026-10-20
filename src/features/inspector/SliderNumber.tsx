import { Slider, TextInput } from '@mantine/core';
import { useEffect, useId, useState } from 'react';
import { clampNum, fmt, parseNum, round } from '../../core/util';
import classes from './Inspector.module.scss';

export interface SliderNumberProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  decimals?: number;
  unit?: string;
  disabled?: boolean;
  /** Sürükleme sırasında da çağrılır; geçmiş gruplaması çağıranın grup anahtarıyla yapılır. */
  onChange: (value: number) => void;
  /** Sayı alanında gösterilecek ek bilgi (ör. px karşılığı). */
  hint?: string;
}

/** Kaydırıcı + sayı alanı. Virgül ondalık ayırıcıdır; aralık dışı değer uygulanmaz ve hata gösterilir;
 *  alan bırakılınca en yakın geçerli değere döner. */
export function SliderNumber({ label, value, min, max, step, decimals = 0, unit, disabled, onChange, hint }: SliderNumberProps) {
  const id = useId();
  const show = (v: number) => fmt(round(v, decimals), decimals);
  const [text, setText] = useState(show(value));
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  // Dışarıdan gelen değer (kaydırıcı, geri al) alan düzenlenmiyorken metne yansır.
  useEffect(() => { if (!editing) { setText(show(value)); setError(null); } }, [value, editing]);

  // Yazılan değerin hassasiyeti: kaydırıcı adımı 1'den büyükse adım (ör. ağırlık 100), değilse ondalık basamak.
  const quantum = step > 1 ? step : 10 ** -decimals;
  const snap = (v: number) => round(clampNum(Math.round((v - min) / quantum) * quantum + min, min, max), Math.max(decimals, 3));
  const typed = (raw: string) => {
    setText(raw);
    const n = parseNum(raw);
    if (n === null) { setError('Sayı girin'); return; }
    if (n < min || n > max) { setError(`${show(min)}–${show(max)}${unit ? ` ${unit}` : ''} arası`); return; }
    if (step > 1 && (n - min) % step !== 0) { setError(`${show(step)} adımla`); return; }
    setError(null);
    onChange(round(n, Math.max(decimals, 3)));
  };
  // Enter değeri uygular ama alan odakta kaldığı için düzenleme sürer (yazılan metin yeniden biçimlenmez).
  const commit = (stillEditing = false) => {
    if (!stillEditing) setEditing(false);
    const n = parseNum(text);
    const v = n === null ? value : snap(n);
    if (v !== value) onChange(v);
    setText(show(v));
    setError(null);
  };

  return (
    <div className={classes.sliderNumber}>
      <Slider
        className={classes.slider}
        value={clampNum(value, min, max)} min={min} max={max} step={step}
        onChange={(v) => onChange(round(v, Math.max(decimals, 3)))}
        disabled={disabled} label={null} thumbLabel={label} size="sm"
        aria-describedby={hint ? `${id}-hint` : undefined}
      />
      <TextInput
        className={classes.numberField}
        size="sm" inputMode="decimal" aria-label={`${label} değeri${unit ? ` (${unit})` : ''}`}
        value={text} disabled={disabled} error={error} aria-invalid={!!error}
        rightSection={unit ? <span className={classes.unit}>{unit}</span> : null} rightSectionWidth={unit ? 36 : undefined}
        onFocus={() => setEditing(true)}
        onChange={(e) => typed(e.currentTarget.value)}
        onBlur={() => commit()}
        onKeyDown={(e) => { if (e.key === 'Enter') { commit(true); (e.currentTarget as HTMLInputElement).select(); } }}
      />
      {hint && <span id={`${id}-hint`} className={classes.hint}>{hint}</span>}
    </div>
  );
}
