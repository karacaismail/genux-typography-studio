import { Progress } from '@mantine/core';
import classes from './WorkflowProgress.module.scss';

export interface WorkflowProgressProps {
  completedGroups: number;
  totalGroups: number;
  reviewedElements: number;
  totalElements: number;
}

/** Counts are supplied by the workflow; element progress belongs to the current group. */
export function WorkflowProgress({ completedGroups, totalGroups, reviewedElements, totalElements }: WorkflowProgressProps) {
  const groupsLabel = `${completedGroups} / ${totalGroups} onaylı küme`;
  const elementsLabel = `${reviewedElements} / ${totalElements} element onaylandı`;

  const groupsPercent = totalGroups > 0 ? completedGroups / totalGroups * 100 : 0;
  const elementsPercent = totalElements > 0 ? reviewedElements / totalElements * 100 : 0;

  return (
    <div className={classes.root} role="group" aria-label="Çalışma ilerlemesi">
      <div className={classes.metric}>
        <span className={classes.globalLabel}>{groupsLabel}</span>
        <Progress.Root
          role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={groupsPercent}
          size="xs"
          aria-label="Tüm kümelerin onay ilerlemesi"
          aria-valuetext={groupsLabel}
        ><Progress.Section value={groupsPercent} color="var(--gx-accent)" withAria={false}/></Progress.Root>
      </div>
      <div className={classes.metric}>
        <span className={classes.localLabel}>{elementsLabel}</span>
        <Progress.Root
          role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={elementsPercent}
          size="xs"
          aria-label="Geçerli kümedeki elementlerin onay ilerlemesi"
          aria-valuetext={elementsLabel}
        ><Progress.Section value={elementsPercent} color="var(--gx-accent)" withAria={false}/></Progress.Root>
      </div>
    </div>
  );
}
