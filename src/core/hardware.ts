/** Published physical dimensions; optical corner/cutout paths are front-view reconstructions.
 * CSS viewports are logical screen rectangles, not physical pixels or calibrated monitor millimetres. */
export interface PhoneModel {
  id:string; name:string; width:number; height:number;
  bodyMm:{width:number;height:number;depth:number};
  panel:{width:number;height:number;ppi?:number;diagonal?:number};
  profile:'classic'|'android'|'notch'|'island';
  homeDiameter?:number;
  cutout?:{width:number;height:number};
  corners:{body:number;screen:number}; safe:{top:number;bottom:number}; source:string;
}
// iPhone 4 corner and home-key dimensions are optical estimates from the supplied front reference.
export const PHONE_MODELS:PhoneModel[]=[
  {id:'m320',name:'iPhone 4',width:320,height:480,bodyMm:{width:58.6,height:115.2,depth:9.3},panel:{width:640,height:960,ppi:326},profile:'classic',homeDiameter:68,corners:{body:56,screen:0},safe:{top:0,bottom:0},source:'https://support.apple.com/en-il/112562'},
  {id:'m360',name:'Galaxy S20',width:360,height:800,bodyMm:{width:69.1,height:151.7,depth:7.9},panel:{width:1440,height:3200,diagonal:6.2},profile:'android',corners:{body:32,screen:25},safe:{top:32,bottom:20},source:'https://www.samsungmobilepress.com/media-assets/galaxy_s20?tab=specs'},
  {id:'m375',name:'iPhone 13 mini',width:375,height:812,bodyMm:{width:64.2,height:131.5,depth:7.65},panel:{width:1080,height:2340,ppi:476},profile:'notch',cutout:{width:178,height:38},corners:{body:70,screen:52},safe:{top:50,bottom:34},source:'https://support.apple.com/en-us/111873'},
  {id:'m390',name:'iPhone 12',width:390,height:844,bodyMm:{width:71.5,height:146.7,depth:7.4},panel:{width:1170,height:2532,ppi:460},profile:'notch',corners:{body:55,screen:40},safe:{top:47,bottom:34},source:'https://support.apple.com/en-us/111876'},
  {id:'m414',name:'iPhone 11',width:414,height:896,bodyMm:{width:75.7,height:150.9,depth:8.3},panel:{width:828,height:1792,ppi:326},profile:'notch',corners:{body:65,screen:43},safe:{top:48,bottom:34},source:'https://support.apple.com/en-us/111865'},
  {id:'m430',name:'iPhone 15 Pro Max',width:430,height:932,bodyMm:{width:76.7,height:159.9,depth:8.25},panel:{width:1290,height:2796,ppi:460},profile:'island',corners:{body:66,screen:53},safe:{top:59,bottom:34},source:'https://support.apple.com/en-us/111828'},
];
export const phoneModel=(id:string)=>PHONE_MODELS.find(model=>model.id===id);
/** Physical body/screen ratio converted to CSS pixels; reported ppi/diagonal are rounded by vendors. */
export function phoneGeometry(model:PhoneModel,width=model.width,height=model.height,landscape=false){
  const physicalScreenWidth=model.panel.ppi?model.panel.width/model.panel.ppi*25.4:model.panel.diagonal!*25.4*model.panel.width/Math.hypot(model.panel.width,model.panel.height);
  const scale=(landscape?height:width)/physicalScreenWidth;
  const bodyWidth=(landscape?model.bodyMm.height:model.bodyMm.width)*scale;
  const bodyHeight=(landscape?model.bodyMm.width:model.bodyMm.height)*scale;
  return {x:Math.max(0,(bodyWidth-width)/2),top:Math.max(0,(bodyHeight-height)/2),bottom:Math.max(0,(bodyHeight-height)/2),base:0,wide:0,bodyWidth,bodyHeight};
}
