import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { hasRole, type ContextId, type RoleProps } from '../../core';
import { pageHtml } from './pages';

interface Props {
  ctx: ContextId;
  selected: string;
  resolved: Record<string, RoleProps>;
  prefix: string;
  /** Kaydırılabilir üst kap (seçili öğe bu kapta üste getirilir). */
  scroller?: HTMLElement | null;
  onPick?: (id: string) => void;
  onOverflow?: (overflow: boolean) => void;
  showTag?: boolean;
  tagLabel?: string;
  scrollOffset?: number;
}

/** Ürün sayfası ve HTML5 örneği. İşaretleme statik ve güvenilirdir; React yalnız sınıf ve değişkenleri günceller. */
export function PageView({ ctx, selected, resolved, prefix, scroller, onPick, onOverflow, showTag = true, tagLabel, scrollOffset = 40 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const html = useMemo(() => ({ __html: pageHtml(ctx, prefix) }), [ctx, prefix]);
  const [tag, setTag] = useState<{ x: number; y: number } | null>(null);

  // Satır sınırı: sınıf ve değişken yalnız sınırı olan türlerde.
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    root.querySelectorAll<HTMLElement>('[data-role]').forEach((el) => {
      const r = resolved[el.dataset.role!];
      const clamp = r?.clamp ?? 0;
      el.classList.toggle('is-clamped', clamp > 0);
      if (clamp > 0) el.style.setProperty('--clamp', String(clamp));
      else el.style.removeProperty('--clamp');
    });
    onOverflow?.(root.scrollWidth > root.clientWidth + 1);
  }, [resolved, html, onOverflow]);

  // Seçili türün bütün örnekleri işaretlenir; ilki kabın üstüne getirilir ve etiketlenir.
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    root.querySelectorAll('.is-editing').forEach((el) => el.classList.remove('is-editing'));
    const els = [...root.querySelectorAll<HTMLElement>(`[data-role="${CSS.escape(selected)}"]`)];
    els.forEach((el) => el.classList.add('is-editing'));
    const first = els[0];
    if (!first) { setTag(null); return; }
    const k = root.getBoundingClientRect().width / (root.offsetWidth || 1) || 1;
    const rr = root.getBoundingClientRect();
    const fr = first.getBoundingClientRect();
    setTag({ x: (fr.left - rr.left) / k, y: (fr.top - rr.top) / k });
  }, [selected, html, resolved]);

  // Seçim (ya da sayfa) değişince ilk örnek kabın üstüne getirilir. Değer düzenlenirken kaydırma korunur.
  useLayoutEffect(() => {
    const root = ref.current;
    const first = root?.querySelector<HTMLElement>(`[data-role="${CSS.escape(selected)}"]`);
    if (!root || !first || !scroller) return;
    const sr = scroller.getBoundingClientRect();
    const ks = sr.height / (scroller.offsetHeight || 1) || 1;
    scroller.scrollTop += (first.getBoundingClientRect().top - sr.top) / ks - scrollOffset;
  }, [selected, html, scroller]); // scrollOffset bilinçli olarak dışarıda: şerit yüksekliği değişince kaydırılmaz.

  useEffect(() => {
    const root = ref.current;
    if (!root || !onPick) return undefined;
    const click = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('a')) e.preventDefault();
      const el = t.closest<HTMLElement>('[data-role]');
      if (el && hasRole(ctx, el.dataset.role!)) onPick(el.dataset.role!);
    };
    const submit = (e: Event) => e.preventDefault();
    root.addEventListener('click', click);
    root.addEventListener('submit', submit);
    return () => { root.removeEventListener('click', click); root.removeEventListener('submit', submit); };
  }, [ctx, onPick]);

  return (
    <div className="pv-wrap" style={{ position: 'relative' }}>
      {showTag && tag && (
        <span className="gx-edit-tag" aria-hidden="true" style={{ left: tag.x, top: tag.y, transform: 'translateY(-100%)' }}>
          {tagLabel ? `${tagLabel} · düzenleniyor` : 'düzenleniyor'}
        </span>
      )}
      <div ref={ref} className="pv-page" data-context={ctx} dangerouslySetInnerHTML={html} />
    </div>
  );
}
