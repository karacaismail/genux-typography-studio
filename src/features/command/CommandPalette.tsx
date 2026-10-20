import { Kbd } from '@mantine/core';
import { Spotlight, type SpotlightActionGroupData } from '@mantine/spotlight';
import { MagnifyingGlassIcon } from '@phosphor-icons/react';
import { useMemo } from 'react';
import { CATEGORIES, CONTEXTS, DEVICE_GROUPS, GROUP_FIRST, rolesOf, valueText } from '../../core';
import { useStudioActions } from '../../app/actions';
import { useCurrent } from '../../app/useCurrent';
import type { View } from '../../app/search';
import { useUi } from '../../store/ui';
import { MOTION } from '../../theme/tokens';
import { MOD } from './shortcuts';

const kb = (...k: string[]) => <span>{k.map((x) => <Kbd key={x} mr={4}>{x}</Kbd>)}</span>;

const GROUP_DEVICE = GROUP_FIRST;
const VIEW_LABEL: Record<View, string> = { page: 'Sayfa', lines: 'Satır testi', scale: 'Tip ölçeği' };

/** Komut paleti: tür seçimi, bağlam, görünüm, cihaz ve bütün araç eylemleri. */
export function CommandPalette({ onSave }: { onSave: () => void }) {
  const { ctx, resolved, settings } = useCurrent();
  const a = useStudioActions();

  const actions: SpotlightActionGroupData[] = useMemo(() => [
    {
      group: 'Eylemler',
      actions: [
        { id: 'undo', label: 'Geri al', onClick: a.undo, rightSection: kb(MOD, 'Z') },
        { id: 'redo', label: 'Yinele', onClick: a.redo, rightSection: kb(MOD, '⇧', 'Z') },
        { id: 'save', label: 'Hazır ayarı kaydet', onClick: onSave, rightSection: kb(MOD, 'S') },
        { id: 'export', label: 'JSON dışa aktar', onClick: a.openExport, rightSection: kb(MOD, 'E') },
        { id: 'import', label: 'JSON içe aktar', onClick: a.openImport, rightSection: kb(MOD, '⇧', 'O') },
        { id: 'compare', label: useUi.getState().compare ? 'Karşılaştırmayı kapat' : 'Karşılaştır', onClick: a.toggleCompare },
        { id: 'fullscreen', label: 'Önizlemeyi tam ekran aç', onClick: a.openFullscreen, rightSection: kb(MOD, 'Enter') },
        { id: 'checks', label: 'Kontrolleri aç', onClick: a.openChecks },
        { id: 'canvas-theme', label: 'Tuval temasını değiştir', onClick: a.toggleCanvasTheme },
        { id: 'app-theme', label: 'Arayüz temasını değiştir', onClick: a.toggleColorScheme },
        { id: 'reset-role', label: 'Seçili türü sıfırla', onClick: a.resetRole },
        { id: 'reset-ctx', label: 'Ürün türünü sıfırla', onClick: a.resetContext },
        { id: 'tour', label: 'Tanıtım turunu başlat', onClick: a.startTour },
      ],
    },
    { group: 'Ürün türü', actions: CONTEXTS.map((c) => ({ id: `ctx-${c.id}`, label: c.label, keywords: [c.name], description: [c.name !== c.label ? c.name : '', c.id === ctx ? 'Etkin' : ''].filter(Boolean).join(' · ') || undefined, onClick: () => a.setContext(c.id) })) },
    { group: 'Görünüm', actions: (Object.keys(VIEW_LABEL) as View[]).map((v) => ({ id: `view-${v}`, label: VIEW_LABEL[v], onClick: () => a.set({ view: v }) })) },
    { group: 'Cihaz', actions: DEVICE_GROUPS.map((g) => ({ id: `dev-${g.id}`, label: g.label, onClick: () => a.set({ device: GROUP_DEVICE[g.id] }) })) },
    ...CATEGORIES.map((c) => ({
      group: `Tür · ${c.label}`,
      actions: rolesOf(ctx).filter((r) => r.category === c.id).map((r) => ({
        id: `role-${r.id}`, label: r.label, description: `${valueText(resolved[r.id], settings)} px`, keywords: [r.id, r.group],
        onClick: () => a.selectRole(r.id),
      })),
    })).filter((g) => g.actions.length),
  ], [a, ctx, resolved, settings, onSave]);

  return (
    <Spotlight
      actions={actions}
      shortcut={['mod + K']}
      nothingFound="Eşleşen komut ya da tür yok"
      highlightQuery
      limit={40}
      scrollable
      maxHeight={480}
      transitionProps={{ duration: MOTION.base, timingFunction: MOTION.ease }}
      searchProps={{ leftSection: <MagnifyingGlassIcon size={18} />, placeholder: 'Komut ya da tür ara…', 'aria-label': 'Komut ya da tür ara' }}
    />
  );
}
