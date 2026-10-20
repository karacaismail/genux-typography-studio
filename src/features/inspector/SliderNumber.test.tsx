import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderUi } from '../../test/render';
import { SliderNumber } from './SliderNumber';

const setup = (props: Partial<Parameters<typeof SliderNumber>[0]> = {}) => {
  const onChange = vi.fn();
  renderUi(<SliderNumber label="Boyut" value={16} min={16} max={120} step={1} decimals={1} unit="px" onChange={onChange} {...props} />);
  return { onChange, field: screen.getByRole('textbox', { name: 'Boyut değeri (px)' }) };
};

describe('SliderNumber', () => {
  it('virgül ondalık ayırıcıdır ve değer hemen uygulanır', () => {
    const { onChange, field } = setup();
    fireEvent.focus(field);
    fireEvent.change(field, { target: { value: '18,5' } });
    expect(onChange).toHaveBeenLastCalledWith(18.5);
  });
  it('aralık dışı değer uygulanmaz ve hata gösterir', () => {
    const { onChange, field } = setup();
    fireEvent.focus(field);
    fireEvent.change(field, { target: { value: '12' } });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText('16–120 px arası')).toBeInTheDocument();
    expect(field).toHaveAttribute('aria-invalid', 'true');
  });
  it('alan bırakılınca en yakın geçerli değere döner', () => {
    const { onChange, field } = setup();
    fireEvent.focus(field);
    fireEvent.change(field, { target: { value: '400' } });
    fireEvent.blur(field);
    expect(onChange).toHaveBeenLastCalledWith(120);
  });
  it('adımı 1\'den büyük alanda (ağırlık) adım dışı değer uygulanmaz', () => {
    const onChange = vi.fn();
    renderUi(<SliderNumber label="Ağırlık" value={400} min={100} max={900} step={100} onChange={onChange} />);
    const field = screen.getByRole('textbox', { name: 'Ağırlık değeri' });
    fireEvent.focus(field);
    fireEvent.change(field, { target: { value: '450' } });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText('100 adımla')).toBeInTheDocument();
  });
  it('sayı olmayan girdi hata gösterir', () => {
    const { onChange, field } = setup();
    fireEvent.focus(field);
    fireEvent.change(field, { target: { value: 'abc' } });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText('Sayı girin')).toBeInTheDocument();
  });
});
