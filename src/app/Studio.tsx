import { AppShell, Button, useAppShellResize } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { lazy, useEffect, useState } from 'react';
import { Canvas } from '../features/canvas/Canvas';
import { CommandPalette } from '../features/command/CommandPalette';
import { useShortcuts } from '../features/command/useShortcuts';
import { Inspector } from '../features/inspector/Inspector';
import { InspectorSheet } from '../features/inspector/InspectorSheet';
import { Navigator } from '../features/navigator/Navigator';
import { ChecksDrawer, StatusBar } from '../features/status/StatusBar';
import { GlobalToolbar } from '../features/toolbar/GlobalToolbar';
import { useUi } from '../store/ui';
import { savePresetNow } from './actions';
import { LazyMount } from './LazyMount';
import { boot, entryQuery } from './bootstrap';
import { useFontStatus, usePersistence } from './usePersistence';
import { useStudioSearch } from './useStudioSearch';
import { freeEditorDeviceId } from './search';
import classes from './Studio.module.scss';
import { Workflow } from '../features/workflow/Workflow';


// İlk ekranda gerekmeyen özellikler ilk açılışta yüklenir (kod vurgulama, bırakma alanı, tur, tam ekran).
const ExportModal = lazy(() => import('../features/io/ExportModal').then((m) => ({ default: m.ExportModal })));
const ImportModal = lazy(() => import('../features/io/ImportModal').then((m) => ({ default: m.ImportModal })));
const StudioTour = lazy(() => import('../features/onboarding/StudioTour').then((m) => ({ default: m.StudioTour })));
const FullscreenPreview = lazy(() => import('../features/preview/FullscreenPreview').then((m) => ({ default: m.FullscreenPreview })));

export function Studio() {
  const [search, setSearch] = useStudioSearch();
  const [editorVisited,setEditorVisited]=useState(search.workspace==='free');
  return search.workspace === 'free' ? <><LegacyStudio /><Button className={classes.returnFlow} onClick={() => setSearch({workspace:'workflow'})}>Karar akışına dön</Button></> : <Workflow entryQuery={editorVisited?'':entryQuery} onOpenEditor={() => {setEditorVisited(true); void setSearch({workspace:'free',device:freeEditorDeviceId(search.device)}); }} />;
}

function LegacyStudio() {
  const [search] = useStudioSearch();
  const navOpen = useUi((s) => s.navOpen);
  const exportOpen = useUi((s) => s.exportOpen);
  const importOpen = useUi((s) => s.importOpen);
  const fullscreen = useUi((s) => s.fullscreen);
  const tourDone = useUi((s) => s.tourDone);
  const isLg = useMediaQuery('(min-width: 75em)', true) ?? true;
  // Yatay telefon: genişlik yetse de yükseklik kısa; gezgin kapalı başlar ve menü düğmesiyle açılır.
  const isShort = useMediaQuery('(max-height: 600px)', false) ?? false;
  const [sizes, setSizes] = useState<{ navbar?: number; aside?: number }>({ navbar: boot.ui.navbar, aside: boot.ui.aside });
  const resize = useAppShellResize({
    navbar: { min: 220, max: 320, label: 'Tür gezgini genişliği' },
    aside: { min: 300, max: 460, label: 'Denetçi genişliği' },
    initialSizes: sizes,
    onResizeEnd: (s) => setSizes({ navbar: s.navbar, aside: s.aside }),
  });
  usePersistence(search, sizes);
  // Okunamayan kayıt sessizce ezilmez: yedeklendiği bildirilir.
  useEffect(() => {
    if (!boot.error) return;
    notifications.show({
      color: 'red', autoClose: false, title: 'Kayıtlı çalışma alanı okunamadı',
      message: `Varsayılan kararlarla başlandı. Eski kayıt “genux-type-lab-v2.yedek” anahtarına kopyalandı. Neden: ${boot.error}`,
    });
  }, []);
  useFontStatus();
  useShortcuts(savePresetNow);

  return (
    <AppShell
      header={{ height: 64 }}
      footer={{ height: 40 }}
      navbar={{ width: 256, breakpoint: 'sm', collapsed: { mobile: !navOpen, desktop: isShort && !navOpen } }}
      aside={{ width: 352, breakpoint: 'lg', collapsed: { mobile: true, desktop: false } }}
      resize={resize}
      padding={0}
    >
      <Button component="a" href="#tuval" className={classes.skip} variant="filled">Tuvale geç</Button>
      <AppShell.Header className={classes.header}><GlobalToolbar /></AppShell.Header>
      <AppShell.Navbar className={classes.navbar}><Navigator /></AppShell.Navbar>
      {isLg && <AppShell.Aside className={classes.aside}><Inspector /></AppShell.Aside>}
      <AppShell.Main id="tuval"><Canvas /></AppShell.Main>
      <AppShell.Footer className={classes.footer}><StatusBar /></AppShell.Footer>
      {!isLg && <InspectorSheet />}
      <ChecksDrawer />
      <CommandPalette onSave={savePresetNow} />
      <LazyMount when={exportOpen}><ExportModal /></LazyMount>
      <LazyMount when={importOpen}><ImportModal /></LazyMount>
      <LazyMount when={fullscreen}><FullscreenPreview /></LazyMount>
      <LazyMount when={!tourDone}><StudioTour /></LazyMount>
    </AppShell>
  );
}
