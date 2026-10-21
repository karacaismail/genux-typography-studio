import classes from './Workflow.module.scss';
export function StepLabel({number,children}:{number:number;children:string}) {
  return <p className={classes.stepLabel} data-workflow-step={number}><span className={classes.stepNumber}>{number}</span><span>{children}</span></p>;
}
