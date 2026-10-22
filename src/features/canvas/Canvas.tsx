import { SegmentedControl, Select, Splitter, Switch } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CONTEXTS, ROLE, contextLabel, defaultDecisions, deviceDims, hasRole, resolveContextAt, rolesOf,
  type ContextId, type Decisions,
} from '../../core';
import { useStudioActions } from '../../app/actions';
import { useStudioSearch } from '../../app/useStudioSearch';
import { useStudio } from '../../store/studio';
import { useUi, type CompareWith } from '../../store/ui';
import { DeviceStage } from './DeviceStage';
import { hardwareModel } from '../../core/hardware';
import { LinesView } from './LinesView';
import { PageView } from './PageView';
import { PreviewSurface } from './PreviewSurface';
import { ScaleView } from './ScaleView';
import { CanvasToolbar } from './CanvasToolbar';
import { SelectedStrip } from './SelectedStrip';
import { ROLE_CSS } from './roleStyle';
import classes from './Canvas.module.scss';

const DEFAULTS = defaultDecisions();

interface PaneProps {
  decisions: Decisions;
  ctx: ContextId;
  prefix: string;
  label?: string;
  primary?: boolean;
  flow: boolean;
}

function ViewPane({ decisions, ctx, prefix, label, primary, flow }: PaneProps) {
  const [search] = useStudioSearch();
  const { selectRole } = useStudioActions();
  const zoom = useUi((s) => s.zoom);
  const linesScope = useUi((s) => s.linesScope);
  const guides = useUi((s) => s.guides);
  const [screen, setScreen] = useState<HTMLDivElement | null>(null);
  const [rootEl, setRootEl] = useState<HTMLElement | null>(null);
  const dims = deviceDims(search.device, search.orient);
  const expanded = flow && !hardwareModel(dims.d.id);
  const resolved = useMemo(() => resolveContextAt(decisions, ctx, dims.w), [decisions, ctx, dims.w]);
  const settings = decisions.contexts[ctx].settings;
  const selected = hasRole(ctx, search.role) ? search.role : 'h1';
  const onPick = useCallback((id: string) => selectRole(id, primary ? ctx : search.ctx), [selectRole, primary, ctx, search.ctx]);
  const onOverflow = useCallback((o: boolean) => { if (primary && useUi.getState().overflow !== o) useUi.getState().set({ overflow: o }); }, [primary]);

  useEffect(() => { setRootEl(document.querySelector<HTMLElement>('[data-canvas-root]')); }, []);
  // Akışta tuval kökü kayar ve yapışık şerit üstü kaplar: seçili öğe şeridin altına getirilir.
  const stripH = flow ? (document.querySelector<HTMLElement>('[data-tour="strip"]')?.offsetHeight ?? 0) : 0;

  if (search.view === 'page') {
    return (
      <DeviceStage
        device={dims.d} width={dims.w} height={dims.h} landscape={dims.land} zoom={zoom}
        onScreen={setScreen} label={label} theme={search.theme} autoHeight={flow}
      >
        <PreviewSurface ctx={ctx} resolved={resolved} settings={settings} width={dims.w} theme={search.theme}>
          <PageView
            ctx={ctx} selected={selected} resolved={resolved} prefix={prefix}
            scroller={expanded ? rootEl : screen} scrollOffset={expanded ? stripH + 48 : 48} onPick={onPick} onOverflow={onOverflow} tagLabel={ROLE[selected].label}
          />
        </PreviewSurface>
      </DeviceStage>
    );
  }
  const ids = linesScope === 'role' ? [selected] : rolesOf(ctx).filter((r) => r.category === ROLE[selected].category).map((r) => r.id);
  return (
    <div className={classes.scrollView}>
      {search.view === 'lines' && primary && (
        <div className={classes.linesBar} style={{ maxWidth: dims.w }}>
          <SegmentedControl
            size="sm" aria-label="Satır testi kapsamı" value={linesScope}
            onChange={(v) => useUi.getState().set({ linesScope: v as 'role' | 'category' })}
            data={[{ value: 'role', label: 'Seçili tür' }, { value: 'category', label: 'Kategorideki türler' }]}
          />
          <Switch label="Satır şeritleri" checked={guides} onChange={(e) => useUi.getState().set({ guides: e.currentTarget.checked })} />
        </div>
      )}
      <PreviewSurface ctx={ctx} resolved={resolved} settings={settings} width={dims.w} theme={search.theme} className={classes.flat}>
        {search.view === 'lines'
          ? <LinesView ctx={ctx} ids={ids} resolved={resolved} settings={settings} width={dims.w} theme={search.theme} guides={guides} />
          : <ScaleView ctx={ctx} decisions={decisions} resolved={resolved} settings={settings} width={dims.w} selected={selected} onPick={onPick} />}
      </PreviewSurface>
    </div>
  );
}

export function Canvas() {
  const [search] = useStudioSearch();
  const decisions = useStudio((s) => s.decisions);
  const compare = useUi((s) => s.compare);
  const compareWith = useUi((s) => s.compareWith);
  const isLg = useMediaQuery('(min-width: 75em)', true);
  const flow = useMediaQuery('(max-width: 48em), (max-height: 600px)', false) ?? false;
  const splitRef = useRef<HTMLDivElement>(null);
  const otherCtx: ContextId = compareWith === 'default' ? search.ctx : compareWith;
  const otherDecisions = compareWith === 'default' ? DEFAULTS : decisions;

  useEffect(() => {
    splitRef.current?.querySelectorAll('[role="separator"]').forEach((h) => h.setAttribute('aria-label', 'Karşılaştırma bölmelerini boyutlandır'));
  });

  return (
    <div className={classes.root} data-flow={flow || undefined} data-canvas-root>
      <style>{ROLE_CSS}</style>
      <CanvasToolbar />
      <div className={classes.stickyStrip}><SelectedStrip showInspectorButton={!isLg} /></div>
      <div className={classes.body} data-tour="canvas">
        {compare && !flow ? (
          <Splitter ref={splitRef} className={classes.splitter} orientation="horizontal">
            <Splitter.Pane defaultSize={50} min={25}>
              <div className={classes.pane}>
                <div className={classes.paneHead}>
                  <span className={classes.paneTitle}>Karşılaştır:</span>
                  <Select
                    size="sm" aria-label="Karşılaştırılacak kaynak" value={compareWith} w={220}
                    onChange={(v) => v && useUi.getState().set({ compareWith: v as CompareWith })}
                    data={[{ value: 'default', label: `Varsayılan · ${contextLabel(search.ctx)}` }, ...CONTEXTS.filter((c) => c.id !== search.ctx).map((c) => ({ value: c.id, label: c.label }))]}
                  />
                </div>
                <ViewPane decisions={otherDecisions} ctx={otherCtx} prefix="cmp" label={compareWith === 'default' ? 'Varsayılan' : contextLabel(otherCtx)} flow={false} />
              </div>
            </Splitter.Pane>
            <Splitter.Pane defaultSize={50} min={25}>
              <div className={classes.pane}>
                <div className={classes.paneHead}><span className={classes.paneTitle}>Mevcut · {contextLabel(search.ctx)}</span></div>
                <ViewPane decisions={decisions} ctx={search.ctx} prefix="cur" label="Mevcut" primary flow={false} />
              </div>
            </Splitter.Pane>
          </Splitter>
        ) : (
          <ViewPane decisions={decisions} ctx={search.ctx} prefix="cur" primary flow={flow} />
        )}
      </div>
    </div>
  );
}
