import { Accordion, Button, Code, Menu, Select, SegmentedControl, Tooltip } from '@mantine/core';
import { CaretDownIcon, LockIcon, WarningIcon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import {
  recommendedRole, BREAKPOINTS, CATEGORIES, CHOICES, CLAMP_CHOICES, GROUP_BPS, HARD, LONG_READING_CONDITION, decisionAt, resolveAt, KIND_LABEL, RANGES, SIZE_MAX, TIERS, TIER_IDS, WEIGHT_NAME,
  BASE_BP, baseSource, changeCount, clearScreens, contextLabel, cssSize, cssTiers, deviceAtBreakpoint, isScreenKey, isTiers, layerOf, minSizeFor, noClamp,
  screenBreakpoints, screenSource, screensOf,
  relNominal, roleWarnings, tierOf, type PropKey, type RoleOverrides, type SizeMode, type TierId,
} from '../../core';
import { fmt, round } from '../../core/util';
import { useStudioActions } from '../../app/actions';
import { useCurrent } from '../../app/useCurrent';
import { useStudio } from '../../store/studio';
import { useUi } from '../../store/ui';
import { ColorField } from './ColorSection';
import { PropertyRow } from './PropertyRow';
import { SliderNumber } from './SliderNumber';
import { RecommendationMark, RecommendationNote } from '../recommendations/Recommendation';
import classes from './Inspector.module.scss';

const MODE_DATA: { value: SizeMode; label: string }[] = [
  { value: 'endpoints', label: 'İki uç · otomatik tam sayı' },
  { value: 'static', label: 'Sabit' },
  { value: 'tiers', label: 'Ekrana göre' },
  { value: 'fluid', label: 'Akışkan' },
  { value: 'relative', label: 'Göreli' },
];
const LAYER_LABEL = { base: 'Temel katman (HTML5)', inherited: 'Temelden devralıyor', override: 'Bu ürün türünde özelleştirildi' } as const;
const choice = <K extends keyof typeof CHOICES>(k: K) => CHOICES[k].map(([value, label]) => ({ value: value as string, label: label as string }));

export function Inspector() {
  const { ctx, id, def, r, decisions, settings, dims, search, bp } = useCurrent();
  const recommended=recommendedRole(ctx,id,dims.w);
  const recommendedText=(k:PropKey)=>{const target=(r.mode==="endpoints" && (k==="size" || k==="max"))?recommendedRole(ctx,id,k==="size"?BASE_BP:BREAKPOINTS[BREAKPOINTS.length-1]):recommended;const value=(r.mode==="endpoints" && k==="max")?target.size:target[k];if(k==='c')return `${recommended.c.light} / ${recommended.c.dark}`;if(value && typeof value==='object')return JSON.stringify(value);return String(value);};
  const store = useStudio.getState;
  const sections = useUi((s) => s.sections);
  const { resetRole, resetContext } = useStudioActions();
  const endpoints = r.mode === 'endpoints';
  const long = def.kind === 'long';
  const minSize = minSizeFor(id);
  const warnings = roleWarnings(r, settings, id, dims.w);
  const layer = layerOf(decisions, ctx, id);
  const nOverrides = changeCount(decisions, ctx, id);
  const isBase = bp === BASE_BP;
  const device = deviceAtBreakpoint(bp);
  const screenHere = Object.keys(screensOf(decisions, ctx, id)[String(bp)] ?? {}) as PropKey[];

  // Düzenleme seçili cihazın kırılımına yazılır (320 = temel, bütün ekranlara kalıtılır).
  const set = (patch: RoleOverrides, key: string = Object.keys(patch).join(',')) => store().override(ctx, id, patch, `${ctx}:${id}:${bp}:${key}`, dims.w);
  const row = (k: PropKey) => ({
    recommended: recommendedText(k),
    source: screenSource(decisions, ctx, id, k, endpoints && (k === 'size' || k === 'max') ? BASE_BP : dims.w),
    bp: endpoints && (k === 'size' || k === 'max') ? BASE_BP : bp,
    screenKey: isScreenKey(k) && !(endpoints && (k === 'size' || k === 'max')),
    parent: baseSource(ctx, id, k),
    // Renk, mod ve ekran sınıfı listesi kırılıma girmez: temel katmandan kaldırılır.
    onReset: () => store().resetProps(ctx, id, [k], isScreenKey(k) && !(endpoints && (k === 'size' || k === 'max')) ? dims.w : undefined),
  });
  const seg = (k: PropKey, data: { value: string; label: string }[], label: string, extra?: { disabled?: boolean }) => (
    <PropertyRow label={label} {...row(k)}>
      <SegmentedControl
        size="sm" fullWidth aria-label={label} data={data.map(option=>({...option,label:<span className={classes.recommendedChoice}>{option.label}{option.value===String(recommended[k]) && <RecommendationMark value={option.label}/>}</span>}))} disabled={extra?.disabled}
        value={String(r[k])} onChange={(v) => set({ [k]: k === 'clamp' ? Number(v) : v } as RoleOverrides)}
      />
    </PropertyRow>
  );
  const setEndpoint = (patch: RoleOverrides) => store().override(ctx, id, patch, `${ctx}:${id}:endpoints:${Object.keys(patch)}`);
  const activeTier = tierOf(dims.w);
  const productive = settings.set === 'productive';
  const css = isTiers(r) ? Object.entries(cssTiers(r)).map(([q, v]) => (q === 'base' ? `font-size: ${v};` : `${q} { font-size: ${v}; }`)).join('\n') : endpoints ? cssSize(r, settings, id) : `font-size: ${cssSize(r, settings, id)};`;

  const section = (value: string, title: string, children: ReactNode) => (
    <Accordion.Item value={value}>
      <Accordion.Control>{title}</Accordion.Control>
      <Accordion.Panel><div className={classes.panel}>{children}</div></Accordion.Panel>
    </Accordion.Item>
  );

  return (
    <aside className={classes.root} aria-label="Denetçi" data-tour="inspector">
      <header className={classes.head}>
        <p className={classes.eyebrow}>{contextLabel(ctx)} · {CATEGORIES.find((c) => c.id === def.category)?.label}{def.el ? ' · HTML5 elementi' : ''}</p>
        <h2 className={classes.title}>{def.label}</h2>
        <p className={classes.meta}>{KIND_LABEL[def.kind]}</p>
        {layer && <p className={classes.meta}>{LAYER_LABEL[layer]}</p>}
        <p className={classes.meta}>{def.src}</p>
        <div className={classes.screen} data-base={isBase || undefined}>
          <span className={classes.screenTitle}>{isBase ? `Temel ekran · ${BASE_BP} px` : `Ekran · ${bp} px · ${device.name}`}</span>
          <span className={classes.screenNote}>
            {endpoints ? 'İki uç bütün ekranlarda ortaktır; cihaz seçimi yalnız önizlemeyi değiştirir.' : isBase
              ? 'Buradaki ayarlar bütün ekranlara kalıtılır.'
              : `Değişiklik ${bp} px ve üstündeki ekranlara uygulanır; küçük ekranlar etkilenmez. Renk bütün ekranlarda aynıdır.`}
          </span>
        </div>
        <div className={classes.headActions}>
          <Button size="xs" variant="default" onClick={resetRole} disabled={!nOverrides}>
            Türü sıfırla{nOverrides ? ` (${nOverrides})` : ''}
          </Button>
          <Menu position="bottom-end">
            <Menu.Target>
              <Button size="xs" variant="subtle" color="gray" rightSection={<CaretDownIcon size={14} />}>Diğer</Button>
            </Menu.Target>
            <Menu.Dropdown>
              {!isBase && (
                <Menu.Item disabled={!screenHere.length} onClick={() => store().resetProps(ctx, id, screenHere, dims.w)}>
                  Bu ekrandaki değişiklikleri kaldır ({bp} px)
                </Menu.Item>
              )}
              <Menu.Item disabled={!screenBreakpoints(decisions, ctx, id).length} onClick={() => store().change((d) => clearScreens(d, ctx, id))}>
                Bütün kırılım değişikliklerini kaldır
              </Menu.Item>
              <Menu.Item onClick={resetContext}>{contextLabel(ctx)} ürün türünü sıfırla</Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </div>
        {warnings.length > 0 && (
          <ul className={classes.warnings} aria-label="Uyarılar">
            {warnings.map((w) => (
              <li key={w.text}><WarningIcon size={16} aria-hidden="true" /> <span>{w.text}</span></li>
            ))}
          </ul>
        )}
      </header>

      <RecommendationNote/>
      <Accordion multiple value={sections} onChange={(v) => useUi.getState().set({ sections: v })} className={classes.accordion} chevronPosition="right">
        {section('size', 'Boyut', (
          <>
            {long && (
              <p className={classes.locked}><LockIcon size={16} aria-hidden="true" /> Uzun okuma {HARD.longReading} px sabit (kesin karar); boyut ve mod kilitli. Koşul: {LONG_READING_CONDITION}</p>
            )}
            <PropertyRow label="Boyut modu" {...row('mode')}>
              <Select
                size="sm" aria-label="Boyut modu" value={r.mode} disabled={long} allowDeselect={false}
                onChange={(v) => { if (v === 'endpoints') setEndpoint({ mode: 'endpoints', size: Math.round(r.size), max: Math.round(Math.max(r.size, r.max)) }); else if (v) set({ mode: v as SizeMode }); }}
                data={MODE_DATA.map((m) => ({ ...m, disabled: m.value === 'fluid' && productive }))}
              />
            </PropertyRow>
            {productive && r.mode === 'fluid' && <p className={classes.note}>Productive sette akışkanlık uygulanmaz; en küçük değer sabit kullanılır.</p>}
            {!isBase && <p className={classes.note}>Boyut modu bütün ekranlar için ortaktır.</p>}
            {!long && !endpoints && <Button variant="default" onClick={() => setEndpoint({ mode: 'endpoints', size: Math.round(r.size), max: Math.round(Math.max(r.size, r.max)) })}>Yalnız en küçük ve en büyük ekranı ayarla</Button>}
            {endpoints && <p className={classes.note}>320 px → {BREAKPOINTS[BREAKPOINTS.length - 1]} px. Yalnız iki boyut gir; ara cihazlar doğrusal hesaplanır ve tam sayıya yuvarlanır. Eski ara ekran boyutları bu modda kullanılmaz.</p>}
            {(r.mode === 'static' || r.mode === 'fluid' || endpoints) && (
              <PropertyRow label={endpoints ? '320 px ekranda boyut' : r.mode === 'fluid' ? 'En küçük boyut' : 'Boyut'} {...row('size')}>
                <SliderNumber
                  label={endpoints ? '320 px ekranda boyut' : r.mode === 'fluid' ? 'En küçük boyut' : 'Boyut'} value={r.size} min={minSize} max={SIZE_MAX} step={1} decimals={endpoints ? 0 : 1} unit="px"
                  disabled={long} onChange={(v) => endpoints ? setEndpoint({ size: v }) : set({ size: v })}
                  hint={decisionAt(id, dims.w) !== null ? `Karar (${bp} px): ${decisionAt(id, dims.w)} px · en az ${minSize} px` : `En az ${minSize} px`}
                />
              </PropertyRow>
            )}
            {r.mode === 'static' && !long && (
              <PropertyRow label="Ekranla büyüme" value={`×${fmt(r.gr, 2)}`} {...row('gr')}>
                <SliderNumber
                  label="Ekranla büyüme" value={r.gr} min={RANGES.gr.min} max={RANGES.gr.max} step={RANGES.gr.step} decimals={2} unit="×"
                  onChange={(v) => set({ gr: v })}
                  hint={`${GROUP_BPS.map((w) => `${w}: ${fmt(resolveAt(decisions, ctx, id, w).size)}`).join(' · ')} px. 320 → 1920 arası toplam çarpan (1 = sabit); her kırılım en yakın alt değerden genişlik oranıyla hesaplanır.`}
                />
              </PropertyRow>
            )}
            {endpoints && <PropertyRow label={`${BREAKPOINTS[BREAKPOINTS.length - 1]} px ekranda boyut`} {...row('max')}><SliderNumber label="En büyük ekranda boyut" value={r.max} min={r.size} max={160} step={1} decimals={0} unit="px" onChange={(v) => setEndpoint({ max: v })} /></PropertyRow>}
            {r.mode === 'fluid' && (
              <>
                <PropertyRow label="En büyük boyut" {...row('max')}>
                  <SliderNumber label="En büyük boyut" value={Math.max(r.max, r.size)} min={r.size} max={160} step={1} decimals={1} unit="px" onChange={(v) => set({ max: v })} />
                </PropertyRow>
                <div className={classes.subPanel}>
                  <p className={classes.subTitle}>{contextLabel(ctx)} akışkanlık ayarları · bütün ürün türünü etkiler</p>
                  <SegmentedControl
                    size="sm" fullWidth aria-label="Akışkanlık tabanı" value={settings.basis}
                    onChange={(v) => store().setSettings(ctx, { basis: v as 'viewport' | 'container' })}
                    data={[{ value: 'viewport', label: 'Ekran (vw)' }, { value: 'container', label: 'Kap (cqi)' }]}
                  />
                  <span className={classes.rowLabel}>Başlangıç genişliği (en küçük boyut)</span>
                  <SliderNumber label="Başlangıç genişliği" value={settings.minW} min={240} max={1200} step={8} unit="px" onChange={(v) => store().setSettings(ctx, { minW: v }, `${ctx}:minW`)} />
                  <span className={classes.rowLabel}>Bitiş genişliği (en büyük boyut)</span>
                  <SliderNumber label="Bitiş genişliği" value={settings.maxW} min={settings.minW + 80} max={2560} step={8} unit="px" onChange={(v) => store().setSettings(ctx, { maxW: v }, `${ctx}:maxW`)} />
                </div>
              </>
            )}
            {r.mode === 'tiers' && r.sizes && (
              <PropertyRow label="Ekran sınıfına göre boyut" {...row('sizes')}>
                <div className={classes.tiers}>
                  {TIERS.map((t) => (
                    <div key={t.id} className={classes.tier} data-active={t.id === activeTier || undefined}>
                      <span className={classes.tierLabel}>{t.label} <span className={classes.tierRange}>{t.range}</span>{t.id === activeTier ? ' · bu ekran' : ''}</span>
                      <SliderNumber
                        label={`${t.label} boyutu`} value={r.sizes![t.id]} min={minSize} max={SIZE_MAX} step={1} decimals={1} unit="px"
                        onChange={(v) => set({ sizes: { ...r.sizes!, [t.id]: v } as Record<TierId, number> }, `sizes:${t.id}`)}
                      />
                    </div>
                  ))}
                  <Button size="xs" variant="subtle" color="gray" onClick={() => set({ sizes: Object.fromEntries(TIER_IDS.map((t) => [t, r.size])) as Record<TierId, number> })}>
                    Hepsini {fmt(r.size)} px yap
                  </Button>
                </div>
              </PropertyRow>
            )}
            {r.mode === 'relative' && (
              <PropertyRow label="Üst öğeye göre" {...row('em')}>
                <SliderNumber
                  label="Üst öğeye göre" value={r.em} min={RANGES.em.min} max={RANGES.em.max} step={RANGES.em.step} decimals={3} unit="em"
                  onChange={(v) => set({ em: v })} hint={`16 px üst öğede ${fmt(relNominal(id, r))} px · en az ${minSize} px`}
                />
              </PropertyRow>
            )}
            <Code block className={classes.code}>{css}</Code>
          </>
        ))}

        {section('type', 'Ağırlık ve yazı tipi', (
          <>
            <PropertyRow label="Ağırlık" value={`${r.w} · ${WEIGHT_NAME[r.w]}`} {...row('w')}>
              <SliderNumber label="Ağırlık" value={r.w} min={RANGES.w.min} max={RANGES.w.max} step={RANGES.w.step} onChange={(v) => set({ w: v })} />
            </PropertyRow>
            {seg('ff', choice('ff'), 'Yazı tipi')}
            {seg('fst', choice('fst'), 'Stil')}
          </>
        ))}

        {section('spacing', 'Aralıklar', (
          <>
            <PropertyRow label="Satır yüksekliği" value={`${fmt(round(r.size * r.lh, 1))} px`} {...row('lh')}>
              <SliderNumber label="Satır yüksekliği" value={r.lh} min={RANGES.lh.min} max={RANGES.lh.max} step={RANGES.lh.step} decimals={2} unit="×" onChange={(v) => set({ lh: v })} />
            </PropertyRow>
            <PropertyRow label="Harf aralığı" {...row('ls')}>
              <SliderNumber label="Harf aralığı" value={r.ls} min={RANGES.ls.min} max={RANGES.ls.max} step={RANGES.ls.step} decimals={3} unit="em" onChange={(v) => set({ ls: v })} />
            </PropertyRow>
            <PropertyRow label="Kelime aralığı" {...row('ws')}>
              <SliderNumber label="Kelime aralığı" value={r.ws} min={RANGES.ws.min} max={RANGES.ws.max} step={RANGES.ws.step} decimals={2} unit="em" onChange={(v) => set({ ws: v })} />
            </PropertyRow>
            <PropertyRow label="Satır uzunluğu" value={r.mw ? `${r.mw} karakter` : 'Sınırsız'} {...row('mw')}>
              <SliderNumber label="Satır uzunluğu" value={r.mw} min={RANGES.mw.min} max={RANGES.mw.max} step={RANGES.mw.step} unit="ch" onChange={(v) => set({ mw: v })} hint="0 = sınırsız" />
            </PropertyRow>
            <PropertyRow label="Önce boşluk" {...row('mt')}>
              <SliderNumber label="Önce boşluk" value={r.mt} min={RANGES.mt.min} max={RANGES.mt.max} step={RANGES.mt.step} decimals={2} unit="em" onChange={(v) => set({ mt: v })} />
            </PropertyRow>
            <PropertyRow label="Sonra boşluk" {...row('mb')}>
              <SliderNumber label="Sonra boşluk" value={r.mb} min={RANGES.mb.min} max={RANGES.mb.max} step={RANGES.mb.step} decimals={2} unit="em" onChange={(v) => set({ mb: v })} />
            </PropertyRow>
          </>
        ))}

        {section('format', 'Biçim', (
          <>
            {seg('tt', choice('tt'), 'Büyük/küçük harf')}
            {seg('td', choice('td'), 'Çizgi')}
            {seg('num', choice('num'), 'Rakamlar')}
            {seg('ta', choice('ta'), 'Hizalama')}
            {seg('wrap', choice('wrap'), 'Satır kırma')}
            <Tooltip label="Bu türde satır sınırı yapıyı bozar" disabled={!noClamp(id)}>
              <div>{seg('clamp', CLAMP_CHOICES.map((n) => ({ value: String(n), label: n ? String(n) : 'Yok' })), 'Satır sınırı', { disabled: noClamp(id) })}</div>
            </Tooltip>
          </>
        ))}

        {section('color', 'Renk', (
          <>
            <p className={classes.note}>Çıktı rengi yalnız siyah, beyaz ve gri. Renk kırılıma girmez: bütün ekranlarda aynıdır; açık ve koyu ayrı ayarlanır. Tuval şu an {search.theme === 'dark' ? 'koyu' : 'açık'} temada.</p>
            {(['light', 'dark'] as const).map((t) => (
              <PropertyRow key={t} label={t === 'light' ? 'Açık tema' : 'Koyu tema'} value={r.c[t]} {...row('c')}>
                <ColorField recommended={recommended.c[t]} id={id} r={r} theme={t} onChange={(hex) => set({ c: { ...r.c, [t]: hex } }, `c:${t}`)} />
              </PropertyRow>
            ))}
          </>
        ))}
      </Accordion>
    </aside>
  );
}
