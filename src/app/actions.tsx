import { Button, Group, Text } from '@mantine/core';
import { useMantineColorScheme } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useCallback, useMemo } from 'react';
import { ROLE, contextLabel, hasRole, type ContextId } from '../core';
import { savePreset } from '../store/persist';
import { useStudio } from '../store/studio';
import { useUi } from '../store/ui';
import type { StudioSearch } from './search';
import { useStudioSearch } from './useStudioSearch';

/** Geri alınabilir bir değişikliği bildirir; bildirimdeki düğme tek adımda geri alır. */
export function notifyUndoable(title: string, message?: string) {
  const id = `undo-${Date.now()}`;
  // Yalnız duyurulan adım hâlâ son adımsa geri alır; arada başka değişiklik olduysa yanlış adımı geri almaz.
  const depth = useStudio.getState().history.past.length;
  notifications.show({
    id,
    title,
    message: (
      <Group justify="space-between" gap="sm" wrap="nowrap">
        <Text size="sm" c="dimmed">{message ?? 'Bu adım geri alınabilir.'}</Text>
        <Button
          size="xs" variant="subtle"
          onClick={() => {
            notifications.hide(id);
            if (useStudio.getState().history.past.length === depth) useStudio.getState().undo();
            else notifications.show({ title: 'Bu adım geri alınamadı', message: 'Sonrasında başka değişiklik yapıldı. Adım adım geri almak için ⌘Z / Ctrl Z kullanın.', autoClose: 5000 });
          }}
        >
          Geri al
        </Button>
      </Group>
    ),
    autoClose: 6000,
  });
}

/** Geçerli kararları adlı hazır ayar olarak bu tarayıcıda saklar. */
export function savePresetNow() {
  const st = useStudio.getState();
  const name = st.presetName.trim() || 'Adsız hazır ayar';
  const ok = savePreset(name, st.decisions);
  if (ok) st.markSaved(name);
  notifications.show(ok
    ? { title: 'Kaydedildi', message: `“${name}” hazır ayarı bu tarayıcıda saklandı.`, autoClose: 3000 }
    : { title: 'Kaydedilemedi', message: 'Tarayıcı depolaması kapalı ya da dolu. JSON olarak dışa aktarın.', color: 'red' });
  return ok;
}

/** Tam ekran kullanıcı etkileşiminin içinde istenir (tembel yüklenen katmanı beklemez).
 *  Tarayıcı reddederse katman sabit konumlu tam sayfa olarak kalır. */
export function openFullscreen() {
  document.documentElement.requestFullscreen?.().catch(() => {});
  useUi.getState().set({ fullscreen: true });
}

export function useStudioActions() {
  const [search, setSearch] = useStudioSearch();
  const { toggleColorScheme } = useMantineColorScheme();

  const selectRole = useCallback((id: string, ctx: ContextId = search.ctx) => {
    if (!hasRole(ctx, id)) return;
    useUi.getState().select(ctx, id);
    useUi.getState().set({ navOpen: false });
    setSearch({ ctx, role: id });
  }, [search.ctx, setSearch]);

  const setContext = useCallback((ctx: ContextId) => {
    const remembered = useUi.getState().selected[ctx];
    setSearch({ ctx, role: hasRole(ctx, remembered) ? remembered : hasRole(ctx, search.role) ? search.role : 'h1' });
  }, [search.role, setSearch]);

  const undo = useCallback(() => {
    if (!useStudio.getState().undo()) notifications.show({ title: 'Geri alınacak adım yok', message: 'Geçmiş boş.', autoClose: 2500 });
  }, []);
  const redo = useCallback(() => {
    if (!useStudio.getState().redo()) notifications.show({ title: 'Yinelenecek adım yok', message: 'Geri alınmış bir adım yok.', autoClose: 2500 });
  }, []);

  const resetRole = useCallback(() => {
    useStudio.getState().resetRole(search.ctx, search.role);
    notifyUndoable(`${ROLE[search.role].label} sıfırlandı`, `${contextLabel(search.ctx)} bağlamındaki bütün değişiklikler kaldırıldı.`);
  }, [search.ctx, search.role]);
  const resetContext = useCallback(() => {
    useStudio.getState().resetContext(search.ctx);
    notifyUndoable(`${contextLabel(search.ctx)} sıfırlandı`, 'Bu ürün türündeki bütün değişiklikler kaldırıldı.');
  }, [search.ctx]);

  const set = useCallback((patch: Partial<StudioSearch>) => setSearch(patch), [setSearch]);
  const ui = useUi.getState;

  return useMemo(() => ({
    selectRole, setContext, undo, redo, resetRole, resetContext, set, toggleColorScheme,
    toggleCanvasTheme: () => setSearch({ theme: search.theme === 'dark' ? 'light' : 'dark' }),
    toggleCompare: () => ui().set({ compare: !ui().compare }),
    openExport: () => ui().set({ exportOpen: true }),
    openImport: () => ui().set({ importOpen: true }),
    openChecks: () => ui().set({ checksOpen: true }),
    openFullscreen: openFullscreen,
    startTour: () => ui().set({ tourDone: false }),
  }), [selectRole, setContext, undo, redo, resetRole, resetContext, set, toggleColorScheme, setSearch, search.theme, ui]);
}
