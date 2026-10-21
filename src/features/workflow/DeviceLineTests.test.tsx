import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { defaultDecisions, ROLE, type RoleProps } from '../../core';
import { renderUi } from '../../test/render';
import { CANVAS_TOKENS } from '../../theme/tokens';
import { DeviceLineTests } from './DeviceLineTests';
import { LINE_SAMPLES } from './lineSamples';
import { NearLineTest } from './NearLineTest';
import { workflowRoleStyle } from './roleStyle';

const settings = defaultDecisions().contexts.html.settings;
const r: RoleProps = { ...ROLE.h1.def, w: 700, lh: 1.75, c: { light: '#444444', dark: '#bbbbbb' } };
const props = { id: 'h1', r, settings, width: 320, scheme: 'dark' as const };

describe('in-device line simulations', () => {
  it('uses preview theme in compact mode, keeps role metrics and switches real sentences', () => {
    renderUi(<DeviceLineTests {...props} />);
    const region = screen.getByRole('region', { name: 'Satır yüksekliği canlı testi' });
    expect(region.style.getPropertyValue('--canvas')).toBe(CANVAS_TOKENS.dark.canvas);
    const sample = screen.getByTestId('near-line-sample');
    const style = workflowRoleStyle(r, settings, props.id, props.width, props.scheme);
    expect(sample.style.fontSize).toBe(`${style.fontSize}px`);
    expect(sample.style.fontWeight).toBe('700');
    expect(sample.style.lineHeight).toBe('1.75');
    expect(sample.style.color).toBe('var(--canvas-text)');
    expect(sample.children).toHaveLength(2);
    fireEvent.click(screen.getByRole('radio', { name: '5 satır' }));
    expect(sample.children).toHaveLength(5);
    expect(sample).toHaveTextContent(LINE_SAMPLES[5][4]);
  });

  it('keeps distinct regions and stored matrix color when both variants share a device', () => {
    renderUi(<><DeviceLineTests {...props} /><DeviceLineTests {...props} variant="matrix" /></>);
    expect(screen.getByRole('region', { name: 'Satır yüksekliği canlı testi' })).toBeInTheDocument();
    const matrix = screen.getByRole('region', { name: 'Satır testi · 1 / 2 / 5 satır' });
    expect(matrix.style.getPropertyValue('--canvas')).toBe(CANVAS_TOKENS.dark.canvas);
    for (const count of [1, 2, 5]) {
      const sample = screen.getByTestId(`device-line-sample-${count}`);
      expect(sample.children).toHaveLength(count);
      expect(sample.style.color).toBe('rgb(187, 187, 187)');
      expect(sample.style.fontWeight).toBe('700');
      expect(sample.style.lineHeight).toBe('1.75');
    }
  });

  it('preserves interface theme for legacy out-of-device callers', () => {
    renderUi(<NearLineTest {...props} />);
    expect(screen.getByRole('region', { name: 'Satır yüksekliği canlı testi' }).style.getPropertyValue('--canvas')).toBe(CANVAS_TOKENS.light.canvas);
  });
});
