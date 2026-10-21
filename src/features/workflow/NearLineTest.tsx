import { SegmentedControl, useComputedColorScheme } from '@mantine/core';
import { useState } from 'react';
import { sizeAt, type ContextSettings, type RoleProps, type Theme } from '../../core';
import { canvasVars } from '../canvas/canvasVars';
import { workflowRoleStyle } from './roleStyle';
import { LINE_SAMPLES } from './lineSamples';
import classes from './DeviceLineTests.module.scss';

export interface NearLineTestProps {
  id: string;
  r: RoleProps;
  settings: ContextSettings;
  width: number;
  scheme: Theme;
  inDevice?: boolean;
}

export function NearLineTest({ id, r, settings, width, scheme, inDevice = false }: NearLineTestProps) {
  const [count, setCount] = useState('2');
  const interfaceTheme = useComputedColorScheme('light');
  const theme = inDevice ? scheme : interfaceTheme;
  const px = Math.round(sizeAt(r, settings, id, width));
  const line = px * r.lh;
  return (
    <section className={classes.root} aria-label="Satır yüksekliği canlı testi" data-theme={theme} data-in-device={inDevice || undefined} style={canvasVars(theme)}>
      <div className={classes.head}>
        <strong>Satır testi</strong>
        <SegmentedControl className={classes.countControl} size="xs" aria-label="Canlı test satır sayısı" value={count} onChange={setCount} data={[{ value: '2', label: '2 satır' }, { value: '5', label: '5 satır' }]} />
      </div>
      <p className={classes.readout}>{px} px × {new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 3 }).format(r.lh)} = {new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(line)} px / satır</p>
      <div className={classes.sample} tabIndex={0} role="region" aria-label="Satır testi metni" data-testid="near-line-sample" style={{
        ...workflowRoleStyle(r, settings, id, width, scheme),
        margin: 0,
        color: 'var(--canvas-text)',
        maxWidth: 'none',
        backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0, transparent calc(100% - 1px), var(--canvas-stroke) calc(100% - 1px), var(--canvas-stroke) 100%)',
        backgroundSize: `100% ${line}px`,
      }}>
        {LINE_SAMPLES[Number(count)].map((text) => <div key={text}>{text}{' '}</div>)}
      </div>
    </section>
  );
}
