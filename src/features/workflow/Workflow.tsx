import { Accordion, Alert, Badge, Button, FileButton, Group, Progress, Radio, SegmentedControl, Select, Textarea, useMantineColorScheme } from '@mantine/core';
import { DeviceMobileIcon, DeviceTabletIcon, LaptopIcon, MonitorIcon, TelevisionIcon, ArrowLeftIcon, ArrowRightIcon, CheckCircleIcon, DownloadSimpleIcon, FloppyDiskIcon, MoonIcon, SunIcon } from '@phosphor-icons/react';
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { recommendedRole, CHOICES, CONTEXTS, ROLE, buildExport, contrast, contextLabel, enforceRole, importData, minSizeFor, resolveAt, sizeAt, type PropKey, type RoleOverrides, type Theme } from '../../core';
import { useStudio } from '../../store/studio';
import { writeStored } from '../../store/persist';
import { useStudioSearch } from '../../app/useStudioSearch';
import { ColorField } from '../inspector/ColorSection';
import { DeviceStage } from '../canvas/DeviceStage';
import { downloadText, stamp } from '../io/download';
import { FLOW_KEY, FLOW_STEPS, FAMILY_LABEL, WORKFLOW_DEVICES, approve, decisionsForStep, emptyFlow, isReviewed, parseFlow, reviewKey, stepDone, type Family, type FlowState } from './model';
import classes from './Workflow.module.scss';
import { readWorkflow, writeWorkflow } from './persistence';
import { workflowRoleStyle } from './roleStyle';
import { canvasVars } from '../canvas/canvasVars';
import { CANVAS_TOKENS } from '../../theme/tokens';
import { GroupPreview } from './GroupPreview';
import { StepLabel } from './StepLabel';
import { BreakpointChoice } from './BreakpointChoice';
import { NumberStepper } from './NumberStepper';
import { LineHeightChoice } from './LineHeightChoice';
import { RecommendationLabel, RecommendationMark, RecommendationNote } from '../recommendations/Recommendation';
import { NearLineTest } from './NearLineTest';
import { LINE_SAMPLES } from './lineSamples';

const Examples = lazy(() => import('./Examples').then((m) => ({default:m.Examples})));
const cleanNotes = (raw:unknown): Record<string,string> => raw && typeof raw==='object' ? Object.fromEntries(Object.entries(raw).filter(([,v])=>typeof v==='string')) : {};
function readInitial() {
  try { const raw=localStorage.getItem(FLOW_KEY); const value=raw ? JSON.parse(raw) : null; return {flow:value ? parseFlow(value) : emptyFlow(),notes:cleanNotes(value?.notes),error:''}; }
  catch { return {flow:emptyFlow(),notes:{},error:'İlerleme kaydı okunamadı. Eski kayıt korunuyor; JSON yedeğini içe aktarabilir veya yeni akış başlatabilirsiniz.'}; }
}
const FAMILY_ICONS = { mobile:DeviceMobileIcon, tablet:DeviceTabletIcon, laptop:LaptopIcon, desktop:MonitorIcon, tv:TelevisionIcon };
const FAMILIES = Object.keys(FAMILY_LABEL) as Family[];
const FORMAT_FIELDS = ['fst','td','num','ta','wrap'] as const;
export function Workflow({ onOpenEditor }: {onOpenEditor:()=>void}) {
  const [initial] = useState(readInitial);
  const [loaded,setLoaded]=useState(false);
  useEffect(()=>{let alive=true;readWorkflow().then((raw)=>{if(alive && raw){setFlow(parseFlow(raw));setNotes(cleanNotes((raw as Record<string,unknown>).notes));setReadable(true);setError('');}}).catch(()=>{if(alive){setReadable(false);setError('İlerleme veritabanı okunamadı. Mevcut kayıt korunuyor. JSON yedeğini içe aktarabilir veya yeni akış başlatabilirsin.');}}).finally(()=>{if(alive)setLoaded(true);});return()=>{alive=false;};},[]);
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
  const recommended=useMemo(()=>recommendedRole(step.ctx,id,width),[step.ctx,id,width]);
  const [scheme,setScheme]=useState<Theme>('light');
  const [placement,setPlacement]=useState('page');
  const [zoom,setZoom]=useState<'fit'|'actual'>('actual');
  const {colorScheme,toggleColorScheme}=useMantineColorScheme();
  const [notes,setNotes]=useState<Record<string,string>>(initial.notes);
  const latest=useRef({flow,decisions,search,notes}); latest.current={flow,decisions,search,notes};
  const [storageWritable,setStorageWritable]=useState(true);
  const persist = async () => {
    if (!readable || !loaded) return false;
    try {
      const cur=latest.current;
      await writeWorkflow({...cur.flow,notes:cur.notes});
      if (!writeStored(cur.decisions,{...cur.search,tourDone:true})) throw new Error('Kararlar saklanamadı.');
      setStorageWritable(true); setSaved(new Intl.DateTimeFormat('tr-TR',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Istanbul'}).format(new Date()));
      return true;
    } catch {setStorageWritable(false);setError('Tarayıcıya kayıt yapılamadı. Çalışmanı kaybetmemek için JSON indir.');return false;}
  };
  useEffect(()=>{void persist();},[flow,decisions,notes,readable,loaded]);
  useEffect(()=>{const save=()=>{try {if(readable && loaded){void writeWorkflow({...latest.current.flow,notes:latest.current.notes}).catch(()=>{});writeStored(latest.current.decisions,{...latest.current.search,tourDone:true});}}catch{/* visible save errors are reported by persist */}};window.addEventListener('pagehide',save);return()=>window.removeEventListener('pagehide',save);},[readable,loaded]);
  const done=useMemo(()=>FLOW_STEPS.filter((s)=>stepDone(flow,decisions,s)).length,[flow,decisions]);
  const groupReviewed=step.roles.filter((role)=>isReviewed(flow,decisions,step,role)).length;
  const currentReviewed=isReviewed(flow,decisions,step,id);
  const stale=!!flow.reviews[reviewKey(step,id)] && !currentReviewed;
  const navigate=(i:number,role?:string)=>{const target=FLOW_STEPS[Math.max(0,Math.min(FLOW_STEPS.length-1,i))];setFlow((f)=>({...f,cursor:target.key,role:role ?? target.roles[0]}));};
  const patch=(p:RoleOverrides)=>{
    // Shared HTML element rules remain inherited, but TV/extra monitor profiles are independent.
    if(step.family==='tv' || !step.device.id.match(/^[mltd]/) || step.device.id.startsWith('monitor')) {
      const key=reviewKey(step,id); const cleaned=enforceRole(id,{...r,...p});
      setFlow((f)=>({...f,profiles:{...f.profiles,[key]:{...f.profiles?.[key],...Object.fromEntries(Object.keys(p).map((k)=>[k,cleaned[k as PropKey]]))}}}));
    } else useStudio.getState().override(step.ctx,id,p,null,width);
  };
  const approveNext=()=>{
    const next=approve(flow,decisions,step,id); const ri=step.roles.indexOf(id);
    if (ri<step.roles.length-1) setFlow({...next,cursor:step.key,role:step.roles[ri+1]});
    else { const remaining=step.roles.find((x)=>!isReviewed(next,decisions,step,x));
      if(remaining) setFlow({...next,cursor:step.key,role:remaining});
      else if(index<FLOW_STEPS.length-1) setFlow({...next,cursor:FLOW_STEPS[index+1].key,role:FLOW_STEPS[index+1].roles[0]});
      else setFlow(next);
    }
  };
  const exportFile=()=>downloadText(`genux-karar-akisi-${stamp()}.json`,JSON.stringify({...buildExport(decisions,'all'),workflow:{...flow,notes,completedGroups:done,totalGroups:FLOW_STEPS.length,order:'context > device family > width > group > role',profiles:flow.profiles ?? {},devices:WORKFLOW_DEVICES.map(({device,family})=>({id:device.id,family,widthPx:device.w,heightPx:device.h}))}},null,2));
  const importFile=async(file:File|null)=>{
    if(!file)return;try{if(file.size>64*1024*1024)throw new Error('Dosya 64 MiB sınırını aşıyor.');const data=JSON.parse(await file.text());const loaded=importData(data,decisions,step.ctx);const progress=data.workflow ? parseFlow(data.workflow):emptyFlow();useStudio.getState().replace(loaded.decisions);setFlow(progress);setNotes(cleanNotes(data.workflow?.notes));setError(loaded.report.adjusted.length ? `${loaded.report.adjusted.length} kesin kural düzeltmesi uygulandı.`:'');setReadable(true);}catch(e){setError(`İçe aktarılamadı: ${e instanceof Error ? e.message:String(e)}`);}
  };
  const field=(label:string,key:PropKey,min:number,max:number,increment:number,unit='')=><NumberStepper label={label} recommended={Number(recommended[key])} value={Number(r[key])} min={min} max={max} step={increment} decimalScale={increment<1?3:0} suffix={unit} onChange={(v)=>{if(typeof v==='number')patch({[key]:v});}} />;
  const sampleContrast=contrast(r.c[scheme], CANVAS_TOKENS[scheme].canvas);
  const lineStyle=workflowRoleStyle(r,settings,id,width,scheme);
  const roleNavigator = (<div className={classes.roleStep}><StepLabel number={5}>Element</StepLabel><nav className={classes.roles} aria-label="Bu kümedeki elementler">{step.roles.map((role)=><button key={role} aria-current={id===role?'true':undefined} onClick={()=>setFlow((f)=>({...f,role,cursor:step.key}))}>{isReviewed(flow,decisions,step,role) && <CheckCircleIcon size={16}/>} {ROLE[role].label}</button>)}</nav></div>);
  if(!loaded)return <div className={classes.root}><p className={classes.main} role="status">Karar kayıtları yükleniyor…</p></div>;
  return <div className={classes.root}>
    <header className={classes.header}><div><span className={classes.brand}>GenUX</span><span className={classes.subtitle}>Karar akışı</span></div><div className={classes.headerProduct}><StepLabel number={1}>Ürün türü</StepLabel><Select aria-label="Ürün türü" value={step.ctx} allowDeselect={false} data={CONTEXTS.map(c=>({value:c.id,label:c.label}))} onChange={value=>{if(value)navigate(FLOW_STEPS.findIndex(item=>item.ctx===value));}}/></div><Radio.Group className={classes.devicePicker} classNames={{label:"gx-sr-only"}} label="Cihaz grubu" name="device-family" value={step.family} onChange={(v)=>navigate(FLOW_STEPS.findIndex((s)=>s.ctx===step.ctx && s.family===v))}><StepLabel number={2}>Cihaz grubu</StepLabel><div className={classes.deviceOptions}>{FAMILIES.map((f)=>{const Icon=FAMILY_ICONS[f];return <Radio.Card key={f} value={f} aria-label={FAMILY_LABEL[f]} tabIndex={step.family===f?0:-1} className={classes.deviceOption}><Icon size={32} weight={step.family===f?'fill':'regular'} aria-hidden="true"/><span>{FAMILY_LABEL[f]}</span></Radio.Card>;})}</div></Radio.Group><Group gap="xs" className={classes.headerActions}><span className={classes.saved} role="status">{!readable ? 'Kayıt engellendi' : !storageWritable ? 'Kayıt hatası' : saved ? `Kaydedildi ${saved}`:'Kaydediliyor'}</span><Button variant="subtle" color="gray" onClick={toggleColorScheme} aria-label="Uygulama temasını değiştir">{colorScheme==='dark'?<SunIcon size={20}/>:<MoonIcon size={20}/>}</Button><FileButton accept="application/json,.json" onChange={importFile}>{(props)=><Button {...props} variant="default">JSON içe aktar</Button>}</FileButton><Button variant="subtle" color="gray" onClick={async()=>{if(await persist())onOpenEditor();}}>Serbest editör</Button><Button variant="default" onClick={persist} leftSection={<FloppyDiskIcon size={18}/>}>Kaydet</Button><Button onClick={exportFile} leftSection={<DownloadSimpleIcon size={18}/>}>JSON indir</Button></Group></header>
    <div className={classes.shell}>
      <aside className={classes.journey} aria-label="Karar yolculuğu"><section className={classes.journeyPrimary} aria-label="Çalışma ilerlemesi"><p className={classes.progressCount}>{done} / {FLOW_STEPS.length} onaylı küme</p><Progress value={done/FLOW_STEPS.length*100} aria-label="Tamamlanan kümeler"/><div className={classes.sidebarBreakpoints}><BreakpointChoice value={step.device.id} devices={WORKFLOW_DEVICES.filter((x)=>x.family===step.family).map(({device})=>device)} onChange={(v)=>navigate(FLOW_STEPS.findIndex((s)=>s.ctx===step.ctx && s.device.id===v && s.group===step.group))}/></div>

      </section><div className={classes.journeyDivider} role="separator"/><section className={classes.journeySecondary} aria-label="Metin kümeleri"><StepLabel number={4}>Metin kümesi</StepLabel><nav aria-label="Metin kümeleri">{FLOW_STEPS.filter((s)=>s.ctx===step.ctx && s.device.id===step.device.id).map((item,i)=><button type="button" key={item.group} className={classes.context} aria-current={item.group===step.group?'step':undefined} onClick={()=>navigate(FLOW_STEPS.findIndex((s)=>s.key===item.key))}><span>{String(i+1).padStart(2,'0')}</span><span>{item.label}</span></button>)}</nav></section></aside>
      <main className={classes.main}>
        {error && <Alert color="orange" title="Çalışma kaydı">{error}{!readable && <Button variant="default" onClick={()=>{setReadable(true);setError('');}}>Yeni akışı kullan; eski dosyamı yedekledim</Button>}</Alert>}
        <section className={classes.stageHeader}><div className={classes.contextLine}><p className={classes.eyebrow}>{contextLabel(step.ctx)} / {FAMILY_LABEL[step.family]} / {width} px</p><h1>{step.label}</h1><p className={classes.stageProgress}>{groupReviewed}/{step.roles.length} element onaylandı</p></div>

        </section>

        <div className={classes.workbench}>
          <section className={classes.preview} aria-label="Gerçek kullanım önizlemeleri"><div className={classes.previewBar}>{roleNavigator}<strong className={classes.previewReadout}>{def.label} · {px} / {Math.round(px*r.lh)} px</strong><SegmentedControl aria-label="Önizleme teması" size="sm" value={scheme} data={[{value:'light',label:'Açık'},{value:'dark',label:'Koyu'}]} onChange={(v)=>setScheme(v as Theme)}/></div><StepLabel number={6}>Kullanım konumu</StepLabel><SegmentedControl fullWidth aria-label="Kullanım konumu" value={placement} onChange={setPlacement} data={[{value:'page',label:'Sayfa'},{value:'card',label:'Bileşen / kart'},{value:'row',label:'Detay satırı'}]}/>
          <div className={classes.previewPair}><section aria-label="Ekran 1 · Seçili element"><div className={classes.deviceStage}><DeviceStage device={step.device} width={width} height={step.device.h} theme={scheme} zoom={zoom} landscape={false} label={step.family==='tv'?'TV · mantıksal CSS genişliği':undefined}><Suspense fallback={<p>Örnek yükleniyor…</p>}><Examples decisions={effective} ctx={step.ctx} id={id} width={width} scheme={scheme} placement={placement}/></Suspense></DeviceStage></div></section><GroupPreview device={step.device} zoom={zoom} decisions={effective} ctx={step.ctx} roles={step.roles} selected={id} width={width} scheme={scheme} onSelect={(role)=>setFlow((f)=>({...f,role,cursor:step.key}))}/></div><Group justify="space-between"><span className={classes.muted}>Ant Design · gerçek bileşenler · temsili veriler</span><Button size="xs" color="gray" variant="subtle" onClick={()=>setZoom(zoom==='fit'?'actual':'fit')}>{zoom==='fit'?'%100 göster':'Çerçeveye sığdır'}</Button></Group>
          <details className={classes.lineTests}><summary>Satır testi · 1 / 2 / 5 satır</summary><p className={classes.muted}>Satır kutusu: {px} × {r.lh} = {Math.round(px*r.lh*10)/10} px. Renkli şeritler satır yüksekliğini gösterir.</p>{[1,2,5].map((n)=><div key={n} className={classes.lineCard} data-theme={scheme} style={canvasVars(scheme)}><span className={classes.lineLabel}>{n} satır</span><div style={{...lineStyle,backgroundImage:'repeating-linear-gradient(to bottom, var(--canvas-guide) 0, var(--canvas-guide) 1em, transparent 1em, transparent 100%)',backgroundSize:`100% ${px*r.lh}px`}}>{LINE_SAMPLES[n].map((text,i)=><span key={i} style={{display:'block',whiteSpace:'normal'}}>{text}{' '}</span>)}</div></div>)}</details>
          </section>
          <section className={classes.form} aria-label={`${def.label} karar formu`}><div className={classes.formHeader}><Badge variant="light">{currentReviewed?'Onaylandı':stale?'Yeniden incele':'Taslak'}</Badge><h2>{def.label}</h2><p className={classes.muted}>{width} px · {contextLabel(step.ctx)} · {def.kind==='long'?'Uzun okuma 18 px sabit':`En az ${minSizeFor(id)} px`}</p><div className={classes.formSample} data-testid="form-sample" data-theme={scheme} style={{...canvasVars(scheme),...lineStyle}}>{def.sample}</div><p className={classes.muted}>Örnek: {scheme==='light'?'açık':'koyu'} zemin · kontrast {sampleContrast.toFixed(2)}:1{sampleContrast<4.5?' · Düşük kontrast: çıktı tonunu kontrol et.':''}</p></div>
          <RecommendationNote/><div className={classes.fields}><NumberStepper label="Yazı boyutu" recommended={recommended.size} value={px} min={minSizeFor(id)} max={120} step={1} decimalScale={0} suffix=" px" disabled={def.kind==='long'} onChange={(v)=>{if(typeof v==='number')patch({size:v,mode:'static'});}}/><Radio.Group className={classes.weightPicker} label="Ağırlık" description={<span id="recommended-weight" className="gx-sr-only">Önerilen ağırlık: {recommended.w}</span>} name="font-weight" value={String(r.w)} onChange={(v)=>patch({w:Number(v)})}><div className={classes.weightOptions}>{[300,400,500,600,700,800,900].map((w)=><Radio.Card key={w} value={String(w)} tabIndex={r.w===w ? 0 : -1} aria-label={`Ağırlık ${w}`} aria-describedby={w===recommended.w?"recommended-weight":undefined} className={classes.weightOption}><span>{w}</span>{w===recommended.w && <RecommendationMark value={`Ağırlık ${w}`}/>}</Radio.Card>)}</div></Radio.Group><LineHeightChoice key={id} recommended={recommended.lh} value={r.lh} onChange={(lh)=>patch({lh})}/><NearLineTest id={id} r={r} settings={settings} width={width} scheme={scheme}/></div>
          <Accordion multiple defaultValue={[]}><Accordion.Item value="colors"><Accordion.Control>Çıktı tonları · açık / koyu</Accordion.Control><Accordion.Panel>{(['light','dark'] as const).map((t)=><div key={t} className={classes.color}><span>{t==='light'?'Açık tema':'Koyu tema'}</span><ColorField recommended={recommended.c[t]} id={id} r={r} theme={t} onChange={(hex)=>patch({c:{...r.c,[t]:hex}})}/></div>)}</Accordion.Panel></Accordion.Item><Accordion.Item value="advanced"><Accordion.Control>Diğer tipografi özellikleri</Accordion.Control><Accordion.Panel><div className={classes.fields}>{FORMAT_FIELDS.map((key)=><Select key={key} label={<RecommendationLabel value={CHOICES[key].find(([v])=>v===recommended[key])?.[1] ?? String(recommended[key])}>{({ff:'Yazı tipi',fst:'Stil',tt:'Harf dönüşümü',td:'Çizgi',num:'Rakamlar',ta:'Hizalama',wrap:'Satır kırma'})[key]}</RecommendationLabel>} renderOption={({option})=><span className={classes.recommendedOption}>{option.label}{option.value===recommended[key] && <RecommendationMark value={option.label}/>}</span>} allowDeselect={false} value={String(r[key])} data={CHOICES[key].map(([value,label])=>({value,label}))} onChange={(v)=>{if(v)patch({[key]:v});}}/>)}{field('Kelime aralığı','ws',0,0.5,0.01,' em')}{field('Satır uzunluğu','mw',0,120,1,' ch')}{field('Üst boşluk','mt',0,3,0.05,' em')}{field('Alt boşluk','mb',0,3,0.05,' em')}</div></Accordion.Panel></Accordion.Item></Accordion>
          <Textarea maxLength={4000} label="Karar notu" placeholder="Bu kullanım için neden bu değeri seçtin?" value={notes[reviewKey(step,id)]??''} onChange={(e)=>{setNotes((n)=>({...n,[reviewKey(step,id)]:e.target.value}));}}/>
          <p className={classes.muted}>Kaydet ve devam et, bu elementin değerlerini tarihli bir karar olarak onaylar. Ayar değişirse onayı yeniden incelemen gerekir.</p><Button fullWidth onClick={approveNext} rightSection={<ArrowRightIcon size={18}/>}>Kararı kaydet ve devam et</Button>
          </section>
        </div>
        <footer className={classes.navigation}><Button variant="default" disabled={index===0} leftSection={<ArrowLeftIcon size={18}/>} onClick={()=>navigate(index-1)}>Önceki küme</Button><span className={classes.muted}>Küme {index+1} / {FLOW_STEPS.length}</span><Button variant="default" disabled={!stepDone(flow,decisions,step) || index===FLOW_STEPS.length-1} onClick={()=>navigate(index+1)}>Sonraki küme</Button></footer>
        {done===FLOW_STEPS.length && <Alert title="Karar seti tamamlandı" color="green">Tüm ürünler, cihaz profilleri ve elementler incelendi. JSON dosyan tüm kararları ve onay geçmişini içerir.</Alert>}
      </main>
    </div>
  </div>;
}
