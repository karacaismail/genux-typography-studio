import classes from './FieldEvidence.module.scss';
export interface FieldSource { label:string; reason:string }
/** The complete explanation is also available in the keyboard-accessible engine source table. */
export function FieldEvidence({source}:{source?:FieldSource}){
 return source?<span className={classes.source} title={source.reason}>Kaynak: {source.label}</span>:null;
}
