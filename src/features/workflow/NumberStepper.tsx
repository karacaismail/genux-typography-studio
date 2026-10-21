import { ActionIcon, NumberInput, type NumberInputHandlers, type NumberInputProps } from '@mantine/core';
import { MinusIcon, PlusIcon } from '@phosphor-icons/react';
import { useRef } from 'react';

/** Keep Mantine's numeric parsing, bounds and keyboard stepping; replace only its controls. */
export function NumberStepper({label,disabled,value,min,max,...props}: Omit<NumberInputProps,'label'> & {label:string}) {
  const handlers=useRef<NumberInputHandlers>(undefined);
  const number=typeof value==='number' ? value : Number(value);
  return <NumberInput {...props} label={label} value={value} min={min} max={max} disabled={disabled} hideControls handlersRef={handlers} styles={{input:{minHeight:44}}}
    leftSectionWidth={44} rightSectionWidth={44} leftSectionPointerEvents="all" rightSectionPointerEvents="all"
    leftSection={<ActionIcon type="button" size={44} variant="subtle" color="gray" aria-label={`${label}: azalt`} disabled={disabled || (min!==undefined && number<=Number(min))} onClick={()=>handlers.current?.decrement()}><MinusIcon size={18}/></ActionIcon>}
    rightSection={<ActionIcon type="button" size={44} variant="subtle" color="gray" aria-label={`${label}: artır`} disabled={disabled || (max!==undefined && number>=Number(max))} onClick={()=>handlers.current?.increment()}><PlusIcon size={18}/></ActionIcon>}
  />;
}
