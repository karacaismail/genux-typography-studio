/** Geri al / yinele geçmişi. Aynı gruptaki ardışık değişiklikler (ör. kaydırıcı sürükleme)
 *  300 ms içinde tek adım sayılır. En fazla 50 adım tutulur. Saf fonksiyonlar; zamanı çağıran verir. */
export const HISTORY_LIMIT = 50;
export const GROUP_WINDOW_MS = 300;

export interface History<T> {
  past: T[];
  future: T[];
  group: string | null;
  at: number;
}
export const emptyHistory = <T>(): History<T> => ({ past: [], future: [], group: null, at: 0 });

/** `prev` değerinden yeni değere geçişi kaydeder. */
export function record<T>(h: History<T>, prev: T, group: string | null, now: number): History<T> {
  const merge = group !== null && h.group === group && now - h.at <= GROUP_WINDOW_MS && h.past.length > 0;
  const past = merge ? h.past : [...h.past, prev].slice(-HISTORY_LIMIT);
  return { past, future: [], group, at: now };
}
export function undo<T>(h: History<T>, current: T): { history: History<T>; value: T } | null {
  if (!h.past.length) return null;
  const value = h.past[h.past.length - 1];
  return { value, history: { past: h.past.slice(0, -1), future: [current, ...h.future].slice(0, HISTORY_LIMIT), group: null, at: 0 } };
}
export function redo<T>(h: History<T>, current: T): { history: History<T>; value: T } | null {
  if (!h.future.length) return null;
  const [value, ...rest] = h.future;
  return { value, history: { past: [...h.past, current].slice(-HISTORY_LIMIT), future: rest, group: null, at: 0 } };
}
