import { Badge, Button, Drawer, Kbd, UnstyledButton } from '@mantine/core';
import { CheckCircleIcon, InfoIcon, ListChecksIcon, SealCheckIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { useMemo } from 'react';
import { ROLE, TIERS, checkCounts, computeChecks, contextLabel, sizeAt, tierOf, type CheckStatus } from '../../core';
import { fmt } from '../../core/util';
import { useStudioActions } from '../../app/actions';
import { useCurrent } from '../../app/useCurrent';
import { useUi } from '../../store/ui';
import { MOD } from '../command/shortcuts';
import classes from './StatusBar.module.scss';

const ICON: Record<CheckStatus, typeof InfoIcon> = { warn: WarningCircleIcon, pass: CheckCircleIcon, enforced: SealCheckIcon, info: InfoIcon };
const STATUS_LABEL: Record<CheckStatus, string> = { warn: 'Uyarı', pass: 'Geçti', enforced: 'Kural uygulanıyor', info: 'Bilgi' };

function useChecks() {
  const { decisions, ctx } = useCurrent();
  const overflow = useUi((s) => s.overflow);
  const fontStatus = useUi((s) => s.fontStatus);
  return useMemo(() => computeChecks(decisions, ctx, { overflow, fontStatus }), [decisions, ctx, overflow, fontStatus]);
}

export function StatusBar() {
  const { ctx, id, r, settings, dims } = useCurrent();
  const checks = useChecks();
  const n = checkCounts(checks);
  const tier = TIERS.find((t) => t.id === tierOf(dims.w))!;
  const fontStatus = useUi((s) => s.fontStatus);
  return (
    <div className={classes.bar} data-tour="status">
      <UnstyledButton className={classes.checks} onClick={() => useUi.getState().set({ checksOpen: true })} aria-label={`Kontroller: ${n.warn} uyarı, ${n.info} bilgi, ${n.pass} geçti`}>
        <span className={classes.count} data-kind="warn"><WarningCircleIcon size={16} aria-hidden="true" />{n.warn}</span>{' '}
        <span className={classes.count}><InfoIcon size={16} aria-hidden="true" />{n.info}</span>{' '}
        <span className={classes.count} data-kind="pass"><CheckCircleIcon size={16} aria-hidden="true" />{n.pass}</span>
      </UnstyledButton>
      <span className={classes.sep} aria-hidden="true" />
      <span>{contextLabel(ctx)} · {ROLE[id].label} {fmt(sizeAt(r, settings, id, dims.w))} px</span>
      <span className={classes.sep} aria-hidden="true" />
      <span>{dims.w} px · {tier.label}</span>
      <span className={classes.grow} />
      <span>{fontStatus === 'ok' ? 'Outfit yüklendi' : fontStatus === 'fail' ? 'Outfit yüklenemedi' : 'Outfit yükleniyor'}</span>
      <span className={classes.sep} aria-hidden="true" />
      <span>Otomatik saklanıyor</span>
      <span className={classes.sep} aria-hidden="true" />
      <span><Kbd>{MOD}</Kbd> <Kbd>K</Kbd> komutlar</span>
    </div>
  );
}

export function ChecksDrawer() {
  const open = useUi((s) => s.checksOpen);
  const { ctx } = useCurrent();
  const { selectRole } = useStudioActions();
  const checks = useChecks();
  const order: CheckStatus[] = ['warn', 'info', 'enforced', 'pass'];
  const sorted = [...checks].sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));
  return (
    <Drawer
      opened={open} onClose={() => useUi.getState().set({ checksOpen: false })} position="right" size="md"
      title={<span><ListChecksIcon size={18} style={{ verticalAlign: '-3px' }} aria-hidden="true" /> Kontroller · {contextLabel(ctx)}</span>}
    >
      <ul className={classes.drawerList}>
        {sorted.map((c) => {
          const Icon = ICON[c.status];
          return (
            <li key={c.title} className={classes.check}>
              <Icon size={18} className={classes.icon} data-status={c.status} role="img" aria-label={STATUS_LABEL[c.status]} />
              <p className={classes.checkTitle}>{c.title}</p>
              <p className={classes.checkDetail}>{c.detail}</p>
              {c.roles && c.roles.length > 0 && (
                <div className={classes.roleLinks}>
                  {c.roles.slice(0, 12).map((rid) => (
                    <Button key={rid} size="xs" variant="default" onClick={() => { selectRole(rid); useUi.getState().set({ checksOpen: false }); }}>
                      {ROLE[rid].label}
                    </Button>
                  ))}
                  {c.roles.length > 12 && <Badge variant="default">+{c.roles.length - 12}</Badge>}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Drawer>
  );
}
