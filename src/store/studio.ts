import { create } from 'zustand';
import {
  applyOverride, applyOverrideAt, defaultDecisions, enforceSettings, resetContext, resetProps, resetPropsAt, resetRole,
  type ContextId, type ContextSettings, type Decisions, type PropKey, type RoleOverrides,
} from '../core';
import { clampNum, round } from '../core/util';
import { emptyHistory, record, redo, undo, type History } from './history';

export interface StudioState {
  decisions: Decisions;
  history: History<Decisions>;
  /** Son açık "Kaydet" anındaki kararlar (kaydedilmemiş değişiklik göstergesi için). */
  saved: Decisions;
  presetName: string;
  change: (fn: (d: Decisions) => Decisions, group?: string | null) => void;
  /** `w` verilirse o genişliğin kırılımında ezer (320 = temel). */
  override: (ctx: ContextId, id: string, patch: RoleOverrides, group?: string | null, w?: number) => void;
  resetProps: (ctx: ContextId, id: string, keys: PropKey[], w?: number) => void;
  resetRole: (ctx: ContextId, id: string) => void;
  resetContext: (ctx: ContextId) => void;
  setSettings: (ctx: ContextId, patch: Partial<ContextSettings>, group?: string | null) => void;
  setRatio: (ratio: number) => void;
  /** İçe aktarma, hazır ayar: tek adım olarak kaydedilir. */
  replace: (d: Decisions) => void;
  /** Başka sekmeden gelen değişiklik: geçmişe yazılmaz. */
  hydrate: (d: Decisions) => void;
  markSaved: (name?: string) => void;
  setPresetName: (name: string) => void;
  undo: () => boolean;
  redo: () => boolean;
}

export const useStudio = create<StudioState>((set, get) => {
  const commit = (next: Decisions, group: string | null = null) => {
    const { decisions, history } = get();
    if (next === decisions) return;
    set({ decisions: next, history: record(history, decisions, group, performance.now()) });
  };
  const initial = defaultDecisions();
  return {
    decisions: initial,
    history: emptyHistory(),
    saved: initial,
    presetName: 'GenUX kararları',
    change: (fn, group = null) => commit(fn(get().decisions), group),
    override: (ctx, id, patch, group = null, w) => commit(w === undefined ? applyOverride(get().decisions, ctx, id, patch) : applyOverrideAt(get().decisions, ctx, id, patch, w), group),
    resetProps: (ctx, id, keys, w) => commit(w === undefined ? resetProps(get().decisions, ctx, id, keys) : resetPropsAt(get().decisions, ctx, id, keys, w)),
    resetRole: (ctx, id) => commit(resetRole(get().decisions, ctx, id)),
    resetContext: (ctx) => commit(resetContext(get().decisions, ctx)),
    setSettings: (ctx, patch, group = null) => {
      const d = get().decisions;
      const settings = enforceSettings(ctx, { ...d.contexts[ctx].settings, ...patch });
      commit({ ...d, contexts: { ...d.contexts, [ctx]: { ...d.contexts[ctx], settings } } }, group);
    },
    setRatio: (ratio) => commit({ ...get().decisions, ratio: clampNum(round(ratio, 3), 1, 2) }, 'ratio'),
    replace: (d) => commit(d),
    hydrate: (d) => set({ decisions: d }),
    markSaved: (name) => set((s) => ({ saved: s.decisions, presetName: name ?? s.presetName })),
    setPresetName: (presetName) => set({ presetName }),
    undo: () => {
      const r = undo(get().history, get().decisions);
      if (!r) return false;
      set({ decisions: r.value, history: r.history });
      return true;
    },
    redo: () => {
      const r = redo(get().history, get().decisions);
      if (!r) return false;
      set({ decisions: r.value, history: r.history });
      return true;
    },
  };
});

export const selectCanUndo = (s: StudioState) => s.history.past.length > 0;
export const selectCanRedo = (s: StudioState) => s.history.future.length > 0;
export const selectDirty = (s: StudioState) => s.decisions !== s.saved && JSON.stringify(s.decisions) !== JSON.stringify(s.saved);
