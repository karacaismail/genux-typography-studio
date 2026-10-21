import { sizeAt, type ContextSettings, type RoleProps, type Theme } from '../../core';
import { canvasVars } from '../canvas/canvasVars';
import { LINE_SAMPLES } from './lineSamples';
import { NearLineTest } from './NearLineTest';
import { workflowRoleStyle } from './roleStyle';
import classes from './DeviceLineTests.module.scss';

export interface DeviceLineTestsProps {
  id: string;
  r: RoleProps;
  settings: ContextSettings;
  width: number;
  scheme: Theme;
  variant?: 'compact' | 'matrix';
}

/** Device contents own scrolling; samples never change the stored role colors. */
export function DeviceLineTests({ variant = 'compact', ...props }: DeviceLineTestsProps) {
  if (variant === 'compact') return <NearLineTest {...props} inDevice />;

  const { id, r, settings, width, scheme } = props;
  const px = Math.round(sizeAt(r, settings, id, width));
  const line = px * r.lh;
  return (
    <section className={classes.root} style={canvasVars(scheme)} data-theme={scheme} data-testid="device-line-matrix" aria-label="Satır testi · 1 / 2 / 5 satır">
      <strong className={classes.heading}>Satır testi · 1 / 2 / 5 satır</strong>
      <p className={classes.readout}>Satır kutusu: {px} × {r.lh} = {Math.round(line * 10) / 10} px. Uzun cümleler ekran genişliğine göre sarılır.</p>
      {[1, 2, 5].map((count) => (
        <div key={count} className={classes.matrixSample}>
          <span className={classes.label}>{count} satır</span>
          <div className={classes.sample} tabIndex={0} role="region" aria-label={`${count} satır testi metni`} data-testid={`device-line-sample-${count}`} style={{
            ...workflowRoleStyle(r, settings, id, width, scheme),
            margin: 0,
            backgroundImage: 'repeating-linear-gradient(to bottom, var(--canvas-guide) 0, var(--canvas-guide) 1em, transparent 1em, transparent 100%)',
            backgroundSize: `100% ${line}px`,
          }}>
            {LINE_SAMPLES[count].map((text) => <div key={text}>{text}{' '}</div>)}
          </div>
        </div>
      ))}
    </section>
  );
}
