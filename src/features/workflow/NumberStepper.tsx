import { ActionIcon, Input, NumberInput, type NumberInputHandlers, type NumberInputProps } from '@mantine/core';
import { MinusIcon, PlusIcon } from '@phosphor-icons/react';
import { useId, useRef } from 'react';
import { RecommendationLabel } from '../recommendations/Recommendation';
import classes from './Workflow.module.scss';

/** A single field surface with balanced controls, preserving Mantine parsing and keyboard steps. */
export function NumberStepper({label,recommended,disabled,value,min,max,...props}: Omit<NumberInputProps,'label'> & {label:string;recommended?:number}) {
  const handlers=useRef<NumberInputHandlers>(undefined);
  const inputId=useId();
  const number=typeof value==='number' ? value : Number(value);
  return <Input.Wrapper label={recommended!==undefined?<RecommendationLabel value={`${recommended}${props.suffix ?? ''}`}>{label}</RecommendationLabel>:label} id={inputId} className={classes.stepperField}>
    <div className={classes.stepper} data-disabled={disabled || undefined}>
      <ActionIcon className={classes.stepButton} type="button" size={44} variant="subtle" color="gray" aria-label={`${label}: azalt`} disabled={disabled || (min!==undefined && number<=Number(min))} onClick={()=>handlers.current?.decrement()}><MinusIcon size={18}/></ActionIcon>
      <NumberInput {...props} id={inputId} aria-label={label} value={value} min={min} max={max} disabled={disabled} hideControls handlersRef={handlers} variant="unstyled" className={classes.stepValue} styles={{input:{minHeight:44,textAlign:'center',paddingInline:0}}}/>
      <ActionIcon className={classes.stepButton} type="button" size={44} variant="subtle" color="gray" aria-label={`${label}: artır`} disabled={disabled || (max!==undefined && number>=Number(max))} onClick={()=>handlers.current?.increment()}><PlusIcon size={18}/></ActionIcon>
    </div>
  </Input.Wrapper>;
}
