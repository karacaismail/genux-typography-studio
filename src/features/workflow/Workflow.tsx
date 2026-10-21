import { JOURNAL_KEY, readJournal, clearJournal, restoreJournal, writeJournal,type JournalWorkspace } from './journal';
import { useRouter, useRouterState } from '@tanstack/react-router';
import { projectWorkflowDecisions, reconcileEditorChanges, snapshotEditorProjection } from './projection';
import { evaluateDecision, synchronizeDecision, lockDecision, undoDecision, redoDecision, decisionChecks } from './engine';
import { DecisionEnginePanel } from './DecisionEnginePanel';
import { Accordion, Alert, Badge, Button, FileButton, Group, Radio, SegmentedControl, Select, Stack, Textarea, useMantineColorScheme } from '@mantine/core';
import { DeviceMobileIcon, DeviceTabletIcon, LaptopIcon, MonitorIcon, TelevisionIcon, ArrowLeftIcon, ArrowRightIcon, CheckCircleIcon, DownloadSimpleIcon, FloppyDiskIcon, MoonIcon, SunIcon } from '@phosphor-icons/react';
import { lazy, Suspense, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { CHOICES, CONTEXTS, ROLE, buildExport, contextLabel, importData, minSizeFor, resolveAt, sizeAt, type PropKey, type RoleOverrides, type Theme } from '../../core';
import { useStudio } from '../../store/studio';
import { writeStored } from '../../store/persist';
import { useStudioSearch } from '../../app/useStudioSearch';
import { ColorField } from '../inspector/ColorSection';
import { DeviceStage } from '../canvas/DeviceStage';
import { downloadText, stamp } from '../io/download';
import { FLOW_KEY, FLOW_STEPS, FAMILY_LABEL, WORKFLOW_DEVICES, REVIEW_TARGETS, canApproveDecision, decisionStatus, decisionsForStep, emptyFlow, isReviewed, parseFlow, reviewKey, stepDone, stepSettled, type Family, type FlowState } from './model';
import classes from './Workflow.module.scss';
import { createDebouncedWriter, prepareWorkflowImport, readWorkflow, writeWorkflow } from './persistence';
import { approveAndAdvance, readWorkflowLocation, resolveWorkflowLocation, workflowLocation } from './navigation';
import { canvasVars } from '../canvas/canvasVars';
import { GroupPreview } from './GroupPreview';
import { StepLabel } from './StepLabel';
import { BreakpointChoice } from './BreakpointChoice';
import { NumberStepper } from './NumberStepper';
import { LineHeightChoice } from './LineHeightChoice';
import { FieldEvidence } from '../recommendations/FieldEvidence';
import { RecommendationLabel, RecommendationMark } from '../recommendations/Recommendation';
import { DeviceLineTests } from './DeviceLineTests';
import { OrientationChoice } from './OrientationChoice';
import { orientedViewport, supportsOrientation, type Orientation } from './orientation';
import { WorkflowProgress } from './WorkflowProgress';
import { runDecisionEvent, refreshEngine, engineCounts, type DecisionScope } from './propagation';
import { PolicyEditor } from './PolicyEditor';
import { headingRatioCheck, inferPolicy, resolvePolicy, type TypographyPolicy } from './policy';

const Examples = lazy(() => import('./Examples').then((m) => ({default:m.Examples})));
const cleanNotes = (raw:unknown): Record<string,string> => raw && typeof raw==='object' ? Object.fromEntries(Object.entries(raw).filter(([,v])=>typeof v==='string')) : {};
function readInitial() {
  try { const raw=localStorage.getItem(FLOW_KEY); const value=raw ? JSON.parse(raw) : null; return {flow:value ? parseFlow(value) : emptyFlow(),notes:cleanNotes(value?.notes),error:''}; }
  catch { return {flow:emptyFlow(),notes:{},error:'İlerleme kaydı okunamadı. Eski kayıt korunuyor; JSON yedeğini içe aktarabilir veya yeni akış başlatabilirsiniz.'}; }
}
const FAMILY_ICONS = { mobile:DeviceMobileIcon, tablet:DeviceTabletIcon, laptop:LaptopIcon, desktop:MonitorIcon, tv:TelevisionIcon };
const FAMILIES = Object.keys(FAMILY_LABEL) as Family[];
const FORMAT_FIELDS = ['ff','fst','td','num','ta','wrap'] as const;
export function Workflow({ onOpenEditor, entryQuery }: {onOpenEditor:()=>void;entryQuery?:string}) {
  const router=useRouter();
  const rawSearch=useRouterState({select:state=>state.location.searchStr});
  const initialLocation=useRef(readWorkflowLocation(entryQuery??window.location.search));
  const lastUrl=useRef(rawSearch);
  const [initial] = useState(()=>{const stored=readInitial();return {...stored,flow:resolveWorkflowLocation(stored.flow,initialLocation.current)};});
  const [loaded,setLoaded]=useState(false);
  const [handoffPending,setHandoffPending]=useState(false);
  const handoffBusy=useRef(false);
  const [recoveryAvailable,setRecoveryAvailable]=useState(false);
  const durable=useRef<JournalWorkspace>({flow:initial.flow,notes:initial.notes});
  const inFlight=useRef<JournalWorkspace[]>([]);
  const journalRevision=useRef<string|undefined>(undefined);
  useEffect(()=>{
    let alive=true;
    readWorkflow().then(raw=>{
      if(!alive)return;
      const stored=raw?{flow:parseFlow(raw),notes:cleanNotes((raw as Record<string,unknown>).notes),commit:typeof(raw as Record<string,unknown>)._commit==='string'?(raw as Record<string,unknown>)._commit as string:undefined}:{flow:initial.flow,notes:initial.notes};
      durable.current=stored;
      const text=readJournal();journalRevision.current=text??undefined;setRecoveryAvailable(!!text);
      if(text && text.length>1024*1024)throw new Error('Kurtarma kaydı çok büyük.');
      const recovery=text?restoreJournal(stored,JSON.parse(text)):{workspace:stored,conflicts:0,keys:[]};
      const d=useStudio.getState().decisions;
      let recovered=reconcileEditorChanges(recovery.workspace.flow,d);
      for(const key of recovery.keys){const target=REVIEW_TARGETS.get(key);if(target)recovered=runDecisionEvent(recovered,d,{type:isReviewed(recovered,d,target.step,target.role)?'decision-approved':'decision-changed',sourceKey:key});}
      setFlow(resolveWorkflowLocation(refreshEngine(recovered,d),initialLocation.current));setNotes(recovery.workspace.notes);
      setReadable(!recovery.conflicts);setError(recovery.conflicts?'Kurtarma kaydı güncel veritabanıyla çakışıyor. Her iki kayıt korunuyor; JSON yedeğini kontrol et.':'');
    }).catch(()=>{if(alive){setReadable(false);setError('İlerleme veya kurtarma kaydı okunamadı. Mevcut kayıt korunuyor; JSON yedeğini kontrol et.');}}).finally(()=>{if(alive)setLoaded(true);});
    return()=>{alive=false;};
  },[]);
  const [flow,setFlow] = useState<FlowState>(initial.flow);
  const [error,setError] = useState(initial.error);
  const [saved,setSaved] = useState('');
  const [readable,setReadable] = useState(!initial.error);
  const [search] = useStudioSearch();
  const decisions = useStudio((s)=>s.decisions);
  const index = Math.max(0,FLOW_STEPS.findIndex((s)=>s.key === flow.cursor));
  const step=FLOW_STEPS[index];
  const id=step.roles.includes(flow.role) ? flow.role : step.roles[0];
  const def=ROLE[id]; const width=step.device.w;
  const effective=useMemo(()=>decisionsForStep(flow,decisions,step),[flow,decisions,step]);
  const r=resolveAt(effective,step.ctx,id,width); const settings=effective.contexts[step.ctx].settings;
  const px=Math.round(sizeAt(r,settings,id,width));
  const prediction=useMemo(()=>evaluateDecision(flow,decisions,step,id),[flow,decisions,step,id]);
  const [forecastExpanded,setForecastExpanded]=useState(false);
  const forecastFlow=useDeferredValue(flow),forecastDecisions=useDeferredValue(decisions);
  const forecast=useMemo(()=>{
    if(!forecastExpanded)return [];
    return FLOW_STEPS.filter(target=>target.roles.includes(id) && (target.ctx===step.ctx || step.ctx==='html')).map(target=>({
      label:`${contextLabel(target.ctx)} · ${FAMILY_LABEL[target.family]} · ${target.device.w} px · ${ROLE[id].label}`,
      size:evaluateDecision(forecastFlow,forecastDecisions,target,id).values.size,
    }));
  },[forecastExpanded,forecastFlow,forecastDecisions,step.ctx,id]);
  const recommended=prediction.values;
  const engineEntry=flow.engine?.entries[reviewKey(step,id)];
  const policy=useMemo(()=>resolvePolicy(flow,decisions,step.ctx),[flow,decisions,step.ctx]);
  const inferredPolicy=useMemo(()=>inferPolicy(flow,decisions,step.ctx),[flow,decisions,step.ctx]);
  const checkValues={...r,size:px,mode:'static' as const,max:px,sizes:null};
  const checks=decisionChecks(checkValues,id,width,policy);
  if(/^h[1-6]$/.test(id))for(const other of step.roles.filter(role=>/^h[1-6]$/.test(role) && role!==id)){
    const key=reviewKey(step,other),otherState=flow.engine?.entries[key]?.state;
    if(otherState==='automatic' || otherState==='undone' || otherState==='stale' || otherState==='conflict' || (!flow.profiles?.[key] && !flow.reviews[key]))continue;
    const otherRole=resolveAt(effective,step.ctx,other,width),otherSize=Math.round(sizeAt(otherRole,settings,other,width));
    const upper=Number(id.slice(1))<Number(other.slice(1));
    const check=headingRatioCheck(upper?px:otherSize,upper?otherSize:px,policy,Math.abs(Number(id.slice(1))-Number(other.slice(1))));
    checks.push({...check,id:`heading-ratio-${other}`});
  }
  useEffect(()=>{if(loaded && !handoffPending)setFlow(f=>synchronizeDecision(f,decisions,step,id));},[loaded,handoffPending,decisions,step,id,flow]);
  const [scheme,setScheme]=useState<Theme>('light');
  const [placement,setPlacement]=useState('page');
  const [zoom,setZoom]=useState<'fit'|'actual'>('actual');
  const [orientation,setOrientation]=useState<Orientation>('portrait');
  const [screenMode,setScreenMode]=useState('content');
  const viewport=orientedViewport(step.device,orientation);
  const {colorScheme,toggleColorScheme}=useMantineColorScheme();
  const [notes,setNotes]=useState<Record<string,string>>(initial.notes);
  const canApprove=canApproveDecision(flow,decisions,step,id,{reason:notes[reviewKey(step,id)]});
  const counts=useMemo(()=>engineCounts(flow,decisions),[flow,decisions]);
  const humanDecisions=useMemo(()=>Object.keys(flow.reviews).filter(key=>{const target=REVIEW_TARGETS.get(key);return target && isReviewed(flow,decisions,target.step,target.role);}).length,[flow,decisions]);
  const reviewQueue=useMemo(()=>[...new Set([...Object.keys(flow.reviews),...Object.keys(flow.engine?.entries??{})])].flatMap(key=>{
    const target=REVIEW_TARGETS.get(key);if(!target)return [];
    const pending=flow.engine?.entries[key]?.state==='conflict' || decisionStatus(flow,decisions,target.step,target.role)==='stale';
    return pending?[{key,...target}]:[];
  }),[flow,decisions]);
  const currentSearch={...search,...workflowLocation(flow)};
  const latest=useRef({flow,decisions,search:currentSearch,notes}); latest.current={flow,decisions,search:currentSearch,notes};
  const [storageWritable,setStorageWritable]=useState(true);
  const reportStorageError=()=>{setStorageWritable(false);setError('Tarayıcıya kayıt yapılamadı. Çalışmanı kaybetmemek için JSON indir.');};
  const writer=useMemo(()=>createDebouncedWriter(async(cur:typeof latest.current)=>{
    const snapshot={flow:cur.flow,notes:cur.notes,commit:crypto.randomUUID()};inFlight.current.push(snapshot);
    try{await writeWorkflow({...cur.flow,notes:cur.notes,_commit:snapshot.commit});durable.current=snapshot;}finally{inFlight.current=inFlight.current.filter(item=>item!==snapshot);}
    if(cur.flow!==latest.current.flow || cur.decisions!==latest.current.decisions || cur.notes!==latest.current.notes)return;
    if(!writeStored(cur.decisions,{...cur.search,tourDone:true}))throw new Error('Kararlar saklanamadı.');
    if(journalRevision.current && localStorage.getItem(JOURNAL_KEY)===journalRevision.current){clearJournal(journalRevision.current);journalRevision.current=undefined;setRecoveryAvailable(false);}
    setStorageWritable(true);setSaved(new Intl.DateTimeFormat('tr-TR',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Istanbul'}).format(new Date()));
  },reportStorageError),[]);
  const persist=async()=>{
    if(!readable || !loaded)return false;
    try{try{journalRevision.current=writeJournal(durable.current,latest.current,inFlight.current);}catch{/* IndexedDB may still commit even if emergency storage is full. */}await writer.flushImmediate(latest.current);return true;}catch{reportStorageError();return false;}
  };
  useEffect(()=>{
    if(readable && loaded && !handoffPending){setSaved('');writer.schedule(latest.current);}
    return ()=>writer.cancel();
  },[flow,decisions,notes,readable,loaded,handoffPending,writer]);
  useEffect(()=>{
    const save=()=>{
      if(!readable || !loaded || handoffPending)return;
      try{journalRevision.current=writeJournal(durable.current,latest.current,inFlight.current);}catch{reportStorageError();}
      // localStorage is synchronous; do not defer this exit snapshot behind IndexedDB.
      if(!writeStored(latest.current.decisions,{...latest.current.search,tourDone:true}))reportStorageError();
      void writer.flushImmediate(latest.current).catch(reportStorageError);
    };
    window.addEventListener('pagehide',save);
    return ()=>window.removeEventListener('pagehide',save);
  },[readable,loaded,handoffPending,writer]);
  useEffect(()=>{
    if(!loaded || handoffPending)return;
    if(rawSearch!==lastUrl.current){
      lastUrl.current=rawSearch;
      setFlow(current=>resolveWorkflowLocation(current,readWorkflowLocation(rawSearch)));
      return;
    }
    const selection=workflowLocation(flow), params=new URLSearchParams(rawSearch);
    if(params.get('ctx')===selection.ctx && params.get('device')===selection.device && params.get('role')===selection.role)return;
    for(const [key,value] of Object.entries(selection))params.set(key,value);
    const next=`?${params.toString()}`;lastUrl.current=next;
    // Router history retains workflow-only TV/monitor IDs that the free editor validator lacks.
    router.history.replace(`${window.location.pathname}${next}${window.location.hash}`);
  },[rawSearch,flow,loaded,handoffPending,router]);
  const done=useMemo(()=>FLOW_STEPS.filter((s)=>stepDone(flow,decisions,s)).length,[flow,decisions]);
  const groupReviewed=step.roles.filter((role)=>isReviewed(flow,decisions,step,role)).length;
  const currentReviewed=isReviewed(flow,decisions,step,id);
  const navigate=(i:number,role?:string)=>{const target=FLOW_STEPS[Math.max(0,Math.min(FLOW_STEPS.length-1,i))];setFlow((f)=>({...f,cursor:target.key,role:role ?? target.roles[0]}));};
  const patch=(p:RoleOverrides)=>setFlow(f=>{
    const currentDecisions=useStudio.getState().decisions;
    const changed=lockDecision(f,currentDecisions,step,id,p);
    return runDecisionEvent(changed,currentDecisions,{type:'decision-changed',sourceKey:reviewKey(step,id)});
  });
  const approveNext=()=>setFlow(current=>{
    const currentDecisions=useStudio.getState().decisions;
    const selected=workflowLocation(current),target=FLOW_STEPS.find(item=>item.key===current.cursor)??FLOW_STEPS[0];
    const sourceKey=reviewKey(target,selected.role);
    const next=approveAndAdvance(current,currentDecisions,new Date(),latest.current.notes[sourceKey]);
    return next.reviews[sourceKey]===current.reviews[sourceKey]?next:runDecisionEvent(next,currentDecisions,{type:'decision-approved',sourceKey});
  });
  const applyScope=(scope:DecisionScope)=>setFlow(f=>runDecisionEvent(f,useStudio.getState().decisions,{type:'recalculate',scope,accept:true}));
  const changePolicy=(value:TypographyPolicy)=>setFlow(f=>runDecisionEvent({...f,policies:{...f.policies,[step.ctx]:value}},useStudio.getState().decisions,{type:'recalculate',scope:{ctx:step.ctx},accept:true}));
  const applyInheritedPolicy=()=>setFlow(f=>CONTEXTS.filter(context=>context.id!=='html').reduce((next,context)=>runDecisionEvent(next,useStudio.getState().decisions,{type:'recalculate',scope:{ctx:context.id},accept:true}),f));
  const openEditor=async()=>{
    if(handoffBusy.current)return;
    handoffBusy.current=true;setHandoffPending(true);
    let completed=false;
    try{
      if(!await persist())return;
      const current=latest.current;
      const projected=projectWorkflowDecisions(current.flow,current.decisions);
      const handoff={...current.flow,editorBaseline:snapshotEditorProjection(current.flow,projected)};
      // Core workspace first: a failed write must never leave a false durable handoff marker.
      if(!writeStored(projected,{...current.search,tourDone:true}))throw new Error('Kararlar saklanamadı.');
      await writeWorkflow({...handoff,notes:current.notes});
      setFlow(handoff);useStudio.getState().replace(projected);completed=true;onOpenEditor();
    }catch{setStorageWritable(false);setError('Editöre aktarım kaydedilemedi. JSON indirerek yedekleyebilirsin.');}
    finally{if(!completed){handoffBusy.current=false;setHandoffPending(false);}}
  };
  const exportFile=()=>downloadText(`genux-karar-akisi-${stamp()}.json`,JSON.stringify({...buildExport(projectWorkflowDecisions(flow,decisions),'all'),workflow:{...flow,notes,completedGroups:done,totalGroups:FLOW_STEPS.length,order:'context > device family > width > group > role',profiles:flow.profiles ?? {},devices:WORKFLOW_DEVICES.map(({device,family})=>({id:device.id,family,widthPx:device.w,heightPx:device.h}))}},null,2));
  const [pendingImport,setPendingImport]=useState<unknown>();
  const [importMode,setImportMode]=useState('preserve');
  const applyImport=(data:unknown,replace=false)=>{
    try{
      const current=latest.current;
      const imported=prepareWorkflowImport(data,current.decisions,current.flow,current.notes,replace);
      useStudio.getState().replace(imported.decisions);setFlow(imported.flow);setNotes(imported.notes);
      setPendingImport(undefined);setError(imported.report.adjusted.length ? `${imported.report.adjusted.length} kesin kural düzeltmesi uygulandı.`:'');setReadable(true);
    }catch(e){setError(`İçe aktarılamadı: ${e instanceof Error ? e.message:String(e)}`);}
  };
  const importFile=async(file:File|null)=>{
    if(!file)return;
    try{
      if(file.size>64*1024*1024)throw new Error('Dosya 64 MiB sınırını aşıyor.');
      const data:unknown=JSON.parse(await file.text());
      importData(data,latest.current.decisions,workflowLocation(latest.current.flow).ctx);
      if(data && typeof data==='object' && !Array.isArray(data) && !Object.hasOwn(data,'workflow')){
        setImportMode('preserve');setPendingImport(data);
      }else applyImport(data);
    }catch(e){setError(`İçe aktarılamadı: ${e instanceof Error ? e.message:String(e)}`);}
  };
  const sourceFor=(key:PropKey)=>{
    if(engineEntry?.state==='manual')return {label:'Elle düzenlendi',reason:'Bu hedef kullanıcı tarafından değiştirildi; otomatik güncellemeden korunur.'};
    const source=prediction.fieldSources[key];
    const labels:Record<string,string>={'same-role-transfer':'Önceki insan kararı','related-role-scale':'İlişkili insan kararları','selected-policy':'Tipografi politikası','heading-order':'Başlık oranı','project-constraints':'Proje sınırları','wcag-contrast':'Zemin kontrastı'};
    return source?{...source,label:labels[source.label]??source.label}:undefined;
  };
  const field=(label:string,key:PropKey,min:number,max:number,increment:number,unit='')=><NumberStepper source={sourceFor(key)} label={label} recommended={Number(recommended[key])} value={Number(r[key])} min={min} max={max} step={increment} decimalScale={increment<1?3:0} suffix={unit} onChange={(v)=>{if(typeof v==='number')patch({[key]:v});}} />;
  const currentContrast=checks.find(check=>check.id===`contrast-${scheme}`);
  const statusLabel=(role:string)=>{const status=decisionStatus(flow,decisions,step,role);if(flow.reviews[reviewKey(step,role)]&&status!=='approved')return 'Yeniden incele';return status==='approved'?'Onaylandı':status==='auto'?'Motor kararı':status==='stale'?'İnceleme bekliyor':status==='manual'?'Elle düzenlendi':'Taslak';};
  const roleNavigator = (<div className={classes.roleStep}><StepLabel number={5}>Element</StepLabel><nav className={classes.roles} aria-label="Bu kümedeki elementler">{step.roles.map((role)=><button key={role} aria-label={ROLE[role].label} title={`${ROLE[role].label} · ${statusLabel(role)}`} aria-current={id===role?'true':undefined} onClick={()=>setFlow((f)=>({...f,role,cursor:step.key}))}>{isReviewed(flow,decisions,step,role) && <CheckCircleIcon size={16}/>} {ROLE[role].label}</button>)}</nav></div>);
  if(!loaded)return <div className={classes.root}><p className={classes.main} role="status">Karar kayıtları yükleniyor…</p></div>;
  return <div className={classes.root} inert={handoffPending} aria-busy={handoffPending}>
    <header className={classes.header}><div><span className={classes.brand}>GenUX</span><span className={classes.subtitle}>Karar akışı</span></div><div className={classes.headerProduct}><StepLabel number={1}>Ürün türü</StepLabel><Select aria-label="Ürün türü" value={step.ctx} allowDeselect={false} data={CONTEXTS.map(c=>({value:c.id,label:c.label}))} onChange={value=>{if(value)navigate(FLOW_STEPS.findIndex(item=>item.ctx===value));}}/></div><Radio.Group className={classes.devicePicker} classNames={{label:"gx-sr-only"}} label="Cihaz grubu" name="device-family" value={step.family} onChange={(v)=>navigate(FLOW_STEPS.findIndex((s)=>s.ctx===step.ctx && s.family===v))}><StepLabel number={2}>Cihaz grubu</StepLabel><div className={classes.deviceOptions}>{FAMILIES.map((f)=>{const Icon=FAMILY_ICONS[f];return <Radio.Card key={f} value={f} aria-label={FAMILY_LABEL[f]} tabIndex={step.family===f?0:-1} className={classes.deviceOption}><Icon size={32} weight={step.family===f?'fill':'regular'} aria-hidden="true"/><span>{FAMILY_LABEL[f]}</span></Radio.Card>;})}</div></Radio.Group><Group gap="xs" className={classes.headerActions}><span className={classes.saved} role="status">{!readable ? 'Kayıt engellendi' : !storageWritable ? 'Kayıt hatası' : saved ? `Kaydedildi ${saved}`:'Kaydediliyor'}</span><Button variant="subtle" color="gray" onClick={toggleColorScheme} aria-label="Uygulama temasını değiştir">{colorScheme==='dark'?<SunIcon size={20}/>:<MoonIcon size={20}/>}</Button><FileButton accept="application/json,.json" onChange={importFile}>{(props)=><Button {...props} variant="default">JSON içe aktar</Button>}</FileButton><Button variant="subtle" color="gray" onClick={openEditor}>Serbest editör</Button><Button variant="default" onClick={persist} leftSection={<FloppyDiskIcon size={18}/>}>Kaydet</Button><Button onClick={exportFile} leftSection={<DownloadSimpleIcon size={18}/>}>JSON indir</Button></Group></header>
    <div className={classes.shell}>
      <aside className={classes.journey} aria-label="Karar yolculuğu"><section className={classes.journeyPrimary} aria-label="Alt kırılımlar"><div className={classes.sidebarBreakpoints}><BreakpointChoice value={step.device.id} devices={WORKFLOW_DEVICES.filter((x)=>x.family===step.family).map(({device})=>device)} onChange={(v)=>navigate(FLOW_STEPS.findIndex((s)=>s.ctx===step.ctx && s.device.id===v && s.group===step.group))}/></div>

      </section><div className={classes.journeyDivider} role="separator"/><section className={classes.journeySecondary} aria-label="Metin kümeleri"><StepLabel number={4}>Metin kümesi</StepLabel><nav aria-label="Metin kümeleri">{FLOW_STEPS.filter((s)=>s.ctx===step.ctx && s.device.id===step.device.id).map((item,i)=><button type="button" key={item.group} className={classes.context} aria-current={item.group===step.group?'step':undefined} onClick={()=>navigate(FLOW_STEPS.findIndex((s)=>s.key===item.key))}><span>{String(i+1).padStart(2,'0')}</span><span>{item.label}</span></button>)}</nav></section></aside>
      <main className={classes.main}>
        {pendingImport!==undefined && <Alert title="Karar JSON dosyası · akış seçimi" color="blue"><p>Bu dosyada iş akışı geçmişi yok. Kararları uygulamadan önce mevcut akışın nasıl korunacağını seç.</p><Radio.Group label="İçe aktarmada iş akışı" value={importMode} onChange={setImportMode}><Group><Radio value="preserve" label="Akışı, onayları ve notları koru"/><Radio value="replace" label="Akışı yeni başlangıçla değiştir"/></Group></Radio.Group><p>Korunan onaylar, değişen etkin değerlerle uyuşmazsa yeniden inceleme gerektirir.</p><Group><Button onClick={()=>applyImport(pendingImport,importMode==='replace')}>JSON kararlarını uygula</Button><Button variant="default" onClick={()=>setPendingImport(undefined)}>İçe aktarmayı iptal et</Button></Group></Alert>}

        {error && <Alert color="orange" title="Çalışma kaydı">{error}{recoveryAvailable && <Button variant="default" onClick={()=>{try{downloadText(`genux-kurtarma-farki-${stamp()}.json`,localStorage.getItem(JOURNAL_KEY)??'{}');}catch{setError('Kurtarma farkı okunamadı; kayıt korunuyor.');}}}>Kurtarma farkını indir</Button>}{!readable && <Button variant="default" onClick={()=>{setReadable(true);setError('');}}>Yeni akışı kullan; eski dosyamı yedekledim</Button>}</Alert>}
        <section className={classes.stageHeader}><div className={classes.contextLine}><p className={classes.eyebrow}>{contextLabel(step.ctx)} / {FAMILY_LABEL[step.family]} / {width} px</p><h1>{step.label}</h1><div className={classes.stageProgress}><WorkflowProgress completedGroups={done} totalGroups={FLOW_STEPS.length} reviewedElements={groupReviewed} totalElements={step.roles.length} autoDecisions={counts.auto} pendingDecisions={reviewQueue.length} humanDecisions={humanDecisions}/></div></div>

        </section>

        <div className={classes.workbench}>
          <section className={classes.preview} aria-label="Gerçek kullanım önizlemeleri"><StepLabel number={6}>Kullanım konumu</StepLabel><SegmentedControl fullWidth aria-label="Kullanım konumu" value={placement} onChange={setPlacement} data={[{value:'page',label:'Sayfa'},{value:'card',label:'Bileşen / kart'},{value:'row',label:'Detay satırı'}]}/>
          {supportsOrientation(step.device) && <div className={classes.orientationBar}><OrientationChoice value={orientation} onChange={setOrientation}/></div>}
          <div className={classes.previewPair}>
            <section aria-label="Ekran 1 · Seçili element">
              <div className={classes.deviceStage}>
                <DeviceStage device={step.device} width={viewport.width} height={viewport.height} theme={scheme} zoom={zoom} landscape={viewport.landscape} label={step.family==='tv'?'TV · mantıksal CSS genişliği':undefined}>
                  <div className={classes.previewScreen} style={canvasVars(scheme)} data-theme={scheme}>
                    <div className={classes.screenToolbar}><SegmentedControl className={classes.screenMode} fullWidth aria-label="Seçili ekran görünümü" value={screenMode} onChange={setScreenMode} data={[{value:'content',label:'İçerik'},{value:'tests',label:'Satır testleri'}]}/></div>
                    {screenMode==='content' ? <Suspense fallback={<p>Örnek yükleniyor…</p>}><Examples decisions={effective} ctx={step.ctx} id={id} width={width} scheme={scheme} placement={placement}/></Suspense> : <><DeviceLineTests id={id} r={r} settings={settings} width={width} scheme={scheme} variant="compact"/><DeviceLineTests id={id} r={r} settings={settings} width={width} scheme={scheme} variant="matrix"/></>}
                  </div>
                </DeviceStage>
              </div>
            </section>
            <GroupPreview device={step.device} zoom={zoom} decisions={effective} ctx={step.ctx} roles={step.roles} selected={id} width={width} viewportWidth={viewport.width} viewportHeight={viewport.height} landscape={viewport.landscape} scheme={scheme} onSelect={(role)=>setFlow((f)=>({...f,role,cursor:step.key}))}/>
          </div><Group justify="space-between"><span className={classes.muted}>Ant Design · gerçek bileşenler · temsili veriler</span><Button size="xs" color="gray" variant="subtle" onClick={()=>setZoom(zoom==='fit'?'actual':'fit')}>{zoom==='fit'?'%100 göster':'Çerçeveye sığdır'}</Button></Group>
          </section>
          <section className={classes.form} aria-label={`${def.label} karar formu`}><div className={classes.previewBar}>{roleNavigator}</div><div className={classes.formIdentity}><strong className={classes.previewReadout}>{def.label} · {px} / {Math.round(px*r.lh)} px</strong><SegmentedControl aria-label="Önizleme teması" size="sm" value={scheme} data={[{value:'light',label:'Açık'},{value:'dark',label:'Koyu'}]} onChange={(v)=>setScheme(v as Theme)}/><Badge variant="light">{statusLabel(id)}</Badge></div>{currentContrast && !currentContrast.pass && <Alert className={classes.contrastNotice} color="orange" title="Kontrast AA altında">{currentContrast.detail}</Alert>}
          <div className={classes.fields}><NumberStepper source={sourceFor('size')} label="Yazı boyutu" recommended={recommended.size} value={px} min={minSizeFor(id)} max={120} step={1} decimalScale={0} suffix=" px" disabled={def.kind==='long'} onChange={(v)=>{if(typeof v==='number')patch({size:v,mode:'static'});}}/><Radio.Group className={classes.weightPicker} label="Ağırlık" description={<><FieldEvidence source={sourceFor('w')}/><span id="recommended-weight" className="gx-sr-only">Önerilen ağırlık: {recommended.w}</span></>} name="font-weight" value={String(r.w)} onChange={(v)=>patch({w:Number(v)})}><div className={classes.weightOptions}>{[300,400,500,600,700,800,900].map((w)=><Radio.Card key={w} value={String(w)} tabIndex={r.w===w ? 0 : -1} aria-label={`Ağırlık ${w}`} aria-describedby={w===recommended.w?"recommended-weight":undefined} className={classes.weightOption}><span>{w}</span>{w===recommended.w && <RecommendationMark value={`Ağırlık ${w}`}/>}</Radio.Card>)}</div></Radio.Group><LineHeightChoice key={id} source={sourceFor('lh')} recommended={recommended.lh} value={r.lh} onChange={(lh)=>patch({lh})}/></div>
          <Accordion multiple defaultValue={[]}><Accordion.Item value="policy"><Accordion.Control>Kural politikası</Accordion.Control><Accordion.Panel><PolicyEditor value={policy} onChange={changePolicy} inferred={inferredPolicy} onAdopt={()=>{if(inferredPolicy)changePolicy({...policy,...inferredPolicy});}}/>{step.ctx==='html' && <Button mih={44} variant="default" onClick={applyInheritedPolicy}>HTML politikasını ürünlere uygula</Button>}</Accordion.Panel></Accordion.Item></Accordion>
          <p><strong>Motor kararları</strong></p><Group gap="xs" aria-label="Otomatik karar uygulama kapsamı"><Button mih={44} aria-label="Bu kümeye uygula" variant="default" onClick={()=>applyScope({ctx:step.ctx,family:step.family,width,group:step.group})}>Küme</Button><Button mih={44} aria-label="Bu genişliğe uygula" variant="default" onClick={()=>applyScope({ctx:step.ctx,family:step.family,width})}>Genişlik</Button><Button mih={44} aria-label="Bu cihaz grubuna uygula" variant="default" onClick={()=>applyScope({ctx:step.ctx,family:step.family})}>Cihaz ailesi</Button></Group>

          {!!reviewQueue.length && <Accordion><Accordion.Item value="review-queue"><Accordion.Control>İnceleme kuyruğu · {reviewQueue.length}</Accordion.Control><Accordion.Panel><p>İlk {Math.min(20,reviewQueue.length)} kayıt gösteriliyor.</p><Stack gap="xs">{reviewQueue.slice(0,20).map(target=>{
            const sources=flow.engine?.entries[target.key]?.sources??[];
            const review=flow.reviews[target.key];
            return <div key={target.key}><Button mih={44} variant="default" onClick={()=>navigate(FLOW_STEPS.findIndex(item=>item.key===target.step.key),target.role)}>{contextLabel(target.step.ctx)} · {FAMILY_LABEL[target.step.family]} · {target.step.device.w} px · {ROLE[target.role].label}</Button><p className={classes.muted}>Kaynak: {sources.length?sources.map(source=>source.label).join(' · '):review?`İnsan onayı · ${review.at}`:'Geçerli insan kanıtı bekleniyor'}</p></div>;
          })}</Stack></Accordion.Panel></Accordion.Item></Accordion>}

          <DecisionEnginePanel forecast={forecast} entry={engineEntry} prediction={prediction} checks={checks} reviewed={currentReviewed} hasReview={!!flow.reviews[reviewKey(step,id)]} onRecalculate={()=>setFlow(f=>synchronizeDecision(f,decisions,step,id,'recalculate',true))} onUndo={()=>setFlow(f=>undoDecision(f,step,id))} onRedo={()=>setFlow(f=>redoDecision(f,step,id))} width={width} values={checkValues} id={id} onForecastToggle={setForecastExpanded}/>
          <section aria-label="Çıktı tonları · açık / koyu"><h3 className={classes.colorTitle}>Çıktı tonları · açık / koyu</h3>{(['light','dark'] as const).map((t)=><div key={t} className={classes.color}><ColorField source={sourceFor('c')} recommended={recommended.c[t]} id={id} r={checkValues} theme={t} backgrounds={policy.backgrounds[t]} onChange={(hex)=>patch({c:{...r.c,[t]:hex}})}/></div>)}</section><Accordion multiple defaultValue={[]}><Accordion.Item value="advanced"><Accordion.Control>Diğer tipografi özellikleri</Accordion.Control><Accordion.Panel><div className={classes.fields}>{FORMAT_FIELDS.map((key)=><Select key={key} description={<FieldEvidence source={sourceFor(key)}/>} label={<RecommendationLabel value={CHOICES[key].find(([v])=>v===recommended[key])?.[1] ?? String(recommended[key])}>{({ff:'Yazı tipi',fst:'Stil',tt:'Harf dönüşümü',td:'Çizgi',num:'Rakamlar',ta:'Hizalama',wrap:'Satır kırma'})[key]}</RecommendationLabel>} renderOption={({option})=><span className={classes.recommendedOption}>{option.label}{option.value===recommended[key] && <RecommendationMark value={option.label}/>}</span>} allowDeselect={false} value={String(r[key])} data={CHOICES[key].map(([value,label])=>({value,label}))} onChange={(v)=>{if(v)patch({[key]:v});}}/>)}{field('Kelime aralığı','ws',0,0.5,0.01,' em')}{field('Satır uzunluğu','mw',0,120,1,' ch')}{field('Üst boşluk','mt',0,3,0.05,' em')}{field('Alt boşluk','mb',0,3,0.05,' em')}</div></Accordion.Panel></Accordion.Item></Accordion>
          <Textarea maxLength={4000} label="Karar notu" placeholder="Bu kullanım için neden bu değeri seçtin?" value={notes[reviewKey(step,id)]??''} onChange={(e)=>{setNotes((n)=>({...n,[reviewKey(step,id)]:e.target.value}));}}/>
          <p className={classes.muted}>Kaydet ve devam et, bu elementin değerlerini tarihli bir karar olarak onaylar. Ayar veya kaynak karar değişirse onayı yeniden incelemen gerekir.</p>{!canApprove && <p className={classes.engineWarning}>Kaydetmek için engelleyici kontrolleri düzelt; izin verilen oran/bağlantı istisnası için Karar notuna 8–1000 karakter gerekçe yaz: {checks.filter(check=>!check.pass && check.blocking!==false).map(check=>check.detail).join(' · ')}</p>}<Button fullWidth disabled={!canApprove} onClick={approveNext} rightSection={<ArrowRightIcon size={18}/>}>Kararı kaydet ve devam et</Button>
          </section>
        </div>
        <footer className={classes.navigation}><Button variant="default" disabled={index===0} leftSection={<ArrowLeftIcon size={18}/>} onClick={()=>navigate(index-1)}>Önceki küme</Button><span className={classes.muted}>Küme {index+1} / {FLOW_STEPS.length}</span><Button variant="default" disabled={!stepSettled(flow,decisions,step) || index===FLOW_STEPS.length-1} onClick={()=>navigate(index+1)}>Sonraki küme</Button></footer>
        {done===FLOW_STEPS.length && <Alert title="Karar seti tamamlandı" color="green">Tüm ürünler, cihaz profilleri ve elementler incelendi. JSON dosyan tüm kararları ve onay geçmişini içerir.</Alert>}
      </main>
    </div>
  </div>;
}
