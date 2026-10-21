// Router oluşturulmadan önce çalışır: kayıtlı çalışma alanını yükler, URL boşsa son görünümü geri getirir.
import { CONTEXT_IDS, DEFAULT_RATIO, pruneRedundant, type ContextId } from '../core';
import { readStored } from '../store/persist';
import { useStudio } from '../store/studio';
import { useUi } from '../store/ui';

export const entryQuery = window.location.search;
export const boot = readStored();

// Varsayılan olmuş değerlerle aynı ezmeler kaldırılır ("değişti" görünmesin; varsayılan güncellenince onu izlesin).
// Eski varsayılan oran eşiği (1,15; arayüzden değiştirilemiyordu) ve 2 ondalık yuvarlama hatasının bıraktığı 1,13
// yeni varsayılana taşınır (kullanıcı kararı 2026-10-19).
const pruned = pruneRedundant(boot.decisions);
const loaded = pruned.ratio === 1.15 || pruned.ratio === 1.13 ? { ...pruned, ratio: DEFAULT_RATIO } : pruned;
useStudio.setState({ decisions: loaded, saved: loaded, presetName: boot.ui.presetName || 'GenUX kararları' });
const sel = boot.ui.selected;
if (sel && typeof sel === 'object') {
  useUi.setState((s) => ({
    selected: Object.fromEntries(CONTEXT_IDS.map((c) => [c, typeof sel[c] === 'string' ? sel[c] : s.selected[c]])) as Record<ContextId, string>,
  }));
}
useUi.setState({ tourDone: boot.ui.tourDone === true || boot.found });

// A fresh workflow starts at its mobile-first baseline, independent of the host viewport.
// Explicit queries are user intent and are left untouched.
if (!window.location.search && !boot.found) {
  window.history.replaceState(window.history.state, '', `${window.location.pathname}?device=m320${window.location.hash}`);
}
if (!window.location.search && boot.found) {
  const p = new URLSearchParams();
  if (boot.ui.workspace === 'free') {
    p.set('workspace', 'free');
    (['ctx', 'role', 'device', 'orient', 'theme', 'view'] as const).forEach((k) => {
      const v = boot.ui[k];
      if (typeof v === 'string') p.set(k, v);
    });
    if (!p.has('role') && typeof boot.ui.ctx === 'string' && sel?.[boot.ui.ctx]) p.set('role', sel[boot.ui.ctx]);
  } else {
    // IndexedDB owns the workflow cursor. Core editor UI must not masquerade as a deep link.
    p.set('workspace', 'workflow');
  }
  window.history.replaceState(window.history.state, '', `${window.location.pathname}?${p.toString()}${window.location.hash}`);
}
