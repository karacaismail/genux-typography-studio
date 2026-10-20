import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ROLE } from '../../core';
import { renderUi } from '../../test/render';
import { ColorField } from './ColorSection';

describe('ColorField', () => {
  const r = ROLE.h1.def;
  it('renkli onaltılık değer reddedilir, gri kabul edilir', () => {
    const onChange = vi.fn();
    renderUi(<ColorField id="h1" r={r} theme="light" onChange={onChange} />);
    const field = screen.getByRole('textbox', { name: 'Onaltılık değer' });
    fireEvent.change(field, { target: { value: '#ff0000' } });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(/Yalnız gri/)).toBeInTheDocument();
    fireEvent.change(field, { target: { value: '#333' } });
    expect(onChange).toHaveBeenLastCalledWith('#333333');
  });
  it('kartela radyo grubudur ve seçim değeri bildirir', () => {
    const onChange = vi.fn();
    renderUi(<ColorField id="h1" r={r} theme="light" onChange={onChange} />);
    expect(screen.getByRole('radiogroup', { name: 'Açık tema metin rengi' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: '#808080' }));
    expect(onChange).toHaveBeenLastCalledWith('#808080');
  });
});
