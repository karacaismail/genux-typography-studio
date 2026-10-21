import { createElement } from 'react';
import { MantineProvider } from '@mantine/core';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OrientationChoice } from './OrientationChoice';
import { orientedViewport, supportsOrientation } from './orientation';

afterEach(cleanup);

it('exposes labelled orientation radios and leaves the controlled value with the parent', () => {
  const onChange = vi.fn();
  const view = (value: 'portrait' | 'landscape') => createElement(MantineProvider, null,
    createElement(OrientationChoice, { value, onChange }));
  const { rerender } = render(view('portrait'));
  expect(screen.getByRole('radiogroup', { name: 'Önizleme yönü' })).toBeInTheDocument();
  expect(screen.getByRole('radio', { name: 'Dikey' })).toBeChecked();
  fireEvent.click(screen.getByRole('radio', { name: 'Yatay' }));
  expect(onChange).toHaveBeenCalledExactlyOnceWith('landscape');
  expect(screen.getByRole('radio', { name: 'Dikey' })).toBeChecked();
  rerender(view('landscape'));
  expect(screen.getByRole('radio', { name: 'Yatay' })).toBeChecked();
  fireEvent.click(screen.getByRole('radio', { name: 'Dikey' }));
  expect(onChange).toHaveBeenLastCalledWith('portrait');
});

describe('preview orientation', () => {
  it('supports only mobile and tablet groups or workflow families', () => {
    for (const family of ['mobile', 'tablet']) {
      expect(supportsOrientation(family)).toBe(true);
      expect(supportsOrientation({ group: family })).toBe(true);
      expect(supportsOrientation({ family })).toBe(true);
    }
    for (const family of ['laptop', 'desktop', 'tv', 'unknown']) {
      expect(supportsOrientation(family)).toBe(false);
      expect(supportsOrientation({ group: family })).toBe(false);
      expect(supportsOrientation({ family })).toBe(false);
    }
    expect(supportsOrientation({})).toBe(false);
    expect(supportsOrientation({ group: 'mobile', family: 'tv' })).toBe(false);
  });

  it.each(['mobile', 'tablet'])('swaps %s viewport without changing the source profile', (group) => {
    const device = Object.freeze({ id: 'preview', group, w: 320, h: 480 });
    expect(orientedViewport(device, 'portrait')).toEqual({ width: 320, height: 480, landscape: false });
    expect(orientedViewport(device, 'landscape')).toEqual({ width: 480, height: 320, landscape: true });
    expect(orientedViewport(device, 'portrait')).toEqual({ width: 320, height: 480, landscape: false });
    expect(device).toEqual({ id: 'preview', group, w: 320, h: 480 });
  });

  it('accepts family-only geometry and keeps unsupported profiles unchanged', () => {
    expect(orientedViewport({ family: 'tablet', w: 768, h: 1024 }, 'landscape'))
      .toEqual({ width: 1024, height: 768, landscape: true });
    for (const group of ['laptop', 'desktop', 'tv']) {
      expect(orientedViewport({ group, w: 1920, h: 1080 }, 'landscape'))
        .toEqual({ width: 1920, height: 1080, landscape: false });
    }
  });
});
