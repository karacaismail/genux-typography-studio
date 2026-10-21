import { contrastInfo, enforceRole, grayHex, minSizeFor, recommendedRole, RECOMMENDED_LINE_HEIGHTS, ROLE, PROPS, eqProp, CTX_DEF, resolveAt, sizeAt, type Decisions, type RoleOverrides, type RoleProps, type PropKey } from '../../core';
import { resolvePolicy, inferPolicyFromAnchors, constrainPrediction, accessibilityChecks, type TypographyPolicy } from './policy';
import { decisionsForStep, isReviewed, REVIEW_TARGETS, reviewKey, type FlowState, type FlowStep } from './model';
import { ENGINE_VERSION, dependencyToken, type EngineSnapshot, type DecisionEvent, type DecisionSource, type EngineEntry, type RuleTrace } from './engineState';

export interface DecisionCheck { id:string; pass:boolean; detail:string; blocking?:boolean }
export function decisionChecks(values:RoleProps,id:string,width?:number,policy?:TypographyPolicy):DecisionCheck[]{
  if(width!==undefined && policy)return accessibilityChecks(values,id,width,policy);
  return [
    {id:'project-minimum',pass:values.size>=minSizeFor(id),detail:`Proje alt sınırı ${minSizeFor(id)} px`},
    ...(['light','dark'] as const).map(theme=>{const c=contrastInfo({...values,mode:'static',max:values.size,sizes:null},id,theme);return {id:`contrast-${theme}`,pass:c.pass,detail:`${theme==='light'?'Açık':'Koyu'}: ${c.ratio.toFixed(2)}:1 / gereken ${c.need}:1`};}),
  ];
}
interface Anchor { key:string; step:FlowStep; role:string; values:RoleProps; px:number; fingerprint:string }
export interface FieldSource {label:string;reason:string}
export interface Prediction { fieldSources:Partial<Record<PropKey,FieldSource>>; values:RoleProps; sources:DecisionSource[]; trace:RuleTrace[]; checks:DecisionCheck[]; evidence:EngineEntry['evidence'] }
const EVENTS:DecisionEvent[]=['step-entered','decision-approved','decision-changed','recalculate'];
interface Agenda { policy:TypographyPolicy; configured:boolean; selectedPolicy:boolean; ratio:number; checks:DecisionCheck[]; event:DecisionEvent; target:FlowStep; id:string; base:RoleProps; values:RoleProps; anchors:Anchor[]; selected:Anchor[]; trace:RuleTrace[]; evidence:EngineEntry['evidence'] }
interface Rule { id:string; priority:number; events?:DecisionEvent[]; when:(a:Agenda)=>boolean; then:(a:Agenda)=>void }
const rank={mobile:0,tablet:1,laptop:2,desktop:3,tv:4};
const bound=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
const median=(values:number[])=>{const sorted=[...values].sort((a,b)=>a-b);return (sorted[Math.floor((sorted.length-1)/2)]+sorted[Math.floor(sorted.length/2)])/2;};
const note=(a:Agenda,rule:string,reason:string)=>a.trace.push({rule,reason});
const baseline=(s:FlowStep,id:string)=>recommendedRole(s.ctx,id,s.device.w);
export function inheritedValue(f:FlowState,d:Decisions,s:FlowStep,id:string){
 // Transient shadow map avoids copying the complete ledger for each target. Never persisted.
 const profiles=Object.create(f.profiles??null) as NonNullable<FlowState['profiles']>;
 Object.defineProperty(profiles,reviewKey(s,id),{value:undefined});
 return resolveAt(decisionsForStep({...f,profiles},d,s),s.ctx,id,s.device.w);
}
const anchorCache=new WeakMap<FlowState,WeakMap<Decisions,Map<string,Anchor[]>>>();
function sources(f:FlowState,d:Decisions,target:FlowStep,id:string,forPolicy=false):Anchor[]{
  let byDecision=anchorCache.get(f);if(!byDecision)anchorCache.set(f,(byDecision=new WeakMap()));
  let index=byDecision.get(d);
  if(!index){
    index=new Map();byDecision.set(d,index);
    for(const [key,review] of Object.entries(f.reviews)){
      const item=REVIEW_TARGETS.get(key);if(!item || !isReviewed(f,d,item.step,item.role))continue;
      const clean=resolveAt(decisionsForStep(f,d,item.step),item.step.ctx,item.role,item.step.device.w);
      const px=Math.round(sizeAt(clean,d.contexts[item.step.ctx].settings,item.role,item.step.device.w));
      if(!decisionChecks({...clean,size:px,mode:'static',sizes:null,max:px},item.role).every(c=>c.pass))continue;
      const name=`${item.step.ctx}:${item.role}`;
      const list=index.get(name)??[];list.push({key,step:item.step,role:item.role,values:clean,px,fingerprint:review.fingerprint});index.set(name,list);
    }
  }
  const roles=forPolicy?target.roles:target.roles.slice(0,target.roles.indexOf(id)+1);
  if(!roles.includes(id))roles.push(id);
  const candidates=roles.flatMap(role=>[...(index.get(`${target.ctx}:${role}`)??[]),...(target.ctx!=='html'&&ROLE[role].el?index.get(`html:${role}`)??[]:[])]);
  return candidates.filter(item=>item.step.device.w<=target.device.w && rank[item.step.family]<=rank[target.family] && item.key!==reviewKey(target,id) && (!forPolicy || item.step.device.w<target.device.w || rank[item.step.family]<rank[target.family] || target.roles.indexOf(item.role)<target.roles.indexOf(id)));
}
const RULES:Rule[]=[
  {id:'source-event',priority:0,events:['decision-approved','decision-changed','recalculate'],when:()=>true,then:a=>note(a,'source-event',`Olay: ${a.event}; bağımlı hedef ajandası güncellendi.`)},
  {id:'same-role-transfer',priority:10,when:a=>a.anchors.some(s=>s.role===a.id),then:a=>{
    const own=a.anchors.filter(s=>s.role===a.id && s.step.ctx===a.target.ctx);
    const candidates=(own.length?own:a.anchors.filter(s=>s.role===a.id)).sort((x,y)=>y.step.device.w-x.step.device.w || rank[y.step.family]-rank[x.step.family]);
    // One vote per viewport; related device shells do not multiply evidence.
    const selected=[...new Map([...candidates].reverse().map(s=>[s.step.device.w,s])).values()].sort((x,y)=>y.step.device.w-x.step.device.w).slice(0,5);
    const nearest=selected[0];a.selected=selected;a.evidence='same-role';
    const ratios=selected.map(s=>s.px/baseline(s.step,s.role).size);
    const scale=median(ratios);
    let size=Math.max(nearest.px,baseline(a.target,a.id).size*scale);
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
    a.values={...a.values,...nearest.values,...(nearest.step.ctx!==a.target.ctx ? CTX_DEF[a.target.ctx][a.id]??{}:{}),size:Math.round(size)};
    note(a,'same-role-transfer',`${nearest.step.device.w} px ${ROLE[a.id].label} kararı; yeni ekran için ${Math.round(size)} px.`);
  }},
  {id:'related-role-scale',priority:20,when:a=>a.selected.length===0 && a.anchors.length>0,then:a=>{
    const own=a.anchors.filter(s=>s.step.ctx===a.target.ctx);
    const pool=own.length?own:a.anchors;
    const current=pool.filter(s=>s.step.device.w===a.target.device.w && s.step.family===a.target.family);
    const candidates=current.length?current:pool;
    const selected=[...candidates].sort((x,y)=>y.step.device.w-x.step.device.w || a.target.roles.indexOf(y.role)-a.target.roles.indexOf(x.role)).slice(0,5);
    a.selected=selected;a.evidence='related';
    const scale=median(selected.map(s=>s.px/baseline(s.step,s.role).size));
    const weight=median(selected.map(s=>s.values.w-baseline(s.step,s.role).w));
    const leading=median(selected.map(s=>s.values.lh/baseline(s.step,s.role).lh));
    a.values={...a.values,size:Math.round(a.base.size*scale),w:Math.round((a.base.w+weight)/100)*100,lh:a.base.lh*leading,c:{...selected[0].values.c}};
    note(a,'related-role-scale',`${selected.map(s=>ROLE[s.role].label).join(', ')} onaylarından tipografik oran, ağırlık farkı ve satır ritmi taşındı.`);
  }},
  {id:'selected-policy',priority:25,when:a=>a.configured,then:a=>{
    const p=a.policy,level=/^h[1-6]$/.test(a.id)?Number(a.id.slice(1)):0;
    const same=a.selected.find(s=>s.role===a.id);
    if(same){const growth=Math.pow(p.growth,Math.max(0,Math.log(a.target.device.w/same.step.device.w)/Math.log(6)));a.values.size=Math.round(same.px*growth);}
    if(level && a.selectedPolicy && p.lineHeightStrategy==='reading')a.values.lh=a.values.size>=48?1.1:a.values.size>=32?1.25:a.values.size>=24?1.3:1.5;
    if(level){a.values.ls=p.tracking;const source=a.selected.find(s=>/^h[1-6]$/.test(s.role));const delta=source?level-Number(source.role.slice(1)):0;a.values.w=bound((source?.values.w??a.base.w)-delta*p.weightStep,300,900);}
    if(['reading','long'].includes(ROLE[a.id].kind))a.values.mw=p.lineLength;
    if(p.verticalRhythm>0){for(const k of ['mt','mb'] as const)a.values[k]=Math.round(a.values[k]*a.values.size/p.verticalRhythm)*p.verticalRhythm/a.values.size;}
    note(a,'selected-policy','Seçili/çıkarılmış kural: büyüme, ağırlık merdiveni, harf aralığı, satır uzunluğu ve dikey ritim.');
  }},
  {id:'heading-order',priority:30,when:a=>/^h[1-6]$/.test(a.id),then:a=>{
    const level=Number(a.id.slice(1));
    if(!a.anchors.some(s=>/^h[1-6]$/.test(s.role))){
      let ceiling=baseline(a.target,'h1').size;
      for(let i=1;i<level;i++)ceiling=Math.floor(ceiling/a.ratio);
      a.values.size=Math.max(minSizeFor(a.id),Math.min(a.values.size,ceiling));
      a.checks.push({id:'heading-ratio',pass:ceiling>=minSizeFor(a.id),detail:`Oran ${a.ratio}; katalog H1 çapasıyla ${ceiling} px üst sınırı${ceiling<minSizeFor(a.id)?'; minimum ile çakışıyor':''}.`});
    }
    const aboveCandidates=a.anchors.filter(s=>/^h[1-6]$/.test(s.role) && Number(s.role.slice(1))<level).sort((x,y)=>Number(y.step.ctx===a.target.ctx)-Number(x.step.ctx===a.target.ctx) || y.step.device.w-x.step.device.w);
    const above=[...new Map([...aboveCandidates].reverse().map(source=>[source.role,source])).values()];
    if(above.length){
      const maximum=Math.min(...above.map(s=>Math.floor(Math.max(s.px,baseline(a.target,s.role).size*s.px/baseline(s.step,s.role).size)/Math.pow(a.ratio,level-Number(s.role.slice(1))))));
      const minimum=minSizeFor(a.id);
      a.values.size=Math.max(minimum,Math.min(a.values.size,maximum));
      a.checks.push({id:'heading-ratio',pass:minimum<=maximum,detail:`Başlık oranı en az ${a.ratio}; ${minimum>maximum?'çakışma: proje minimumu oranı engelliyor':`üst sınır ${maximum} px`}`});
      a.selected=[...new Map([...a.selected,...above].map(s=>[s.key,s])).values()];
      note(a,'heading-order',`Seçili başlık oranı ${a.ratio}; tam sayı yuvarlama aşağı uygulanır.`);
    }
  }},
  {id:'project-constraints',priority:40,when:()=>true,then:a=>{
    a.values=enforceRole(a.id,{...a.values,w:bound(Math.round(a.values.w/100)*100,300,900),size:Math.round(a.values.size),mode:'static',sizes:null});
    const reading=['reading','long'].includes(ROLE[a.id].kind);
    const allowed=RECOMMENDED_LINE_HEIGHTS.filter(n=>!reading || a.policy.lineHeightStrategy==='preserve' || n>=1.5);
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
export const DECISION_RULES=RULES.map(({id,priority,events})=>({id,version:ENGINE_VERSION,scope:'context-forward',priority,events:events??EVENTS}));
/** Stable priority agenda: each action emits a sparse field delta; final constraints have precedence. */
export function evaluateDecision(f:FlowState,d:Decisions,target:FlowStep,id:string,event:DecisionEvent='step-entered'):Prediction{
  const raw=inheritedValue(f,d,target,id);
  const base={...raw,size:Math.round(sizeAt(raw,d.contexts[target.ctx].settings,id,target.device.w))};
  const selected=resolvePolicy(f,d,target.ctx);
  const eligible=sources(f,d,target,id,true);
  const ownPolicy=eligible.filter(source=>source.step.ctx===target.ctx);
  const policyPool=ownPolicy.length?ownPolicy:eligible;
  const policyRoles=/^h[1-6]$/.test(id)?[id,'h1','h2','h3']:[id,'body','paragraph','long'];
  const policyAnchors=policyRoles.flatMap(role=>policyPool.filter(source=>source.role===role).sort((x,y)=>y.step.device.w-x.step.device.w).slice(0,5));
  const uniquePolicy=[...new Map(policyAnchors.map(source=>[source.key,source])).values()];
  const learned=inferPolicyFromAnchors(uniquePolicy.map(source=>({step:source.step,role:source.role,value:{...source.values,size:source.px}})),d);
  const configured=!!f.policies?.[target.ctx] || !!f.policies?.html;
  const policy=configured?selected:{...selected,...learned,headingRatio:Math.max(d.ratio,learned?.headingRatio??selected.headingRatio)};
  const a:Agenda={policy,selectedPolicy:configured,configured:configured || !!learned,ratio:policy.headingRatio,checks:[],event,target,id,base,values:{...base,c:{...base.c}},anchors:sources(f,d,target,id),selected:[],trace:[],evidence:'catalog'};
  const fieldSources:Prediction['fieldSources']=Object.fromEntries(PROPS.map(prop=>[prop,{label:'Kalıtılan değer',reason:'Kullanıcının mevcut çözümü; katalog yalnız kalıtım zincirinin sonunda.'}]));
  for(const rule of [...RULES].sort((a,b)=>a.priority-b.priority))if((rule.events??EVENTS).includes(a.event) && rule.when(a)){
    const before=structuredClone(a.values);rule.then(a);
    for(const prop of PROPS)if(!eqProp(prop,before[prop],a.values[prop]))fieldSources[prop]={label:rule.id,reason:a.trace[a.trace.length-1]?.reason??rule.id};
  }
  const guarded=constrainPrediction(a.values,id,target.device.w,policy);
  for(const prop of PROPS)if(!eqProp(prop,a.values[prop],guarded.values[prop]))fieldSources[prop]={label:'Proje / erişilebilirlik',reason:'Son kısıt denetimi, boyut, ağırlık, satır yüksekliği, bağlantı ve zemin kontrastı.'};
  a.values=guarded.values;
  const prior=a.selected.filter(source=>source.role===id && source.step.family===target.family && source.step.device.w<target.device.w);
  if(prior.some(source=>source.px>a.values.size))a.checks.push({id:'responsive-monotonic',pass:false,detail:'Çakışma: metin sığma sınırı önceki insan boyutundan küçük; otomatik kabul edilmez.'});
  if(!a.selected.length)a.trace.unshift({rule:'catalog',reason:'Henüz ilgili onay yok; güvenli katalog başlangıcı. İlk mobil kararın sonraki tahminlere kaynak olacak.'});
  const provenance=[...new Map([...a.selected,...(learned&&!configured?uniquePolicy:[])].map(source=>[source.key,source])).values()];
  return {fieldSources,values:a.values,sources:provenance.map(s=>({key:s.key,fingerprint:dependencyToken(s.fingerprint),label:`${s.step.ctx!==target.ctx?'HTML kalıtımı · ':''}${s.step.device.w} px · ${ROLE[s.role].label}`})),trace:a.trace,checks:[...guarded.checks,...a.checks],evidence:a.evidence};
}
const entryState=(f:FlowState,key:string,entry:EngineEntry):FlowState=>({...f,engine:{version:1,entries:{...f.engine?.entries,[key]:entry}}});
export function hasExplicitDecision(f:FlowState,d:Decisions,s:FlowStep,id:string){
  const state=d.contexts[s.ctx];
  return !!f.profiles?.[reviewKey(s,id)] || Object.keys(state.overrides[id]??{}).length>0 || Object.entries(state.screens?.[id]??{}).some(([width,patch])=>Number(width)<=s.device.w && Object.keys(patch).length>0) || (s.ctx!=='html' && !!ROLE[id].el && (Object.keys(d.contexts.html.overrides[id]??{}).length>0 || Object.entries(d.contexts.html.screens?.[id]??{}).some(([width,patch])=>Number(width)<=s.device.w && Object.keys(patch).length>0)));
}
export function synchronizeDecision(f:FlowState,d:Decisions,s:FlowStep,id:string,event:DecisionEvent='step-entered',force=false):FlowState{
  const key=reviewKey(s,id),previous=f.engine?.entries[key];
  if((f.reviews[key] && (!force || isReviewed(f,d,s,id))) || (!force && (previous?.state==='manual' || previous?.state==='undone' || (!previous && hasExplicitDecision(f,d,s,id)))))return f;
  const prediction=evaluateDecision(f,d,s,id,event);
  const issues=prediction.checks.filter(check=>!check.pass && check.blocking!==false).map(check=>check.detail);
  const signature=dependencyToken(JSON.stringify({version:ENGINE_VERSION,values:prediction.values,sources:prediction.sources,issues}));
  if(!force && previous?.signature===signature)return f;
  const {undo:_undo,past:_past,future:_future,...snapshot}=previous??{};
  const undo:EngineEntry['undo']={profile:structuredClone(resolveAt(decisionsForStep(f,d,s),s.ctx,id,s.device.w)),entry:previous?snapshot as Omit<EngineEntry,'undo'>:null};
  const cause:DecisionEvent=force?'recalculate':previous?(prediction.sources.some(source=>!previous.sources.some(old=>old.key===source.key && old.fingerprint===source.fingerprint))?'decision-approved':'decision-changed'):event;
  const next=entryState(f,key,{past:previous?[...(previous.past??[]),snapshotOf(f,key)].slice(-20):[],future:[],undo:prediction.sources.length || previous?undo:undefined,ruleVersion:ENGINE_VERSION,issues,version:1,event:cause,state:issues.length || ((previous?.state==='auto'||previous?.state==='conflict')&&!prediction.sources.length)?'conflict':previous?.state==='auto'?'auto':'automatic',original:previous?previous.original:structuredClone(resolveAt(decisionsForStep(f,d,s),s.ctx,id,s.device.w)),signature,sources:prediction.sources,trace:prediction.trace,evidence:prediction.evidence});
  const base=inheritedValue(f,d,s,id);
  const patch=Object.fromEntries(PROPS.filter(prop=>!eqProp(prop,base[prop],prediction.values[prop])).map(prop=>[prop,prediction.values[prop]]));
  return {...next,profiles:{...next.profiles,[key]:patch}};
}
export function lockDecision(f:FlowState,d:Decisions,s:FlowStep,id:string,patch:RoleOverrides):FlowState{
  const key=reviewKey(s,id),entry=f.engine?.entries[key];
  const values=enforceRole(id,{...resolveAt(decisionsForStep(f,d,s),s.ctx,id,s.device.w),...patch});
  const next=entryState(f,key,{past:[...(entry?.past??[]),snapshotOf(f,key)].slice(-20),future:[],undo:entry?.undo,ruleVersion:ENGINE_VERSION,version:1,event:'decision-changed',state:'manual',original:entry?entry.original:structuredClone(resolveAt(decisionsForStep(f,d,s),s.ctx,id,s.device.w)),signature:'',sources:[],trace:[{rule:'manual',reason:'Bu karar elle düzenlendi; otomatik güncellemeden korunuyor.'}],evidence:entry?.evidence??'catalog'});
  return {...next,profiles:{...f.profiles,[key]:values}};
}
function snapshotOf(f:FlowState,key:string):EngineSnapshot{
  const current=f.engine?.entries[key];
  if(!current)return {profile:f.profiles?.[key]?structuredClone(f.profiles[key]):null,entry:null};
  const {undo:_undo,past:_past,future:_future,...entry}=current;
  return {profile:f.profiles?.[key]?structuredClone(f.profiles[key]):null,entry};
}
export function undoDecision(f:FlowState,s:FlowStep,id:string):FlowState{
  const key=reviewKey(s,id),entry=f.engine?.entries[key];
  if(!entry || (f.reviews[key] && entry.event!=='recalculate'))return f;
  const past=entry.past??[];
  const snapshot=past[past.length-1]??entry.undo;
  if(!snapshot)return f;
  const profiles={...f.profiles};if(snapshot.profile)profiles[key]=snapshot.profile;else delete profiles[key];
  const restored:EngineEntry={...(snapshot.entry??entry),state:'undone',past:past.slice(0,-1),future:[snapshotOf(f,key),...(entry.future??[])].slice(0,20),undo:undefined};
  return {...entryState(f,key,restored),profiles};
}
export function redoDecision(f:FlowState,s:FlowStep,id:string):FlowState{
  const key=reviewKey(s,id),entry=f.engine?.entries[key];const snapshot=entry?.future?.[0];
  if(!entry || !snapshot || f.reviews[key])return f;
  const profiles={...f.profiles};if(snapshot.profile)profiles[key]=snapshot.profile;else delete profiles[key];
  const restored:EngineEntry={...(snapshot.entry??entry),past:[...(entry.past??[]),snapshotOf(f,key)].slice(-20),future:entry.future?.slice(1),undo:undefined};
  return {...entryState(f,key,restored),profiles};
}
