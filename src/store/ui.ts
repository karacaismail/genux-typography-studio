import { create } from 'zustand';
import type { CategoryId, ContextId, FontStatus } from '../core';
import { CONTEXT_IDS } from '../core';

export type NavFilter = 'all' | 'html' | 'product';
export type CompareWith = 'default' | ContextId;

export interface UiState {
  /** Her bağlamda son seçilen tür (URL yalnız etkin bağlamınkini taşır). */
  selected: Record<ContextId, string>;
  navQuery: string;
  navFilter: NavFilter;
  collapsed: CategoryId[];
  compare: boolean;
  compareWith: CompareWith;
  zoom: 'fit' | 'actual';
  checksOpen: boolean;
  inspectorOpen: boolean;
  navOpen: boolean;
  importOpen: boolean;
  exportOpen: boolean;
  fullscreen: boolean;
  fontStatus: FontStatus;
  overflow: boolean;
  tourDone: boolean;
  sections: string[];
  linesScope: 'role' | 'category';
  guides: boolean;
  set: (patch: Partial<Omit<UiState, 'set' | 'select' | 'toggleCategory'>>) => void;
  select: (ctx: ContextId, id: string) => void;
  toggleCategory: (c: CategoryId) => void;
}

export const useUi = create<UiState>((set) => ({
  selected: Object.fromEntries(CONTEXT_IDS.map((c) => [c, 'h1'])) as Record<ContextId, string>,
  navQuery: '',
  navFilter: 'all',
  collapsed: [],
  compare: false,
  compareWith: 'default',
  zoom: 'fit',
  checksOpen: false,
  inspectorOpen: false,
  navOpen: false,
  importOpen: false,
  exportOpen: false,
  fullscreen: false,
  fontStatus: 'loading',
  overflow: false,
  tourDone: false,
  sections: ['size'],
  linesScope: 'role',
  guides: true,
  set: (patch) => set(patch),
  select: (ctx, id) => set((s) => ({ selected: { ...s.selected, [ctx]: id } })),
  toggleCategory: (c) => set((s) => ({ collapsed: s.collapsed.includes(c) ? s.collapsed.filter((x) => x !== c) : [...s.collapsed, c] })),
}));
