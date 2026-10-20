import { describe, expect, it } from 'vitest';
import { GROUP_WINDOW_MS, HISTORY_LIMIT, emptyHistory, record, redo, undo } from './history';

describe('geçmiş', () => {
  it('aynı gruptaki hızlı değişiklikler tek adım', () => {
    let h = emptyHistory<number>();
    h = record(h, 0, 'size', 1000);
    h = record(h, 1, 'size', 1100);
    h = record(h, 2, 'size', 1100 + GROUP_WINDOW_MS);
    expect(h.past).toEqual([0]);
    h = record(h, 3, 'size', 1100 + 2 * GROUP_WINDOW_MS + 1);
    expect(h.past).toEqual([0, 3]);
  });
  it('farklı grup ya da grupsuz değişiklik yeni adım', () => {
    let h = emptyHistory<number>();
    h = record(h, 0, 'size', 0);
    h = record(h, 1, 'lh', 10);
    h = record(h, 2, null, 20);
    h = record(h, 3, null, 30);
    expect(h.past).toEqual([0, 1, 2, 3]);
  });
  it('geri al ve yinele', () => {
    let h = record(emptyHistory<number>(), 0, null, 0);
    const u = undo(h, 1)!;
    expect(u.value).toBe(0);
    const r = redo(u.history, 0)!;
    expect(r.value).toBe(1);
    h = record(r.history, 1, null, 50);
    expect(h.future).toEqual([]);
    expect(undo(emptyHistory<number>(), 0)).toBeNull();
    expect(redo(emptyHistory<number>(), 0)).toBeNull();
  });
  it('en fazla 50 adım', () => {
    let h = emptyHistory<number>();
    for (let i = 0; i < 80; i += 1) h = record(h, i, null, i * 1000);
    expect(h.past.length).toBe(HISTORY_LIMIT);
    expect(h.past[0]).toBe(30);
  });
  it('geri alındıktan sonra gruplama yeniden başlar', () => {
    let h = record(emptyHistory<number>(), 0, 'size', 0);
    h = undo(h, 1)!.history;
    h = record(h, 0, 'size', 100);
    expect(h.past).toEqual([0]);
  });
});
