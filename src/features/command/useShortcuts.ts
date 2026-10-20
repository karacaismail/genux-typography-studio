import { useHotkeys } from '@mantine/hooks';
import { openFullscreen, useStudioActions } from '../../app/actions';

/** Genel kısayollar. Metin alanlarında çalışmaz (tarayıcının kendi geri alması korunur). */
export function useShortcuts(onSave: () => void) {
  const a = useStudioActions();
  useHotkeys([
    ['mod+Z', () => a.undo()],
    ['mod+shift+Z', () => a.redo()],
    ['mod+Y', () => a.redo()],
    ['mod+S', () => onSave()],
    ['mod+E', () => a.openExport()],
    ['mod+shift+O', () => a.openImport()],
    ['mod+Enter', () => openFullscreen()],
  ]);
}
