import { CloseButton, ScrollArea, SegmentedControl, TextInput, Tree, useTree, type TreeNodeData } from '@mantine/core';
import { CaretRightIcon, MagnifyingGlassIcon, WarningIcon } from '@phosphor-icons/react';
import { useEffect, useMemo, useRef } from 'react';
import { CATEGORIES, ROLE, changeCount, roleWarnings, rolesOf, valueText } from '../../core';
import { useStudioActions } from '../../app/actions';
import { useCurrent } from '../../app/useCurrent';
import { useUi, type NavFilter } from '../../store/ui';
import classes from './Navigator.module.scss';

const FILTERS: { value: NavFilter; label: string }[] = [
  { value: 'all', label: 'Hepsi' },
  { value: 'html', label: 'HTML' },
  { value: 'product', label: 'Ürün' },
];
const norm = (s: string) => s.toLocaleLowerCase('tr-TR');
const CAT_PREFIX = 'cat:';

export function Navigator() {
  const { ctx, id, decisions, resolved, settings, dims } = useCurrent();
  const { selectRole } = useStudioActions();
  const query = useUi((s) => s.navQuery);
  const filter = useUi((s) => s.navFilter);
  const collapsed = useUi((s) => s.collapsed);
  const scrollRef = useRef<HTMLDivElement>(null);

  const data: TreeNodeData[] = useMemo(() => {
    const q = norm(query.trim());
    const roles = rolesOf(ctx).filter((r) => (filter === 'all' || (filter === 'html') === !!r.el)
      && (!q || norm(`${r.label} ${r.id} ${r.group}`).includes(q)));
    return CATEGORIES
      .map((c) => ({ value: `${CAT_PREFIX}${c.id}`, label: c.label, children: roles.filter((r) => r.category === c.id).map((r) => ({ value: r.id, label: r.label })) }))
      .filter((c) => c.children.length);
  }, [ctx, query, filter]);

  const expandedState = useMemo(() => Object.fromEntries(data.map((c) => [c.value, query.trim() ? true : !collapsed.includes(c.value.slice(CAT_PREFIX.length) as never)])), [data, collapsed, query]);
  const tree = useTree({
    expandedState,
    selectedState: [id],
    // Arama sırasında kategoriler açık tutulur; elle açıp kapatma yalnız arama yokken saklanır.
    onExpandedStateChange: (state) => {
      if (query.trim()) return;
      useUi.getState().set({ collapsed: CATEGORIES.map((c) => c.id).filter((c) => state[`${CAT_PREFIX}${c}`] === false) });
    },
  });

  // Seçim başka yerden değişince (palet, tuval tıklaması) gezgin onu görünür alana getirir.
  useEffect(() => {
    const el = scrollRef.current?.querySelector<HTMLElement>(`[role="treeitem"][data-value="${CSS.escape(id)}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [id, ctx]);

  const total = data.reduce((n, c) => n + (c.children?.length ?? 0), 0);

  return (
    <nav className={classes.root} aria-label="Tipografi türleri" data-tour="navigator">
      <div className={classes.head}>
        <div className={classes.headTitle}>
          <span>Türler</span>
          <span aria-live="polite">{total} tür</span>
        </div>
        <TextInput
          size="sm" aria-label="Tür ara" placeholder="Ara: başlık, fiyat, code…"
          leftSection={<MagnifyingGlassIcon size={16} />}
          value={query} onChange={(e) => useUi.getState().set({ navQuery: e.currentTarget.value })}
          rightSection={query ? <CloseButton size="sm" aria-label="Aramayı temizle" onClick={() => useUi.getState().set({ navQuery: '' })} /> : null}
        />
        <SegmentedControl
          size="sm" fullWidth aria-label="Tür süzgeci" data={FILTERS}
          value={filter} onChange={(v) => useUi.getState().set({ navFilter: v as NavFilter })}
        />
      </div>
      <ScrollArea className={classes.scroll} viewportRef={scrollRef} type="auto" scrollbarSize={8}>
        {data.length ? (
          <Tree
            className={classes.tree}
            data={data}
            tree={tree}
            selectOnClick={false}
            expandOnClick
            expandOnSpace={false}
            aria-label="Türler"
            onKeyDown={(e) => {
              const item = (e.target as HTMLElement).closest<HTMLElement>('[role="treeitem"]');
              const v = item?.dataset.value;
              if (!v || (e.key !== 'Enter' && e.key !== ' ')) return;
              e.preventDefault();
              if (v.startsWith(CAT_PREFIX)) tree.toggleExpanded(v);
              else selectRole(v);
            }}
            renderNode={({ node, expanded, hasChildren, elementProps }) => {
              if (hasChildren) {
                return (
                  <div {...elementProps} className={`${elementProps.className} ${classes.category}`}>
                    <CaretRightIcon size={14} weight="bold" className={classes.caret} data-expanded={expanded || undefined} aria-hidden="true" />
                    <span>{node.label}</span>
                    <span className={classes.count}>{node.children?.length}</span>
                  </div>
                );
              }
              const rid = node.value;
              const r = resolved[rid];
              const changed = changeCount(decisions, ctx, rid) > 0;
              const warn = roleWarnings(r, settings, rid, dims.w).some((w) => w.code === 'contrast' || w.code === 'lh' || w.code === 'decision');
              return (
                <div
                  {...elementProps}
                  className={`${elementProps.className} ${classes.role}`}
                  onClick={(e) => { elementProps.onClick(e); selectRole(rid); }}
                >
                  <span className={classes.roleLabel}>{ROLE[rid].label}</span>
                  {warn && <WarningIcon size={14} className={classes.warn} role="img" aria-label="Uyarı var" />}
                  {changed && <span className={classes.changed} role="img" aria-label="Bu ürün türünde değiştirildi" />}
                  <span className={classes.value}>{valueText(r, settings)}</span>
                </div>
              );
            }}
          />
        ) : (
          <p className={classes.empty}>“{query}” ile eşleşen tür yok. Aramayı ya da süzgeci değiştirin.</p>
        )}
      </ScrollArea>
    </nav>
  );
}
