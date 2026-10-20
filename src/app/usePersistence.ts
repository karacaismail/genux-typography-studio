import { notifications } from '@mantine/notifications';
import { useEffect, useRef } from 'react';
import { STORAGE_KEY, importData, defaultDecisions } from '../core';
import { writeStored, type StoredUi } from '../store/persist';
import type { Decisions } from '../core';
import { useStudio } from '../store/studio';
import { useUi } from '../store/ui';
import type { StudioSearch } from './search';

/** Çalışma alanını 250 ms gecikmeyle ve sayfadan çıkarken saklar; başka sekmedeki değişikliği yükler. */
export function usePersistence(search: StudioSearch, sizes: { navbar?: number; aside?: number }) {
  const latest = useRef({ search, sizes });
  latest.current = { search, sizes };

  useEffect(() => {
    let timer = 0;
    const snapshot = (): StoredUi => {
      const ui = useUi.getState();
      return {
        ...latest.current.search,
        selected: ui.selected,
        tourDone: ui.tourDone,
        presetName: useStudio.getState().presetName,
        navbar: latest.current.sizes.navbar,
        aside: latest.current.sizes.aside,
      };
    };
    // Başka sekmeden gelen durum uygulanırken kayıt yapılmaz; aksi hâlde iki sekme birbirine sonsuz yazar.
    let applyingRemote = false;
    let pending = false;
    const saveNow = () => { window.clearTimeout(timer); pending = false; writeStored(useStudio.getState().decisions, snapshot()); };
    const save = () => { if (applyingRemote) return; window.clearTimeout(timer); pending = true; timer = window.setTimeout(saveNow, 250); };
    const same = (a: Decisions, b: Decisions) => a === b || JSON.stringify(a) === JSON.stringify(b);
    const unsubs = [useStudio.subscribe(save), useUi.subscribe((s, p) => { if (s.selected !== p.selected || s.tourDone !== p.tourDone) save(); })];
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      try {
        const { decisions } = importData(JSON.parse(e.newValue), defaultDecisions(), latest.current.search.ctx);
        // Yalnız kararlar gerçekten farklıysa (zaman damgası ve arayüz bloğu yok sayılır).
        // Bu sekmede henüz yazılmamış bir değişiklik varsa o kazanır (birazdan yazılır ve öbür sekmeye gider).
        if (pending || same(decisions, useStudio.getState().decisions)) return;
        applyingRemote = true;
        try { useStudio.getState().hydrate(decisions); } finally { applyingRemote = false; }
        notifications.show({ id: 'remote-change', title: 'Başka sekmede değişti', message: 'Kararlar diğer sekmedeki son durumla güncellendi.', autoClose: 4000 });
      } catch { /* bozuk kayıt: mevcut durum korunur */ }
    };
    window.addEventListener('pagehide', saveNow);
    window.addEventListener('storage', onStorage);
    return () => {
      unsubs.forEach((u) => u());
      window.removeEventListener('pagehide', saveNow);
      window.removeEventListener('storage', onStorage);
      saveNow();
    };
  }, []);

  // URL değişimi (tür, cihaz, görünüm) de saklanır.
  useEffect(() => {
    const t = window.setTimeout(() => {
      const ui = useUi.getState();
      writeStored(useStudio.getState().decisions, { ...search, selected: ui.selected, tourDone: ui.tourDone, presetName: useStudio.getState().presetName, ...sizes });
    }, 250);
    return () => window.clearTimeout(t);
  }, [search, sizes]);
}

/** Outfit yükleme durumu (kontrollerde ve durum çubuğunda gösterilir). */
export function useFontStatus() {
  useEffect(() => {
    const fonts = document.fonts;
    if (!fonts) { useUi.getState().set({ fontStatus: 'fail' }); return; }
    let alive = true;
    const t = window.setTimeout(() => { if (alive && !fonts.check('16px "Outfit"')) useUi.getState().set({ fontStatus: 'fail' }); }, 6000);
    fonts.load('400 16px "Outfit"').then((list) => {
      if (alive) useUi.getState().set({ fontStatus: list.length ? 'ok' : 'fail' });
    }).catch(() => { if (alive) useUi.getState().set({ fontStatus: 'fail' }); });
    return () => { alive = false; window.clearTimeout(t); };
  }, []);
}
