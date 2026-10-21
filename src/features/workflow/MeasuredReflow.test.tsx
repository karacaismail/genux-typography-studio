import { MantineProvider } from '@mantine/core';
import { theme } from '../../theme/theme';
import { act, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ROLE } from '../../core';
import { renderUi } from '../../test/render';
import { MeasuredReflow, measureRoleWords } from './MeasuredReflow';
const values={...ROLE.h1.def,size:40,ls:0,ws:0};
const fontDescriptor=Object.getOwnPropertyDescriptor(document,'fonts');
afterEach(()=>{vi.restoreAllMocks();if(fontDescriptor)Object.defineProperty(document,'fonts',fontDescriptor);else Reflect.deleteProperty(document,'fonts');});
const fonts=(ready:Promise<unknown>)=>Object.defineProperty(document,'fonts',{configurable:true,value:{ready}});
const canvas=(width=100)=>{
  const context={font:'original',measureText:vi.fn((_text:string)=>({width}))};
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D);
  return context;
};
describe('actual browser word measurement',()=>{
  it('uses real role words, stress spacing and an inclusive width minus 32 comparison',()=>{
    const context={font:'original',measureText:vi.fn((_text:string)=>({width:100}))};
    const r=measureRoleWords(values,'h1',320,context);
    expect(context.measureText.mock.calls.map(call=>call[0])).toEqual(ROLE.h1.sample.split(/\s+/));
    expect(r.maxWord).toBeCloseTo(100+('elementleri'.length-1)*.12*40);
    expect(r.available).toBe(288);expect(r.pass).toBe(true);expect(context.font).toBe('original');
    expect(measureRoleWords(values,'h1',r.maxWord+32,context).pass).toBe(true);
    expect(measureRoleWords(values,'h1',r.maxWord+31,context).pass).toBe(false);
  });
  it('awaits fonts before canvas work and explains the limited scope',async()=>{
    let ready!:()=>void;fonts(new Promise<void>(resolve=>{ready=resolve;}));const context=canvas();
    renderUi(<MeasuredReflow values={values} id="h1" width={320}/>);
    expect(screen.getByRole('status')).toHaveTextContent('fontlar bekleniyor');expect(context.measureText).not.toHaveBeenCalled();
    await act(async()=>ready());
    expect(screen.getByRole('status')).toHaveTextContent('Tarayıcı kelime ölçümü: sığıyor');
    expect(screen.getByRole('status')).toHaveTextContent('tam WCAG');
  });
  it.each(['null','throw','fonts'] as const)('reports unavailable rather than success when %s is unavailable',async(kind)=>{
    fonts(kind==='fonts'?Promise.reject(new Error('fonts unavailable')):Promise.resolve());
    if(kind==='throw')vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockImplementation(()=>{throw new Error('not implemented');});
    else vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null);
    renderUi(<MeasuredReflow values={values} id="h1" width={320}/>);
    await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent('kullanılamıyor'));
    expect(screen.getByRole('status')).not.toHaveTextContent('sığıyor');
  });
  it('remeasures font changes and cancels obsolete font waits',async()=>{
    let obsolete!:()=>void;fonts(new Promise<void>(resolve=>{obsolete=resolve;}));const context=canvas();
    const view=renderUi(<MeasuredReflow values={values} id="h1" width={320}/>);
    fonts(Promise.resolve());view.rerender(<MantineProvider theme={theme}><MeasuredReflow values={{...values,size:44,ff:'mono',tt:'uppercase'}} id="h1" width={64}/></MantineProvider>);
    await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent('taşma uyarısı'));
    const count=context.measureText.mock.calls.length;
    await act(async()=>obsolete());expect(context.measureText).toHaveBeenCalledTimes(count);
    expect(context.measureText.mock.calls.some(call=>call[0]==='ELEMENTLERİ')).toBe(true);
    view.unmount();
  });
});

it('keeps absent font APIs unknown and does not create a canvas',async()=>{
  Object.defineProperty(document,'fonts',{configurable:true,value:undefined});
  const getContext=vi.spyOn(HTMLCanvasElement.prototype,'getContext');
  renderUi(<MeasuredReflow values={values} id="h1" width={320}/>);
  await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent('sonuç bilinmiyor'));
  expect(getContext).not.toHaveBeenCalled();
});
it('does no canvas work after unmount and rejects invalid measured metrics',async()=>{
  let ready!:()=>void;fonts(new Promise<void>(resolve=>{ready=resolve;}));const context=canvas();
  const view=renderUi(<MeasuredReflow values={values} id="h1" width={320}/>);
  view.unmount();await act(async()=>ready());expect(context.measureText).not.toHaveBeenCalled();
  const bad={font:'original',measureText:()=>({width:NaN})};
  expect(()=>measureRoleWords(values,'h1',320,bad)).toThrow();expect(bad.font).toBe('original');
});
