import { SegmentedControl } from '@mantine/core';
import type { Orientation } from './orientation';
import classes from './OrientationChoice.module.scss';

export interface OrientationChoiceProps {
  value: Orientation;
  onChange: (value: Orientation) => void;
}

/** Controlled preview preference; the parent decides whether the device supports it. */
export function OrientationChoice({ value, onChange }: OrientationChoiceProps) {
  return <SegmentedControl
    aria-label="Önizleme yönü"
    value={value}
    onChange={(next) => {
      if (next === 'portrait' || next === 'landscape') onChange(next);
    }}
    data={[{ value: 'portrait', label: 'Dikey' }, { value: 'landscape', label: 'Yatay' }]}
    classNames={{ root: classes.root, label: classes.label }}
  />;
}
