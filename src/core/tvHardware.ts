/** TV-only identities: CSS viewports, native pixels and physical chassis are independent.
 * Dimensions/stand spans are manufacturer data. Active area is a nominal 16:9 estimate
 * from the published diagonal, NOT an official active-area measurement or CAD drawing.
 */
export type TvModelId = 'sony-kd32w800' | 'samsung-ua32t5300' | 'lg-oled55c34la' | 'sony-xr55x90l';
export interface TvHardware {
  readonly model:TvModelId;
  readonly name:string;
  readonly bodyMm:{readonly width:number;readonly height:number;readonly depth:number};
  readonly withStandMm:{readonly width:number;readonly height:number;readonly depth:number};
  readonly panel:{readonly width:number;readonly height:number;readonly diagonalMm:number;readonly areaBasis:'nominal-16:9-diagonal-estimate'};
  readonly stand:{readonly type:'twin-feet'|'mini-arc'|'pedestal';readonly widthMm:number;readonly position:'standard'};
  readonly source:{readonly url:string;readonly section:string;readonly checked:'2026-10-22'};
}
export const TV_HARDWARE:readonly TvHardware[]=[
  {
    model:'sony-kd32w800',name:'Sony KD-32W800 (2021)',
    bodyMm:{width:733,height:442,depth:78},withStandMm:{width:733,height:468,depth:189},
    panel:{width:1366,height:768,diagonalMm:800,areaBasis:'nominal-16:9-diagonal-estimate'},
    stand:{type:'twin-feet',widthMm:448,position:'standard'},
    source:{url:'https://www.sony.co.uk/electronics/support/televisions-projectors-lcd-tvs-android-/kd-32w800/specifications',section:'Dimensions & Weight; Picture (Panel); standard-position stand width',checked:'2026-10-22'},
  },
  {
    model:'samsung-ua32t5300',name:'Samsung UA32T5300AWXXY (2020)',
    bodyMm:{width:737.4,height:438,depth:74.1},withStandMm:{width:737.4,height:465.4,depth:150.5},
    panel:{width:1920,height:1080,diagonalMm:32*25.4,areaBasis:'nominal-16:9-diagonal-estimate'},
    stand:{type:'mini-arc',widthMm:732.5,position:'standard'},
    source:{url:'https://images.samsung.com/is/content/samsung/p5/au/tvs/specs/2021/T5300-FHD-Smart-TV-2020-Product-Specifications.pdf',section:'Pages 2/4/5: resolution, MINI ARC design, body/with-stand dimensions and basic stand span',checked:'2026-10-22'},
  },
  {
    model:'lg-oled55c34la',name:'LG OLED55C34LA C3 (2023)',
    bodyMm:{width:1222,height:703,depth:45.1},withStandMm:{width:1222,height:757,depth:230},
    panel:{width:3840,height:2160,diagonalMm:55*25.4,areaBasis:'nominal-16:9-diagonal-estimate'},
    stand:{type:'pedestal',widthMm:470,position:'standard'},
    source:{url:'https://www.lg.com/uk/tvs-soundbars/smart-tvs/oled55c34la/',section:'Picture (Display); Dimensions and Weights: 1222x703x45.1 / 1222x757x230; TV stand 470x230',checked:'2026-10-22'},
  },
  {
    model:'sony-xr55x90l',name:'Sony XR-55X90L (2023)',
    bodyMm:{width:1225,height:707,depth:56},withStandMm:{width:1225,height:738,depth:345},
    panel:{width:3840,height:2160,diagonalMm:1390,areaBasis:'nominal-16:9-diagonal-estimate'},
    stand:{type:'twin-feet',widthMm:1067,position:'standard'},
    source:{url:'https://www.sony.co.uk/electronics/support/televisions-projectors-lcd-tvs-android-/xr-55x90l/specifications',section:'Dimensions & Weight; Picture (Panel); standard stand position only (not narrow/soundbar)',checked:'2026-10-22'},
  },
];
export interface TvProfile {
  readonly id:'tv1280'|'tv1920'|'tv2560'|'tv3440'|'tv3840';
  readonly family:'tv';readonly width:number;readonly height:number;readonly model:TvModelId;
  readonly mapping:{readonly kind:'native'|'logical-scaled';readonly note:string};
}
export const TV_PROFILES:readonly TvProfile[]=[
  {id:'tv1280',family:'tv',width:1280,height:720,model:'sony-kd32w800',mapping:{kind:'logical-scaled',note:'1280x720 logical HD, represented by a native 1366x768 HD panel; rounded native aspect differs slightly. No OS/DPR guarantee.'}},
  {id:'tv1920',family:'tv',width:1920,height:1080,model:'samsung-ua32t5300',mapping:{kind:'native',note:'Logical FHD matches native panel pixels; CSS pixels are not calibrated physical pixels.'}},
  {id:'tv2560',family:'tv',width:2560,height:1440,model:'lg-oled55c34la',mapping:{kind:'logical-scaled',note:'3840x2160 / 1.5 logical viewport; not a native QHD TV or an OS/DPR guarantee.'}},
  {id:'tv3440',family:'tv',width:3440,height:1935,model:'sony-xr55x90l',mapping:{kind:'logical-scaled',note:'16:9 4K panel represented at 3440x1935 (scale 48/43); not an ultrawide TV.'}},
  {id:'tv3840',family:'tv',width:3840,height:2160,model:'lg-oled55c34la',mapping:{kind:'native',note:'Logical 4K matches native panel pixels; CSS pixels are not calibrated physical pixels.'}},
];
export function tvProfile(id:string,family:string='tv'):TvProfile|undefined {
  return family==='tv'?TV_PROFILES.find(profile=>profile.id===id):undefined;
}
export function tvHardware(model:string):TvHardware|undefined {return TV_HARDWARE.find(hardware=>hardware.model===model);}
export function tvActiveArea(hardware:TvHardware):{width:number;height:number} {
  return {width:hardware.panel.diagonalMm*16/Math.hypot(16,9),height:hardware.panel.diagonalMm*9/Math.hypot(16,9)};
}
