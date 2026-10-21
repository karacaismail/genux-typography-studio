import { Breadcrumb, Button, Card, ConfigProvider, Descriptions, Form, Input, Menu, Rate, Statistic, Table, Tabs, Tag, Tooltip, theme as antTheme } from 'antd';
import { createElement, type CSSProperties, type ReactNode } from 'react';
import { FONT_STACK, ROLE, resolveContextAt, type ContextId, type Decisions, type RoleProps, type Theme } from '../../core';
import { MOTION } from '../../theme/tokens';
import classes from './Workflow.module.scss';
import { workflowRoleStyle } from './roleStyle';

function SemanticSample({ id, children, style }: { id: string; children: ReactNode; style: CSSProperties }) {
  const a = { style, 'data-example-role': id };
  if(['badge','filterChip','suggestion','citation'].includes(id)) return <Tag {...a}>{children}</Tag>;
  if(['nav','menuItem','footer'].includes(id)) return <Menu selectable={false} mode="vertical" items={[{key:'selected',label:<span {...a}>{children}</span>},{key:'other',label:'İletişim ve destek'}]} />;
  if(id==='tab') return <Tabs items={[{key:'summary',label:<span {...a}>{children}</span>,children:'Son 30 günün kayıtları'},{key:'history',label:'Geçmiş',children:'Arşiv kayıtları'}]} />;
  if(id==='breadcrumb') return <Breadcrumb items={[{title:'Ana sayfa'},{title:<span {...a}>{children}</span>}]} />;
  if(id==='tooltip') return <Tooltip title={<span {...a}>{children}</span>}><Button>Alan hakkında yardım</Button></Tooltip>;
  if(id==='label' || id==='helper') return <Form layout="vertical"><Form.Item label={id==='label'?<span {...a}>{children}</span>:'E-posta adresi'} help={id==='helper'?<span {...a}>{children}</span>:undefined}><Input readOnly value="ayse@example.test" /></Form.Item></Form>;
  if(id==='rating') return <div {...a}><Rate disabled defaultValue={4}/> <span>{children}</span></div>;
  if(id==='price' || id==='kpi') return <Statistic value={id==='price'?2490:426800} suffix="₺" styles={{content:style}} />;
  if(id==='input') return <Input aria-label="Örnek form değeri" value="Ayşe Demir" readOnly {...a} />;
  if(id==='button' || id==='cta') return <Button {...a}>{children}</Button>;
  if (/^h[1-6]$/.test(id)) return createElement(id, a, children);
  if (id === 'th' || id === 'td') return <table><tbody><tr>{createElement(id,a,children)}</tr></tbody></table>;
  if (id === 'tcaption') return <table><caption {...a}>{children}</caption><tbody><tr><td>İstanbul · 48 sipariş · 126.400 ₺</td></tr></tbody></table>;
  if (id === 'li') return <ul><li {...a}>{children}</li></ul>;
  if (id === 'dt' || id === 'dd') return <dl>{createElement(id,a,children)}</dl>;
  if (id === 'summary') return <details open><summary {...a}>{children}</summary><p>Teslimat ve iade koşulları.</p></details>;
  if (id === 'hgroupSub') return <hgroup><h2>Ekibinizin çalışma alanı</h2><p {...a}>{children}</p></hgroup>;
  if (id === 'figcaption') return <figure><div className={classes.placeholder}>Aylık satış raporu · Ekim 2026</div><figcaption {...a}>{children}</figcaption></figure>;
  if (id === 'option' || id === 'optgroup') return <div role="listbox" aria-label="Bölge"><div role="option" aria-selected {...a}>{children}</div></div>;
  if (id === 'legend') return <fieldset><legend {...a}>{children}</legend><p>İletişim ve fatura bilgileri</p></fieldset>;
  const tags: Record<string,string> = { paragraph:'p', body:'div', long:'article', small:'small', quote:'blockquote', code:'code', pre:'pre', kbd:'kbd', samp:'samp', address:'address', link:'a', caption:'p', input:'span', label:'label', button:'span', cta:'span', ...Object.fromEntries(['strong','b','em','i','u','s','del','ins','mark','abbr','cite','q','dfn','time','data','var','sup','sub','ruby','bdi','bdo','wbr','span','rp','rt','output'].map((k)=>[k,k])) };
  if (id === 'wbr') return <p {...a}>istanbul<wbr/>.genux<wbr/>.example</p>;
  if (id === 'rt' || id === 'rp') return <ruby>東京{createElement(tags[id], a, children)}</ruby>;
  return createElement(tags[id] ?? 'p', { ...a, ...(id === 'link' ? { href:'#ornek', onClick:(e:React.MouseEvent)=>e.preventDefault() } : {}) }, children);
}
const DATA: Record<ContextId,{name:string;subtitle:string;section:string;item:string;description:string}> = {
  html:{name:'Kuzey Tasarım Sistemi',subtitle:'Ürün ekibiniz için ortak bir dil',section:'İçerik rehberi',item:'Tipografi kullanım ilkeleri',description:'İyi bir hiyerarşi, okuyucunun bilgiyi kolayca bulmasını sağlar. Başlık, açıklama ve eylemler aynı sayfada dengeli bir ritim oluşturur.'},
  admin:{name:'Operasyon merkezi',subtitle:'Kuzey Lojistik · İstanbul ekibi',section:'Bugünün siparişleri',item:'Sipariş #TR-10482',description:'Ayşe Demir için hazırlanan kurumsal siparişin teslimatı 24 Ekim olarak planlandı. Fatura ve kargo bilgilerini kontrol edebilirsiniz.'},
  marketing:{name:'Birlikte daha iyi işler üretin',subtitle:'Ekibinizin tüm projeleri tek yerde',section:'Üretime hazır bir çalışma alanı',item:'Kurumsal ekipler için tasarlandı',description:'Planlama, tasarım ve teslim sürecini ortak bir yerde yönetin. Ekibinize neyin önemli olduğunu gösteren sade araçlarla başlayın.'},
  ecommerce:{name:'Keten masa lambası',subtitle:'Kuzey Ev · Doğal meşe koleksiyonu',section:'Ürün detayları',item:'Doğal meşe / sıcak beyaz',description:'Çalışma masanız için yumuşak aydınlatma. El işçiliği meşe gövde, değiştirilebilir LED ampul ve iki yıl üretici garantisi.'},
  bi:{name:'Satış performansı',subtitle:'Ekim 2026 · Tüm bölgeler',section:'Bölgesel gelir',item:'Marmara bölgesi',description:'Net gelir geçen aya göre yüzde 12 arttı. Kurumsal müşteriler toplam cironun yüzde 64’ünü oluşturuyor; iadeler bu rapordan düşülmüştür.'},
  ai:{name:'Satış analizi asistanı',subtitle:'Kuzey A.Ş. · Salt okunur · Satış ekibi',section:'Kaynaklı yanıt',item:'Ekim satışlarını bölgelere göre özetle',description:'Marmara bölgesi 426.800 ₺ net gelirle ilk sırada. Sonuç satış veri ambarındaki 1–20 Ekim kayıtlarından üretildi. Kaynak: satış_ekim.csv, sürüm 3.'},
};

export function Examples({ decisions, ctx, id, width, scheme, placement }: { decisions:Decisions; ctx:ContextId; id:string; width:number; scheme:Theme; placement:string }) {
  const resolved = resolveContextAt(decisions, ctx, width);
  const settings = decisions.contexts[ctx].settings;
  const r = resolved[id]; const copy = DATA[ctx];
  const styleOf = (key:string): CSSProperties => {
    const p:RoleProps = resolved[key] ?? resolved.body ?? r;
    return workflowRoleStyle(p,settings,key in resolved ? key : resolved.body ? 'body' : id,width,scheme);
  };
  const sample = ROLE[id].kind === 'heading' || ROLE[id].kind === 'display' ? id==='h1' || id==='display' ? copy.name : id==='h2' ? copy.section : id==='h3' ? copy.item : ROLE[id].samples?.[ctx] ?? ROLE[id].sample : ROLE[id].kind === 'long' ? Array(5).fill(copy.description).join(' ') : ROLE[id].samples?.[ctx] ?? ROLE[id].sample;
  const selected = <div className={classes.selectedExample}><SemanticSample id={id} style={styleOf(id)}>{sample}</SemanticSample></div>;
  const body = <p style={styleOf('paragraph')}>{copy.description}</p>;
  return <ConfigProvider getPopupContainer={(trigger)=>trigger?.closest('[data-preview-root]') as HTMLElement ?? document.body} prefixCls="gx-ant" wave={{disabled:true}} theme={{ algorithm:scheme === 'dark' ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm, token:{fontFamily:FONT_STACK.sans,fontSize:16,colorPrimary:r.c[scheme],colorInfo:r.c[scheme],borderRadius:5,controlHeight:44,motionEaseInOut:MOTION.ease,motionEaseOut:MOTION.ease,motionDurationFast:`${MOTION.fast}ms`,motionDurationMid:`${MOTION.base}ms`,motionDurationSlow:`${MOTION.slow}ms` } }}>
    <div className={classes.examplePage} data-preview-root data-theme={scheme}>
      <header className={classes.mockNav}><span style={styleOf('nav')}>KUZEY / {ctx === 'html' ? 'Rehber' : ctx.toUpperCase()}</span><span style={styleOf('caption')}>Demo verisi</span></header>
      <main className={classes.mockMain}>
        {placement === 'page' ? <>{id!=='h1' && id!=='display' && <h1 style={styleOf('h1')}>{copy.name}</h1>}<p style={styleOf('hgroupSub')}>{copy.subtitle}</p>{selected}{body}<Button><span style={styleOf('button')}>{ctx === 'ecommerce' ? 'Sepete ekle' : ctx === 'ai' ? 'Kaynakları incele' : 'Detayları görüntüle'}</span></Button></> : placement === 'card' ? <><h2 style={styleOf('h2')}>{copy.section}</h2><Card title={<span style={styleOf('h4')}>{copy.item}</span>}>{selected}{body}<Tag><span style={styleOf('badge')}>İncelendi</span></Tag></Card><Card>{body}</Card></> : <><h2 style={styleOf('h2')}>{copy.section}</h2><Descriptions column={1} items={[{key:'1',label:'Açıklama',children:selected},{key:'2',label:'Güncelleme',children:<span style={styleOf('caption')}>21 Ekim 2026 · 14:30</span>}]} /></>}
        {ctx === 'admin' && <Table size="middle" pagination={false} scroll={{x:460}} columns={[{title:<span style={styleOf('th')}>Sipariş</span>,dataIndex:'no',render:(v:string)=><span style={styleOf('td')}>{v}</span>},{title:<span style={styleOf('th')}>Müşteri</span>,dataIndex:'customer',render:(v:string)=><span style={styleOf('td')}>{v}</span>}]} dataSource={[{key:'1',no:'#TR-10482',customer:'Kuzey Teknoloji A.Ş.'},{key:'2',no:'#TR-10483',customer:'Anadolu Tasarım Ltd.'}]} />}
        {ctx === 'ecommerce' && <><Statistic title={<span style={styleOf('label')}>KDV dahil</span>} value={2490} suffix="₺" styles={{content:styleOf('price')}} /><p style={styleOf('shipping')}>24–26 Ekim teslim · Ücretsiz kargo</p></>}
        {ctx === 'bi' && <><Statistic title={<span style={styleOf('kpiLabel')}>Net gelir</span>} value={426800} suffix="₺" styles={{content:styleOf('kpi')}} /><Table pagination={false} scroll={{x:360}} columns={[{title:'Bölge',dataIndex:'name'},{title:'Net gelir',dataIndex:'value'}]} dataSource={[{key:'1',name:'Marmara',value:'426.800 ₺'},{key:'2',name:'Ege',value:'218.400 ₺'}]} /></>}
        {ctx === 'ai' && <><Card title={<span style={styleOf('chatMeta')}>Asistan · örnek kayıt</span>}><p style={styleOf('chatMessage')}>{copy.description}</p><p style={styleOf('toolStep')}>Veri sorgusu tamamlandı · 0,8 sn · 20 Ekim 2026</p><Button><span style={styleOf('citation')}>Kaynağı aç · sürüm 3</span></Button></Card><Input.TextArea aria-label="Örnek istem" readOnly value="Son çeyrek ile karşılaştır" style={styleOf('promptInput')} /></>}
        {ctx === 'marketing' && <Card title={<span style={styleOf('h3')}>1.200 ekibin ortak çalışma alanı</span>}>{body}</Card>}
        <footer className={classes.mockFooter}><span style={styleOf('footer')}>Kuzey · Gizlilik ve kullanım koşulları · Örnek ürün sayfası</span></footer>
      </main>
    </div>
  </ConfigProvider>;
}
