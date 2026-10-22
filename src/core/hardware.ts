/** Published physical dimensions; optical corner/cutout paths are front-view reconstructions.
 * CSS viewports are logical screen rectangles, not physical pixels or calibrated monitor millimetres. */
export interface HardwareModel {
  id:string; name:string; width:number; height:number;
  bodyMm:{width:number;height:number;depth:number};
  panel:{width:number;height:number;ppi?:number;diagonal?:number};
  profile:'classic'|'android'|'notch'|'island'|'tablet'|'laptop';
  camera?:{x:number;diameter:number}; gesture?:boolean;
  finish?:'aluminum'|'black'|'silver';
  lid?:{bezelMm:{top:number;bottom:number};frontMm:number;cameraEdge?:'top'|'bottom'};
  homeDiameter?:number;
  cutout?:{width:number;height:number;inset?:number};
  corners:{body:number;screen:number}; safe:{top:number;bottom:number}; source:string;
}
export type PhoneModel = HardwareModel & {profile:'classic'|'android'|'notch'|'island'};
// iPhone 4 corner and home-key dimensions are optical estimates from the supplied front reference.
export const PHONE_MODELS:PhoneModel[]=[
  {id:'m320',name:'iPhone 4',width:320,height:480,bodyMm:{width:58.6,height:115.2,depth:9.3},panel:{width:640,height:960,ppi:326},profile:'classic',homeDiameter:68,corners:{body:56,screen:0},safe:{top:0,bottom:0},source:'https://support.apple.com/en-il/112562'},
  {id:'m360',name:'Galaxy S20',width:360,height:800,bodyMm:{width:69.1,height:151.7,depth:7.9},panel:{width:1440,height:3200,diagonal:6.2},profile:'android',cutout:{width:12,height:12,inset:9},corners:{body:40,screen:30},safe:{top:32,bottom:20},source:'https://www.samsungmobilepress.com/media-assets/galaxy_s20?tab=specs'},
  {id:'m375',name:'iPhone 13 mini',width:375,height:812,bodyMm:{width:64.2,height:131.5,depth:7.65},panel:{width:1080,height:2340,ppi:476},profile:'notch',cutout:{width:178,height:38},corners:{body:70,screen:52},safe:{top:50,bottom:34},source:'https://support.apple.com/en-us/111873'},
  {id:'m390',name:'iPhone 12',width:390,height:844,bodyMm:{width:71.5,height:146.7,depth:7.4},panel:{width:1170,height:2532,ppi:460},profile:'notch',cutout:{width:210,height:32},corners:{body:64,screen:47},safe:{top:47,bottom:34},source:'https://support.apple.com/en-us/111876'},
  {id:'m414',name:'iPhone 11',width:414,height:896,bodyMm:{width:75.7,height:150.9,depth:8.3},panel:{width:828,height:1792,ppi:326},profile:'notch',cutout:{width:210,height:34},corners:{body:76,screen:46},safe:{top:48,bottom:34},source:'https://support.apple.com/en-us/111865'},
  {id:'m430',name:'iPhone 15 Pro Max',width:430,height:932,bodyMm:{width:76.7,height:159.9,depth:8.25},panel:{width:1290,height:2796,ppi:460},profile:'island',cutout:{width:126,height:37,inset:11},corners:{body:72,screen:55},safe:{top:59,bottom:34},source:'https://support.apple.com/en-us/111828'},
];
/** Named tablet generations preserve the existing logical viewport IDs and decision keys. */
export const TABLET_MODELS:HardwareModel[]=[
 {id:'t600',name:'Nexus 7 (2013)',width:600,height:960,bodyMm:{width:114,height:200,depth:8.65},panel:{width:1200,height:1920,ppi:323},profile:'tablet',corners:{body:36,screen:0},safe:{top:0,bottom:0},camera:{x:.7,diameter:10},source:'https://support.google.com/nexus/answer/6102470'},
 {id:'t744',name:'iPad mini (6. nesil)',width:744,height:1133,bodyMm:{width:134.8,height:195.4,depth:6.3},panel:{width:1488,height:2266,ppi:326},profile:'tablet',corners:{body:52,screen:20},safe:{top:0,bottom:24},camera:{x:.5,diameter:10},gesture:true,source:'https://support.apple.com/en-us/111886'},
 {id:'t768',name:'iPad Air 2',width:768,height:1024,bodyMm:{width:169.5,height:240,depth:6.1},panel:{width:1536,height:2048,ppi:264},profile:'classic',corners:{body:42,screen:0},homeDiameter:52,safe:{top:0,bottom:0},camera:{x:.5,diameter:9},source:'https://support.apple.com/en-us/112017'},
 {id:'t820',name:'iPad Air (5. nesil)',width:820,height:1180,bodyMm:{width:178.5,height:247.6,depth:6.1},panel:{width:1640,height:2360,ppi:264},profile:'tablet',corners:{body:48,screen:18},safe:{top:0,bottom:24},camera:{x:.5,diameter:10},gesture:true,source:'https://support.apple.com/en-us/111887'},
 {id:'t834',name:'iPad Pro 11″ (4. nesil)',width:834,height:1194,bodyMm:{width:178.5,height:247.6,depth:5.9},panel:{width:1668,height:2388,ppi:264},profile:'tablet',corners:{body:48,screen:20},safe:{top:0,bottom:24},camera:{x:.5,diameter:11},gesture:true,source:'https://support.apple.com/en-us/111842'},
];
/** Closed chassis footprint is manufacturer data; lid bezels/front lip are optical front-view estimates. */
function laptop(id:string,name:string,width:number,height:number,kind:'xps'|'powerbook'|'thinkpad'|'air'):HardwareModel{
 const specs={
  xps:{bodyMm:{width:304.16,height:200.25,depth:15.35},panel:{width:1920,height:1080,diagonal:13.3},bezelMm:{top:5,bottom:23},frontMm:3,edge:'bottom' as const,cameraX:.15,finish:'silver' as const,source:'https://dl.dell.com/topicspdf/xps-13-9360-laptop_setup-guide_en-us.pdf'},
  powerbook:{bodyMm:{width:277,height:219,depth:30},panel:{width:1024,height:768,diagonal:12.1},bezelMm:{top:12,bottom:18},frontMm:5,edge:undefined,cameraX:.5,finish:'aluminum' as const,source:'https://store.apple.com/Catalog/US/images/portables_comparison_chart_con.html'},
  thinkpad:{bodyMm:{width:336.6,height:232.5,depth:19.95},panel:{width:1366,height:768,diagonal:14},bezelMm:{top:13,bottom:24},frontMm:4,edge:'top' as const,cameraX:.5,finish:'black' as const,source:'https://psref.lenovo.com/syspool/Sys/PDF/ThinkPad/ThinkPad_T480/ThinkPad_T480_Spec.PDF'},
  air:{bodyMm:{width:304.1,height:212.4,depth:16.1},panel:{width:2560,height:1600,diagonal:13.3},bezelMm:{top:11,bottom:17.5},frontMm:3,edge:'top' as const,cameraX:.5,finish:'aluminum' as const,source:'https://support.apple.com/en-us/111883'},
 }[kind];
 const screenWidth=specs.panel.diagonal*25.4*specs.panel.width/Math.hypot(specs.panel.width,specs.panel.height),scale=width/screenWidth;
 return {id,name,width,height,bodyMm:specs.bodyMm,panel:specs.panel,profile:'laptop',finish:specs.finish,lid:{bezelMm:specs.bezelMm,frontMm:specs.frontMm,cameraEdge:specs.edge},camera:specs.edge?{x:specs.cameraX,diameter:1.8*scale}:undefined,corners:{body:(kind==='thinkpad'?2:3.5)*scale,screen:(kind==='powerbook'?0:.8)*scale},safe:{top:0,bottom:0},source:specs.source};
}
export const LAPTOP_MODELS:HardwareModel[]=[
 laptop('l960','Dell XPS 13 9360 · %200',960,540,'xps'),
 laptop('t1024','PowerBook G4 12″ (2005)',1024,768,'powerbook'),
 laptop('l1280','MacBook Air M1 · 1280',1280,800,'air'),
 laptop('l1366','ThinkPad T480 · HD',1366,768,'thinkpad'),
 laptop('l1440','MacBook Air M1 · 1440',1440,900,'air'),
 laptop('l1536','Dell XPS 13 9360 · %125',1536,864,'xps'),
 laptop('l1680','MacBook Air M1 · geniş alan',1680,1050,'air'),
];
export const laptopModel=(id:string)=>LAPTOP_MODELS.find(model=>model.id===id);
export const tabletModel=(id:string)=>TABLET_MODELS.find(model=>model.id===id);
export const hardwareModel=(id:string):HardwareModel|undefined=>phoneModel(id)??tabletModel(id)??laptopModel(id);
export const phoneModel=(id:string)=>PHONE_MODELS.find(model=>model.id===id);
/** Physical body/screen ratio converted to CSS pixels; reported ppi/diagonal are rounded by vendors. */
export function phoneGeometry(model:HardwareModel,width=model.width,height=model.height,landscape=false){
  const physicalScreenWidth=model.panel.ppi?model.panel.width/model.panel.ppi*25.4:model.panel.diagonal!*25.4*model.panel.width/Math.hypot(model.panel.width,model.panel.height);
  const scale=(landscape?height:width)/physicalScreenWidth;
  const bodyWidth=(landscape?model.bodyMm.height:model.bodyMm.width)*scale;
  if(model.lid){
    const x=Math.max(0,(bodyWidth-width)/2),top=model.lid.bezelMm.top*scale,bottom=model.lid.bezelMm.bottom*scale;
    return {x,top,bottom,base:model.lid.frontMm*scale,wide:.045,bodyWidth,bodyHeight:height+top+bottom};
  }
  const bodyHeight=(landscape?model.bodyMm.width:model.bodyMm.height)*scale;
  return {x:Math.max(0,(bodyWidth-width)/2),top:Math.max(0,(bodyHeight-height)/2),bottom:Math.max(0,(bodyHeight-height)/2),base:0,wide:0,bodyWidth,bodyHeight};
}
