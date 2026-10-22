import { phoneGeometry, phoneModel } from '../../core/hardware';
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { TIERS, tierOf, type Device } from '../../core';
import { fmt } from '../../core/util';
import { canvasVars } from './canvasVars';
import classes from './DeviceStage.module.scss';

const BEZEL: Record<Device['group'], { x: number; top: number; bottom: number; base: number; wide: number }> = {
  mobile: { x: 12, top: 30, bottom: 24, base: 0, wide: 0 },
  tablet: { x: 18, top: 18, bottom: 18, base: 0, wide: 0 },
  laptop: { x: 14, top: 14, bottom: 18, base: 18, wide: 0.07 },
  desktop: { x: 14, top: 14, bottom: 18, base: 120, wide: 0 },
};

interface Props {
  device: Device;
  width: number;
  height: number;
  landscape: boolean;
  zoom: 'fit' | 'actual';
  /** Ekran kabı (kaydırılan öğe); seçili öğeyi üste getirmek için. */
  onScreen?: (el: HTMLDivElement | null) => void;
  children: ReactNode;
  label?: string;
  theme: 'light' | 'dark';
  /** Dar tuvalde ekran yüksekliği içeriğe uyar; kaydırmayı tuval yapar (iç içe kaydırma yok). */
  autoHeight?: boolean;
}

/** Cihaz çerçevesi: ekran gerçek CSS genişliğinde yerleşir (kap sorguları doğru çalışır), çerçeve sahneye ölçeklenir. */
export function DeviceStage({ device, width, height, landscape, zoom, onScreen, children, label, theme, autoHeight }: Props) {
  const model=phoneModel(device.id);
  const adaptive=autoHeight && !model;
  const [contentH, setContentH] = useState(height);
  const stageRef = useRef<HTMLDivElement>(null);
  const [avail, setAvail] = useState({ w: 0, h: 0 });
  // Kullanılabilir alan: sahnenin iç kutusu (dolgu hariç). İçerik genişliği ölçüye karışmaz.
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return undefined;
    const measure = () => {
      const cs = getComputedStyle(el);
      const w = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const h = el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      setAvail((a) => (a.w === w && a.h === h ? a : { w, h }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const availW0 = avail.w;
  const availH0 = avail.h;
  const [screen, setScreen] = useState<HTMLDivElement | null>(null);
  useLayoutEffect(() => { onScreen?.(screen); }, [screen, onScreen]);
  // Otomatik yükseklikte ekran içeriği ölçülür (dönüşümden bağımsız offsetHeight).
  useLayoutEffect(() => {
    const first = screen?.firstElementChild as HTMLElement | null;
    if (!adaptive || !first) return undefined;
    const ro = new ResizeObserver(() => setContentH(first.offsetHeight));
    ro.observe(first);
    return () => ro.disconnect();
  }, [screen, adaptive]);

  const legacy=model?.profile==='classic' || device.id==='t768';
  const portraitBezel = device.id.startsWith('tv') ? {...BEZEL.desktop, x:10,top:10,bottom:22,base:32} : legacy ? {...BEZEL[device.group],x:14,top:64,bottom:76} : BEZEL[device.group];
  const b = model ? phoneGeometry(model,width,height,landscape) : landscape && (device.group==='mobile' || device.group==='tablet') ? {...portraitBezel,x:(portraitBezel.top+portraitBezel.bottom)/2,top:portraitBezel.x,bottom:portraitBezel.x} : portraitBezel;
  const profile=model?.profile??(device.id.startsWith('tv')?'tv':legacy?'classic':device.group);
  const shellStyle = { '--device-side': `${b.x}px`, '--device-top': `${b.top}px`, '--device-bottom': `${b.bottom}px`,...(model?{'--device-radius':`${model.corners.body}px`,'--device-home-size':`${model.homeDiameter??44}px`,'--screen-radius':`${model.corners.screen}px`,'--device-safe-top':`${landscape?0:model.safe.top}px`,'--device-safe-bottom':`${landscape?0:model.safe.bottom}px`,'--device-safe-left':`${landscape?model.safe.top:0}px`,'--device-safe-right':`${landscape?model.safe.bottom:0}px`,'--device-cutout-width':`${model.width*(model.id==='m375'?.32:.38)}px`}:{}) } as CSSProperties;
  const frameW = width + 2 * b.x;
  const screenH = adaptive ? Math.max(height, contentH) : height;
  const frameH = screenH + b.top + b.bottom;
  const extraX = Math.round(frameW * b.wide);
  const totalW = frameW + 2 * extraX;
  const totalH = frameH + b.base;
  const availW = Math.max(availW0 - 4, 120);
  const availH = Math.max(availH0 - 40, 120);
  const kW = Math.min(1, availW / totalW);
  // Dar sahnede yalnız genişliğe sığdırılır (sahne dikey kayar); genişte bütün çerçeve görünür, ölçek %50 altına inmez.
  const k = zoom === 'actual' ? 1 : autoHeight || availW < 600 ? kW : Math.min(kW, Math.max(availH / totalH, 0.5));
  const tier = TIERS.find((t) => t.id === tierOf(width))!;

  return (
    <div ref={stageRef} className={classes.stage} data-auto-height={autoHeight || undefined}>
      <p className={classes.readout}>
        {label ? `${label} · ` : ''}{device.name} · {width} × {height} CSS px{landscape ? ' · yatay' : ''} · {model ? `${fmt(model.bodyMm.width,1)} × ${fmt(model.bodyMm.height,1)} mm` : tier.label} · ölçek %{fmt(Math.round(k * 100), 0)}
      </p>
      <div className={classes.center}>
        <div className={classes.sizer} data-device-sizer style={{ width: totalW * k, height: totalH * k }}>
          <div className={classes.frame} style={{ transform: `translateX(${extraX * k}px) scale(${k})` }}>
            <div className={classes.device} data-model={model?.id} data-landscape={landscape || undefined} data-kind={device.group} data-profile={profile} style={shellStyle}>
              <span className={classes.sideKeys} aria-hidden="true"/><span className={classes.hardware} data-device-hardware aria-hidden="true"><span className={classes.camera}/><span className={classes.speaker}/></span>
              {model && model.profile!=='classic' && <span className={classes.homeIndicator} aria-hidden="true" style={{bottom:b.bottom+8}}/>}
              <span className={classes.powerKey} aria-hidden="true"/>
              {legacy && <span className={classes.home} data-device-home aria-hidden="true" style={model?{bottom:(b.bottom-(model.homeDiameter??44))/2}:undefined}/>}
              <div
                className={classes.screen}
                style={{ ...canvasVars(theme), width, height: screenH }}
                role="region"
                aria-label={`Önizleme ekranı, ${width} piksel`}
              >
                <div ref={setScreen} className={classes.screenScroller} tabIndex={0} role="region" aria-label={`Kaydırılabilir ekran içeriği, ${width} piksel`}>{children}</div>
              </div>
              <span className={classes.screenInset} data-screen-depth aria-hidden="true" style={{left:b.x,top:b.top,width,height:screenH}}/>
            </div>
            {b.base > 0 && <div className={classes.base} data-kind={device.group} data-profile={profile} aria-hidden="true" />}
          </div>
        </div>
      </div>
    </div>
  );
}
