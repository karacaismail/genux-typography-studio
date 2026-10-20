import { ActionIcon, Burger, Button, Divider, Group, Kbd, Menu, SegmentedControl, Select, TextInput, Tooltip, useComputedColorScheme } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { modals } from '@mantine/modals';
import { spotlight } from '@mantine/spotlight';
import {
  ArrowClockwiseIcon, ArrowCounterClockwiseIcon, ColumnsIcon, CompassIcon, DotsThreeVerticalIcon, DownloadSimpleIcon,
  FloppyDiskIcon, MagnifyingGlassIcon, MoonIcon, SunIcon, TextAaIcon, UploadSimpleIcon,
} from '@phosphor-icons/react';
import { useState } from 'react';
import { CONTEXTS, defaultDecisions, type ContextId } from '../../core';
import { notifyUndoable, savePresetNow, useStudioActions } from '../../app/actions';
import { useStudioSearch } from '../../app/useStudioSearch';
import { listPresets, loadPreset } from '../../store/persist';
import { selectCanRedo, selectCanUndo, selectDirty, useStudio } from '../../store/studio';
import { useUi } from '../../store/ui';
import { MOD } from '../command/shortcuts';
import classes from './GlobalToolbar.module.scss';

const CTX_SELECT = CONTEXTS.map((c) => ({ value: c.id, label: c.label }));
const CTX_NAME = Object.fromEntries(CONTEXTS.map((c) => [c.id, c.name])) as Record<string, string>;
/** Görünen kısa ad; erişilebilir ad tam ad (kısa adı içerir, WCAG 2.5.3). Tam ad ipucunda. */
const CTX_SEGMENTS = CONTEXTS.map((c) => ({
  value: c.id,
  label: c.name === c.label ? c.label : (
    <Tooltip label={c.name} openDelay={400}>
      <span><span aria-hidden="true">{c.label}</span><span className="gx-sr-only">{c.name}</span></span>
    </Tooltip>
  ),
}));

export function GlobalToolbar() {
  const [search] = useStudioSearch();
  const a = useStudioActions();
  const canUndo = useStudio(selectCanUndo);
  const canRedo = useStudio(selectCanRedo);
  const dirty = useStudio(selectDirty);
  const presetName = useStudio((s) => s.presetName);
  const navOpen = useUi((s) => s.navOpen);
  const compare = useUi((s) => s.compare);
  const scheme = useComputedColorScheme('light');
  // Gezgin dar ya da kısa ekranda kapalıdır (Studio.tsx ile aynı koşul).
  const showBurger = useMediaQuery('(max-width: 47.99em), (max-height: 600px)', false);
  const [presets, setPresets] = useState(listPresets);

  const save = () => { savePresetNow(); setPresets(listPresets()); };
  const loadDefault = () => modals.openConfirmModal({
    title: 'GenUX kararlarına dön',
    children: 'Bütün ürün türlerindeki değişiklikler kaldırılır. Bu adım geri alınabilir.',
    labels: { confirm: 'Varsayılanı yükle', cancel: 'Vazgeç' },
    onConfirm: () => {
      useStudio.getState().replace(defaultDecisions());
      useStudio.getState().setPresetName('GenUX kararları');
      notifyUndoable('Varsayılan kararlar yüklendi');
    },
  });

  return (
    <Group className={classes.bar} wrap="nowrap" data-tour="toolbar">
      {showBurger && <Burger
        size="sm" opened={navOpen}
        onClick={() => useUi.getState().set({ navOpen: !navOpen })}
        aria-label={navOpen ? 'Tür gezginini kapat' : 'Tür gezginini aç'}
      />}
      <div className={classes.identity}>
        <span className={classes.mark} aria-hidden="true"><TextAaIcon size={18} weight="bold" /></span>
        <span className={classes.title}>
          <span className={classes.titleMain}>Typography Studio</span>
          <span className={classes.titleSub}>GenUX</span>
        </span>
      </div>
      <Divider orientation="vertical" visibleFrom="lg" my="md" color="var(--gx-line)" />
      <SegmentedControl
        visibleFrom="lg" size="sm" aria-label="Ürün türü" data={CTX_SEGMENTS}
        value={search.ctx} onChange={(v) => a.setContext(v as ContextId)}
      />
      <Select
        hiddenFrom="lg" className={classes.ctxSelect} aria-label="Ürün türü" data={CTX_SELECT}
        renderOption={({ option }) => (
          <span>{option.label}{CTX_NAME[option.value] !== option.label && <span className={classes.optionName}> · {CTX_NAME[option.value]}</span>}</span>
        )}
        value={search.ctx} onChange={(v) => v && a.setContext(v as ContextId)} size="sm"
      />
      <TextInput
        visibleFrom="xl" className={classes.preset} size="sm" aria-label="Hazır ayar adı"
        value={presetName} onChange={(e) => useStudio.getState().setPresetName(e.currentTarget.value)}
        rightSection={dirty ? <Tooltip label="Kaydedilmemiş değişiklik var"><span className={classes.dirty} role="img" aria-label="Kaydedilmemiş değişiklik var" /></Tooltip> : null}
      />
      <Group ml="auto" gap={4} wrap="nowrap">
        <Group gap={2} wrap="nowrap" visibleFrom="sm">
          <Tooltip label={<>Geri al <Kbd>{MOD}</Kbd> <Kbd>Z</Kbd></>}>
            <ActionIcon onClick={a.undo} disabled={!canUndo} aria-label="Geri al"><ArrowCounterClockwiseIcon size={20} /></ActionIcon>
          </Tooltip>
          <Tooltip label={<>Yinele <Kbd>{MOD}</Kbd> <Kbd>⇧</Kbd> <Kbd>Z</Kbd></>}>
            <ActionIcon onClick={a.redo} disabled={!canRedo} aria-label="Yinele"><ArrowClockwiseIcon size={20} /></ActionIcon>
          </Tooltip>
        </Group>
        <Button
          visibleFrom="lg" variant={compare ? 'light' : 'subtle'} color={compare ? 'accent' : 'gray'}
          leftSection={<ColumnsIcon size={18} />} onClick={a.toggleCompare} aria-pressed={compare}
        >
          Karşılaştır
        </Button>
        <Button visibleFrom="sm" leftSection={<FloppyDiskIcon size={18} />} onClick={save}>Kaydet</Button>
        <Button visibleFrom="sm" variant="filled" leftSection={<DownloadSimpleIcon size={18} />} onClick={a.openExport}>Dışa aktar</Button>
        <Tooltip label={scheme === 'dark' ? 'Açık arayüz' : 'Koyu arayüz'}>
          <ActionIcon visibleFrom="sm" onClick={a.toggleColorScheme} aria-label={scheme === 'dark' ? 'Açık arayüze geç' : 'Koyu arayüze geç'}>
            {scheme === 'dark' ? <SunIcon size={20} /> : <MoonIcon size={20} />}
          </ActionIcon>
        </Tooltip>
        <Tooltip label={<>Komutlar <Kbd>{MOD}</Kbd> <Kbd>K</Kbd></>}>
          <ActionIcon visibleFrom="xs" onClick={() => spotlight.open()} aria-label="Komut paletini aç" data-tour="command"><MagnifyingGlassIcon size={20} /></ActionIcon>
        </Tooltip>
        <Menu position="bottom-end" width={260}>
          <Menu.Target>
            <ActionIcon aria-label="Diğer işlemler"><DotsThreeVerticalIcon size={20} weight="bold" /></ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item hiddenFrom="xs" leftSection={<MagnifyingGlassIcon size={18} />} onClick={() => spotlight.open()}>Komut paleti</Menu.Item>
            <Menu.Item hiddenFrom="sm" leftSection={<ArrowCounterClockwiseIcon size={18} />} onClick={a.undo} disabled={!canUndo}>Geri al</Menu.Item>
            <Menu.Item hiddenFrom="sm" leftSection={<ArrowClockwiseIcon size={18} />} onClick={a.redo} disabled={!canRedo}>Yinele</Menu.Item>
            <Menu.Item hiddenFrom="lg" leftSection={<ColumnsIcon size={18} />} onClick={a.toggleCompare}>{compare ? 'Karşılaştırmayı kapat' : 'Karşılaştır'}</Menu.Item>
            <Menu.Item hiddenFrom="sm" leftSection={<FloppyDiskIcon size={18} />} onClick={save}>Kaydet</Menu.Item>
            <Menu.Item hiddenFrom="sm" leftSection={<DownloadSimpleIcon size={18} />} onClick={a.openExport}>Dışa aktar</Menu.Item>
            <Menu.Item leftSection={<UploadSimpleIcon size={18} />} onClick={a.openImport}>JSON içe aktar</Menu.Item>
            <Menu.Item hiddenFrom="sm" leftSection={scheme === 'dark' ? <SunIcon size={18} /> : <MoonIcon size={18} />} onClick={a.toggleColorScheme}>
              {scheme === 'dark' ? 'Açık arayüz' : 'Koyu arayüz'}
            </Menu.Item>
            <Menu.Divider />
            <Menu.Label>Hazır ayarlar</Menu.Label>
            <Menu.Item onClick={loadDefault}>GenUX kararları (varsayılan)</Menu.Item>
            {presets.map((p) => (
              <Menu.Item
                key={p.name}
                onClick={() => {
                  useStudio.getState().replace(loadPreset(p, useStudio.getState().decisions));
                  useStudio.getState().markSaved(p.name);
                  notifyUndoable(`“${p.name}” yüklendi`);
                }}
              >
                {p.name}
              </Menu.Item>
            ))}
            <Menu.Divider />
            <Menu.Item leftSection={<CompassIcon size={18} />} onClick={a.startTour}>Tanıtım turunu başlat</Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
    </Group>
  );
}
