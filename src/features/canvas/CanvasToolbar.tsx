import { ActionIcon, Group, SegmentedControl, Select, Tabs, Tooltip } from '@mantine/core';
import {
  ArrowsInIcon, ArrowsOutIcon, CornersOutIcon, DeviceMobileIcon, DeviceRotateIcon, DeviceTabletIcon, LaptopIcon, MonitorIcon, MoonIcon, SunIcon,
} from '@phosphor-icons/react';
import { BASE_BP, DEVICES, DEVICE_GROUPS, GROUP_FIRST, deviceById, overriddenKeys, screenBreakpoints, type TierId } from '../../core';
import { useStudio } from '../../store/studio';
import { useStudioActions } from '../../app/actions';
import { useStudioSearch } from '../../app/useStudioSearch';
import type { View } from '../../app/search';
import { useUi } from '../../store/ui';
import classes from './CanvasToolbar.module.scss';

const GROUP_ICON: Record<TierId, typeof LaptopIcon> = { mobile: DeviceMobileIcon, tablet: DeviceTabletIcon, laptop: LaptopIcon, desktop: MonitorIcon };
/** Her grupta ilk açılan cihaz. */
const GROUP_DEFAULT = GROUP_FIRST;

export function CanvasToolbar() {
  const [search, setSearch] = useStudioSearch();
  const a = useStudioActions();
  const zoom = useUi((s) => s.zoom);
  const d = deviceById(search.device);
  const rotatable = d.group === 'mobile' || d.group === 'tablet';
  // Seçili türün değiştirildiği kırılımlar listede işaretlenir (320 = temel).
  const decisions = useStudio((s) => s.decisions);
  const marked = new Set(screenBreakpoints(decisions, search.ctx, search.role));
  if (overriddenKeys(decisions, search.ctx, search.role).length) marked.add(BASE_BP);

  return (
    <div className={classes.bar} data-tour="canvas-toolbar">
      <Tabs value={search.view} onChange={(v) => v && setSearch({ view: v as View })} className={classes.tabs} variant="default">
        <Tabs.List aria-label="Tuval görünümü">
          <Tabs.Tab value="page">Sayfa</Tabs.Tab>
          <Tabs.Tab value="lines">Satır testi</Tabs.Tab>
          <Tabs.Tab value="scale">Tip ölçeği</Tabs.Tab>
        </Tabs.List>
      </Tabs>
      <div className={classes.devices}>
        <SegmentedControl
          size="sm" aria-label="Cihaz grubu" value={d.group}
          onChange={(g) => setSearch({ device: GROUP_DEFAULT[g as TierId] })}
          data={DEVICE_GROUPS.map((g) => {
            const Icon = GROUP_ICON[g.id];
            return { value: g.id, label: <Group gap={6} wrap="nowrap"><Icon size={18} aria-hidden="true" /><span className={classes.groupText}>{g.label}</span></Group> };
          })}
        />
        <Select
          className={classes.bp} size="sm" aria-label="Kırılım"
          value={search.device} onChange={(v) => v && setSearch({ device: v })}
          data={DEVICE_GROUPS.map((g) => ({ group: g.label, items: DEVICES.filter((x) => x.group === g.id).map((x) => ({ value: x.id, label: `${x.w} px · ${x.name}` })) }))}
          maxDropdownHeight={360}
          renderOption={({ option }) => {
            const w = deviceById(option.value).w;
            return (
              <span className={classes.bpOption}>
                <span>{option.label}</span>
                {marked.has(w) && <span className={classes.bpMark}>{w === BASE_BP ? 'temel · değişti' : 'değişti'}</span>}
              </span>
            );
          }}
        />
        <Group gap={2} wrap="nowrap">
          <Tooltip label={rotatable ? (search.orient === 'landscape' ? 'Dikey' : 'Yatay') : 'Yön yalnız mobil ve tablette'}>
            <ActionIcon
              aria-label={search.orient === 'landscape' ? 'Dikey yöne çevir' : 'Yatay yöne çevir'}
              aria-pressed={rotatable && search.orient === 'landscape'}
              disabled={!rotatable}
              onClick={() => setSearch({ orient: search.orient === 'landscape' ? 'portrait' : 'landscape' })}
            >
              <DeviceRotateIcon size={20} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label={search.theme === 'dark' ? 'Tuval: açık' : 'Tuval: koyu'}>
            <ActionIcon aria-label={search.theme === 'dark' ? 'Tuvali açık temaya al' : 'Tuvali koyu temaya al'} onClick={a.toggleCanvasTheme}>
              {search.theme === 'dark' ? <SunIcon size={20} /> : <MoonIcon size={20} />}
            </ActionIcon>
          </Tooltip>
          <Tooltip label={zoom === 'fit' ? 'Gerçek boyut (%100)' : 'Sahneye sığdır'}>
            <ActionIcon aria-label={zoom === 'fit' ? 'Gerçek boyuta geç' : 'Sahneye sığdır'} onClick={() => useUi.getState().set({ zoom: zoom === 'fit' ? 'actual' : 'fit' })}>
              {zoom === 'fit' ? <ArrowsOutIcon size={20} /> : <ArrowsInIcon size={20} />}
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Önizle: yalnız sonuç, tam ekran">
            <ActionIcon aria-label="Önizlemeyi tam ekran aç" onClick={a.openFullscreen} data-fullscreen-trigger>
              <CornersOutIcon size={20} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </div>
    </div>
  );
}
