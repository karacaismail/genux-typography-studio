import { buildExport, defaultDecisions, importData, STORAGE_KEY, type Decisions } from '../core';
import { isObj } from '../core/util';
import type { StudioSearch } from '../app/search';

export const PRESETS_KEY = 'genux-type-lab-presets';
/** Okunamayan kayıt üzerine yazılmadan önce buraya kopyalanır. */
export const BACKUP_KEY = 'genux-type-lab-v2.yedek';

export interface StoredUi extends Partial<StudioSearch> {
  selected?: Record<string, string>;
  presetName?: string;
  navbar?: number;
  aside?: number;
  tourDone?: boolean;
}

const storage = {
  get(key: string): string | null {
    try { return window.localStorage.getItem(key); } catch { return null; }
  },
  set(key: string, value: string) {
    try { window.localStorage.setItem(key, value); return true; } catch { return false; }
  },
};

/** Kayıtlı çalışma alanını okur. Bozuk ya da okunamayan kayıtta varsayılanlar ve hata metni döner. */
export function readStored(): { decisions: Decisions; ui: StoredUi; error: string | null; found: boolean } {
  const raw = storage.get(STORAGE_KEY);
  if (!raw) return { decisions: defaultDecisions(), ui: {}, error: null, found: false };
  try {
    const { decisions, ui } = importData(JSON.parse(raw), defaultDecisions(), 'admin');
    return { decisions, ui: (ui ?? {}) as StoredUi, error: null, found: true };
  } catch (e) {
    const backedUp = storage.set(BACKUP_KEY, raw);
    const msg = e instanceof Error ? e.message : String(e);
    return { decisions: defaultDecisions(), ui: {}, error: backedUp ? msg : `${msg} (yedeklenemedi)`, found: true };
  }
}

export function writeStored(decisions: Decisions, ui: StoredUi) {
  return storage.set(STORAGE_KEY, JSON.stringify(buildExport(decisions, 'changed', { ui: { ...ui } })));
}

export interface Preset { name: string; savedAt: string; data: unknown }
export function listPresets(): Preset[] {
  try {
    const v = JSON.parse(storage.get(PRESETS_KEY) ?? '[]');
    return Array.isArray(v) ? v.filter((p): p is Preset => isObj(p) && typeof p.name === 'string') : [];
  } catch {
    return [];
  }
}
export function savePreset(name: string, decisions: Decisions) {
  const list = listPresets().filter((p) => p.name !== name);
  list.unshift({ name, savedAt: new Date().toISOString(), data: buildExport(decisions, 'changed') });
  return storage.set(PRESETS_KEY, JSON.stringify(list.slice(0, 20)));
}
export function deletePreset(name: string) {
  return storage.set(PRESETS_KEY, JSON.stringify(listPresets().filter((p) => p.name !== name)));
}
export function loadPreset(p: Preset, current: Decisions) {
  return importData(p.data, current, 'admin').decisions;
}
