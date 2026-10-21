import { Radio } from '@mantine/core';
import { useLayoutEffect, useRef, useState } from 'react';
import type { Device } from '../../core';
import classes from './Workflow.module.scss';

export function BreakpointChoice({devices,value,onChange}:{devices:Device[];value:string;onChange:(id:string)=>void}) {
  const parent=useRef<HTMLDivElement>(null);
  const targets=useRef(new Map<string,HTMLButtonElement>());
  const [rect,setRect]=useState({x:0,y:0,w:0,h:0});
  useLayoutEffect(()=>{
    const el=parent.current;
    if(!el)return;
    const measure=()=>{
      const target=targets.current.get(value);if(!target)return;
      const a=el.getBoundingClientRect();const b=target.getBoundingClientRect();
      const next={x:b.x-a.x,y:b.y-a.y,w:b.width,h:b.height};
      setRect(prev=>Object.keys(next).every(k=>prev[k as keyof typeof next]===next[k as keyof typeof next])?prev:next);
    };
    measure();const observer=new ResizeObserver(measure);observer.observe(el);
    targets.current.forEach(target=>observer.observe(target));
    return ()=>observer.disconnect();
  },[value,devices]);
  return <Radio.Group label="Alt kırılım" name="breakpoint" value={value} onChange={onChange} className={classes.breakpointPicker}>
    <div ref={parent} className={classes.breakpointOptions}>
      <div aria-hidden="true" className={classes.breakpointIndicator} data-ready={rect.w>0 || undefined} style={{width:rect.w,height:rect.h,transform:`translate(${rect.x}px, ${rect.y}px)`}}/>
      {devices.map(device=><div className={classes.breakpointItem} key={device.id}>
        <Radio.Card ref={el=>{if(el)targets.current.set(device.id,el);else targets.current.delete(device.id);}} value={device.id} tabIndex={device.id===value?0:-1} aria-label={`${device.w} px`} aria-describedby={`breakpoint-${device.id}`} className={classes.breakpointButton}>{device.w} px</Radio.Card>
        <span id={`breakpoint-${device.id}`} className={classes.breakpointCaption}>{device.name}</span>
      </div>)}
    </div>
  </Radio.Group>;
}
