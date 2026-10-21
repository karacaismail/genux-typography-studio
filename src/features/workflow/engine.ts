import { contrastInfo, enforceRole, grayHex, minSizeFor, recommendedRole, RECOMMENDED_LINE_HEIGHTS, ROLE, resolveAt, sizeAt, type Decisions, type RoleOverrides, type RoleProps } from '../../core';
import { decisionsForStep, isReviewed, REVIEW_TARGETS, reviewKey, type FlowState, type FlowStep } from './model';
import { type DecisionEvent, type DecisionSource, type EngineEntry, type RuleTrace } from './engineState';

export interface DecisionCheck { id:string; pass:boolean; detail:string }
export function decisionChecks(values:RoleProps,id:string):DecisionCheck[]{
  return [
    {id:'project-minimum',pass:values.size>=minSizeFor(id),detail:`Proje alt sınırı ${minSizeFor(id)} px`},
    ...(['light','dark'] as const).map(theme=>{const c=contrastInfo({...values,mode:'static',max:values.size,sizes:null},id,theme);return {id:`contrast-${theme}`,pass:c.pass,detail:`${theme==='light'?'Açık':'Koyu'}: ${c.ratio.toFixed(2)}:1 / gereken ${c.need}:1`};}),
  ];
}
interface Anchor { key:string; step:FlowStep; role:string; values:RoleProps; px:number; fingerprint:string }
export interface Prediction { values:RoleProps; sources:DecisionSource[]; trace:RuleTrace[]; checks:DecisionCheck[]; evidence:EngineEntry['evidence'] }
const EVENTS:DecisionEvent[]=['step-entered','decision-approved','decision-changed','recalculate'];
interface Agenda { event:DecisionEvent; target:FlowStep; id:string; base:RoleProps; values:RoleProps; anchors:Anchor[]; selected:Anchor[]; trace:RuleTrace[]; evidence:EngineEntry['evidence'] }
interface Rule { id:string; priority:number; events?:DecisionEvent[]; when:(a:Agenda)=>boolean; then:(a:Agenda)=>void }
const rank={mobile:0,tablet:1,laptop:2,desktop:3,tv:4};
const bound=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
const median=(values:number[])=>{const sorted=[...values].sort((a,b)=>a-b);return (sorted[Math.floor((sorted.length-1)/2)]+sorted[Math.floor(sorted.length/2)])/2;};
const note=(a:Agenda,rule:string,reason:string)=>a.trace.push({rule,reason});
const baseline=(s:FlowStep,id:string)=>recommendedRole(s.ctx,id,s.device.w);
function sources(f:FlowState,d:Decisions,target:FlowStep,id:string):Anchor[]{
  return Object.entries(f.reviews).flatMap(([key,review])=>{
    const item=REVIEW_TARGETS.get(key);if(!item || item.step.ctx!==target.ctx)return [];
    const s=item.step;
    // Never learn from a future viewport, another product or an unconfirmed/stale draft.
    if(s.device.w>target.device.w || rank[s.family]>rank[target.family] || key===reviewKey(target,id) || !isReviewed(f,d,s,item.role))return [];
    const order=target.roles.indexOf(item.role),current=target.roles.indexOf(id);
    if(item.role!==id && (s.group!==target.group || order<0 || order>=current))return [];
    // Learn from the validated resolution, never from independently editable imported snapshots.
    const clean=resolveAt(decisionsForStep(f,d,s),s.ctx,item.role,s.device.w);
    const px=Math.round(sizeAt(clean,d.contexts[s.ctx].settings,item.role,s.device.w));
    if(!decisionChecks({...clean,size:px,mode:'static',sizes:null,max:px},item.role).every(c=>c.pass))return [];
    return [{key,step:s,role:item.role,values:clean,px,fingerprint:review.fingerprint}];
  });
}
const RULES:Rule[]=[
  {id:'same-role-transfer',priority:10,when:a=>a.anchors.some(s=>s.role===a.id),then:a=>{
    const candidates=a.anchors.filter(s=>s.role===a.id).sort((x,y)=>y.step.device.w-x.step.device.w || rank[y.step.family]-rank[x.step.family]);
    // One vote per viewport; related device shells do not multiply evidence.
    const selected=[...new Map([...candidates].reverse().map(s=>[s.step.device.w,s])).values()].sort((x,y)=>y.step.device.w-x.step.device.w).slice(0,5);
    const nearest=selected[0];a.selected=selected;a.evidence='same-role';
    const ratios=selected.map(s=>s.px/baseline(s.step,s.role).size);
    const scale=median(ratios);
    let size=Math.max(nearest.px,a.base.size*scale);
    if(selected.length>=2){
      const slopes:number[]=[];
      for(let i=0;i<selected.length;i++)for(let j=i+1;j<selected.length;j++){
        const x=selected[i],y=selected[j];slopes.push((x.px/baseline(x.step,x.role).size-y.px/baseline(y.step,y.role).size)/Math.log(x.step.device.w/y.step.device.w));
      }
      const nearRatio=nearest.px/baseline(nearest.step,nearest.role).size;
      const learnedRatio=nearRatio+bound(median(slopes),-.25,.25)*Math.min(1,Math.log(a.target.device.w/nearest.step.device.w));
      const trend=a.base.size*bound(learnedRatio,Math.min(...ratios)-.1,Math.max(...ratios)+.1);
      // Bound extrapolation by the catalog scale; predictions cannot explode on sparse samples.
      size=bound(trend,nearest.px,Math.max(nearest.px,a.base.size*scale*1.25));a.evidence='trend';
      note(a,'bounded-trend',`${selected.length} onaylı genişlikten medyan büyüme eğilimi; sınırlı ileri tahmin.`);
    }
    a.values={...a.values,...Object.fromEntries((['w','lh','ls','ws','mw','mt','mb','c'] as const).map(k=>[k,nearest.values[k]])),size:Math.round(size)};
    note(a,'same-role-transfer',`${nearest.step.device.w} px ${ROLE[a.id].label} kararı; yeni ekran için ${Math.round(size)} px.`);
  }},
  {id:'related-role-scale',priority:20,when:a=>a.selected.length===0 && a.anchors.length>0,then:a=>{
    const current=a.anchors.filter(s=>s.step.device.w===a.target.device.w && s.step.family===a.target.family);
    const candidates=current.length?current:a.anchors;
    const selected=[...candidates].sort((x,y)=>y.step.device.w-x.step.device.w || a.target.roles.indexOf(y.role)-a.target.roles.indexOf(x.role)).slice(0,5);
    a.selected=selected;a.evidence='related';
    const scale=median(selected.map(s=>s.px/baseline(s.step,s.role).size));
    const weight=median(selected.map(s=>s.values.w-baseline(s.step,s.role).w));
    const leading=median(selected.map(s=>s.values.lh/baseline(s.step,s.role).lh));
    a.values={...a.values,size:Math.round(a.base.size*scale),w:Math.round((a.base.w+weight)/100)*100,lh:a.base.lh*leading,c:{...selected[0].values.c}};
    note(a,'related-role-scale',`${selected.map(s=>ROLE[s.role].label).join(', ')} onaylarından tipografik oran, ağırlık farkı ve satır ritmi taşındı.`);
  }},
  {id:'heading-order',priority:30,when:a=>/^h[1-6]$/.test(a.id),then:a=>{
    const above=a.anchors.filter(s=>s.step.device.w===a.target.device.w && s.step.family===a.target.family && /^h[1-6]$/.test(s.role) && Number(s.role.slice(1))<Number(a.id.slice(1)));
    if(above.length){a.values.size=Math.min(a.values.size,...above.map(s=>s.px));a.selected=[...new Map([...a.selected,...above].map(s=>[s.key,s])).values()];note(a,'heading-order','Başlık boyutu önceki üst düzey başlığı aşmaz.');}
  }},
  {id:'project-constraints',priority:40,when:()=>true,then:a=>{
    a.values=enforceRole(a.id,{...a.values,size:Math.round(a.values.size),mode:'static',sizes:null});
    const reading=['reading','long'].includes(ROLE[a.id].kind);
    const allowed=RECOMMENDED_LINE_HEIGHTS.filter(n=>!reading || n>=1.5);
    a.values.lh=allowed.reduce((best,n)=>Math.abs(n-a.values.lh)<Math.abs(best-a.values.lh)?n:best,allowed[0]);
    a.values.max=a.values.size;
    note(a,'project-constraints',`Tam sayı boyut, ${minSizeFor(a.id)} px proje alt sınırı ve izinli satır yüksekliği${reading?' (okuma için en az 1,5 proje tercihi)':''}.`);
  }},
  {id:'wcag-contrast',priority:50,when:()=>true,then:a=>{
    a.values={...a.values,c:{...a.values.c}};
    for(const theme of ['light','dark'] as const){
      const info=contrastInfo(a.values,a.id,theme);
      if(!info.pass){
        const gray=parseInt(a.values.c[theme].slice(1,3),16);
        const candidates=Array.from({length:129},(_,n)=>grayHex(theme==='light'?n:128+n)).filter(hex=>contrastInfo({...a.values,c:{...a.values.c,[theme]:hex}},a.id,theme).pass);
        a.values.c[theme]=candidates.reduce((best,hex)=>Math.abs(parseInt(hex.slice(1,3),16)-gray)<Math.abs(parseInt(best.slice(1,3),16)-gray)?hex:best,candidates[0]);
        note(a,'wcag-contrast',`${theme==='light'?'Açık':'Koyu'} ton, ilgili zeminlerde en az ${info.need}:1 için ${a.values.c[theme]} olarak düzeltildi.`);
      }
    }
  }},
];
export const DECISION_RULES=RULES.map(({id,priority,events})=>({id,priority,events:events??EVENTS}));
/** Deterministic ECA agenda: one forward pass, stable priorities, no recursive firing. */
export function evaluateDecision(f:FlowState,d:Decisions,target:FlowStep,id:string,event:DecisionEvent='step-entered'):Prediction{
  const base=baseline(target,id);
  const a:Agenda={event,target,id,base,values:{...base,c:{...base.c}},anchors:sources(f,d,target,id),selected:[],trace:[],evidence:'catalog'};
  for(const rule of [...RULES].sort((a,b)=>a.priority-b.priority))if((rule.events??EVENTS).includes(a.event) && rule.when(a))rule.then(a);
  if(!a.selected.length)a.trace.unshift({rule:'catalog',reason:'Henüz ilgili onay yok; güvenli katalog başlangıcı. İlk mobil kararın sonraki tahminlere kaynak olacak.'});
  return {values:a.values,sources:a.selected.map(s=>({key:s.key,fingerprint:s.fingerprint,label:`${s.step.device.w} px · ${ROLE[s.role].label}`})),trace:a.trace,checks:decisionChecks(a.values,id),evidence:a.evidence};
}
const entryState=(f:FlowState,key:string,entry:EngineEntry):FlowState=>({...f,engine:{version:1,entries:{...f.engine?.entries,[key]:entry}}});
function explicit(f:FlowState,d:Decisions,s:FlowStep,id:string){
  const state=d.contexts[s.ctx];
  return !!f.profiles?.[reviewKey(s,id)] || Object.keys(s.device.w===320?state.overrides[id]??{}:state.screens?.[id]?.[String(s.device.w)]??{}).length>0;
}
export function synchronizeDecision(f:FlowState,d:Decisions,s:FlowStep,id:string,event:DecisionEvent='step-entered',force=false):FlowState{
  const key=reviewKey(s,id),previous=f.engine?.entries[key];
  if((f.reviews[key] && (!force || isReviewed(f,d,s,id))) || (!force && (previous?.state==='manual' || previous?.state==='undone' || (!previous && explicit(f,d,s,id)))))return f;
  const prediction=evaluateDecision(f,d,s,id,event);
  const signature=JSON.stringify({version:1,values:prediction.values,sources:prediction.sources,trace:prediction.trace});
  if(!force && previous?.signature===signature)return f;
  const {undo:_undo,...snapshot}=previous??{};
  const undo:EngineEntry['undo']={profile:structuredClone(resolveAt(decisionsForStep(f,d,s),s.ctx,id,s.device.w)),entry:previous?snapshot as Omit<EngineEntry,'undo'>:null};
  const cause:DecisionEvent=force?'recalculate':previous?(prediction.sources.some(source=>!previous.sources.some(old=>old.key===source.key && old.fingerprint===source.fingerprint))?'decision-approved':'decision-changed'):event;
  const next=entryState(f,key,{undo,version:1,event:cause,state:'automatic',original:previous?previous.original:structuredClone(resolveAt(decisionsForStep(f,d,s),s.ctx,id,s.device.w)),signature,sources:prediction.sources,trace:prediction.trace,evidence:prediction.evidence});
  return {...next,profiles:{...next.profiles,[key]:prediction.values}};
}
export function lockDecision(f:FlowState,d:Decisions,s:FlowStep,id:string,patch:RoleOverrides):FlowState{
  const key=reviewKey(s,id),entry=f.engine?.entries[key];
  const values=enforceRole(id,{...resolveAt(decisionsForStep(f,d,s),s.ctx,id,s.device.w),...patch});
  const next=entryState(f,key,{undo:entry?.undo,version:1,event:'decision-changed',state:'manual',original:entry?entry.original:structuredClone(resolveAt(decisionsForStep(f,d,s),s.ctx,id,s.device.w)),signature:'',sources:[],trace:[{rule:'manual',reason:'Bu karar elle düzenlendi; otomatik güncellemeden korunuyor.'}],evidence:entry?.evidence??'catalog'});
  return {...next,profiles:{...f.profiles,[key]:values}};
}
export function undoDecision(f:FlowState,s:FlowStep,id:string):FlowState{
  const key=reviewKey(s,id),entry=f.engine?.entries[key];
  if(!entry || (f.reviews[key] && entry.event!=='recalculate'))return f;
  const snapshot=entry.undo;
  const previous=snapshot?snapshot.profile:entry.original;
  const profiles={...f.profiles};if(previous)profiles[key]=previous;else delete profiles[key];
  const restored=snapshot?.entry;
  const next:EngineEntry=restored?{...restored,state:restored.state==='automatic'?'undone':restored.state,undo:undefined}:{...entry,state:'undone',sources:[],signature:'',undo:undefined,trace:[{rule:'undo',reason:'Otomatik uygulama geri alındı; yeniden hesapla seçilene kadar korunur.'}]};
  return {...entryState(f,key,next),profiles};
}
