/** Source registry shared by hardware, editor and workflow monitor profiles.
 * Manufacturer millimetres, native pixels and application CSS viewports are separate contracts.
 * Nominal head measurements exclude the stand. Stand heights are whole-product heights,
 * not neck lengths; a renderer must not add them to the head height.
 * Optical bezel splits, corners, foot silhouettes and curved-screen projection are not specified here.
 */
export type MonitorModelId = 'dell-u2424h' | 'dell-u2724d' | 'dell-u3425we' | 'dell-u2723qe' | 'dell-u3224kb';
export interface MonitorHardware {
  readonly model: MonitorModelId;
  readonly name: string;
  readonly headMm: { readonly width: number; readonly height: number; readonly depth: number };
  readonly panel: {
    readonly width: number; readonly height: number;
    readonly activeMm: { readonly width: number; readonly height: number };
    readonly curvatureRadiusMm: number | null;
  };
  readonly withStandMm: { readonly minHeight: number; readonly maxHeight: number; readonly depth: number };
  readonly source: { readonly url: string; readonly section: string; readonly checked: '2026-10-22' };
}

/** Dell datasheet nominal dimensions; U3425WE's curved active area uses the datasheet's
 * 799.80 × 334.80 mm values (the regional shop page rounds/reports 799.85 × 334.77).
 * These are source measurements, not proof of a calibrated physical-size rendering.
 */
export const MONITOR_HARDWARE: readonly MonitorHardware[] = [
  {
    model: 'dell-u2424h', name: 'Dell UltraSharp U2424H',
    headMm: { width: 538.64, height: 311.21, depth: 49.10 },
    panel: { width: 1920, height: 1080, activeMm: { width: 527.04, height: 296.46 }, curvatureRadiusMm: null },
    withStandMm: { minHeight: 364.00, maxHeight: 496.53, depth: 181.75 },
    source: { url: 'https://www.delltechnologies.com/asset/en-au/products/electronics-and-accessories/technical-support/dell-ultrasharp-24-monitor-u2424h-datasheet.pdf', section: 'Technical specification: preset display area, maximum resolution, physical dimensions', checked: '2026-10-22' },
  },
  {
    model: 'dell-u2724d', name: 'Dell UltraSharp U2724D',
    headMm: { width: 612.24, height: 352.51, depth: 50.12 },
    panel: { width: 2560, height: 1440, activeMm: { width: 596.74, height: 335.66 }, curvatureRadiusMm: null },
    withStandMm: { minHeight: 385.58, maxHeight: 535.58, depth: 192.28 },
    source: { url: 'https://www.dell.com/en-gb/shop/accessories/apd/210-BKVB', section: 'Tech Specs: preset display area, maximum preset resolution, physical characteristics', checked: '2026-10-22' },
  },
  {
    model: 'dell-u3425we', name: 'Dell UltraSharp U3425WE',
    headMm: { width: 813.46, height: 359.15, depth: 105.08 },
    panel: { width: 3440, height: 1440, activeMm: { width: 799.80, height: 334.80 }, curvatureRadiusMm: 1900 },
    withStandMm: { minHeight: 392.83, maxHeight: 542.83, depth: 240.43 },
    source: { url: 'https://www.delltechnologies.com/asset/en-ca/products/electronics-and-accessories/technical-support/dell-ultrasharp-34-curved-thunderbolt-hub-monitor-u3425we-datasheet.pdf', section: 'Technical specification: active display area, curvature, maximum resolution, physical dimensions', checked: '2026-10-22' },
  },
  {
    model: 'dell-u2723qe', name: 'Dell UltraSharp U2723QE',
    headMm: { width: 611.44, height: 353.01, depth: 54.33 },
    panel: { width: 3840, height: 2160, activeMm: { width: 596.74, height: 335.66 }, curvatureRadiusMm: null },
    withStandMm: { minHeight: 385.18, maxHeight: 535.18, depth: 185.00 },
    source: { url: 'https://i.dell.com/sites/csdocuments/Merchandizing_Docs/ja/U2723QE_27%E3%82%A4%E3%83%B3%E3%83%81_4K_HDR_USB-C_HUB_%E3%83%A2%E3%83%8B%E3%82%BF-.pdf', section: 'U2723QE specification table: display area, native resolution, dimensions with/without stand', checked: '2026-10-22' },
  },
  {
    model: 'dell-u3224kb', name: 'Dell UltraSharp U3224KB',
    headMm: { width: 717.42, height: 486.64, depth: 66.29 },
    panel: { width: 6144, height: 3456, activeMm: { width: 696.73, height: 391.91 }, curvatureRadiusMm: null },
    withStandMm: { minHeight: 522.63, maxHeight: 682.63, depth: 237.00 },
    source: { url: 'https://www.delltechnologies.com/asset/en-sg/products/electronics-and-accessories/technical-support/dell-ultrasharp-32-6k-monitor-u3224kb-datasheet.pdf', section: 'Technical specification: display area, native resolution, dimensions with/without stand', checked: '2026-10-22' },
  },
];

export type MonitorProfileId = 'l1920' | 'monitor2048' | 'd2560' | 'monitor2560' | 'd3440' | 'monitor3440' | 'd3840' | 'monitor3840';
export type MonitorMapping =
  | { readonly kind: 'native' }
  | { readonly kind: 'illustrative-scale'; readonly nativePixelsPerCssPixel: number; readonly note: string };
export interface MonitorProfile {
  readonly id: MonitorProfileId;
  readonly family: 'desktop';
  readonly width: number;
  readonly height: number;
  readonly model: MonitorModelId;
  readonly mapping: MonitorMapping;
}

/** Preserve editor IDs and workflow monitor IDs independently, even at equal widths.
 * The 2048 mapping is application arithmetic (6K / 3), not a vendor/OS scaling guarantee.
 * monitor3440 keeps its decision ID/width but now uses the native ultrawide height, 1440.
 */
export const MONITOR_PROFILES: readonly MonitorProfile[] = [
  { id: 'l1920', family: 'desktop', width: 1920, height: 1080, model: 'dell-u2424h', mapping: { kind: 'native' } },
  { id: 'monitor2048', family: 'desktop', width: 2048, height: 1152, model: 'dell-u3224kb', mapping: { kind: 'illustrative-scale', nativePixelsPerCssPixel: 3, note: 'Representative 6144 × 3456 panel at 3 native pixels per CSS pixel; no OS/DPR claim.' } },
  { id: 'd2560', family: 'desktop', width: 2560, height: 1440, model: 'dell-u2724d', mapping: { kind: 'native' } },
  { id: 'monitor2560', family: 'desktop', width: 2560, height: 1440, model: 'dell-u2724d', mapping: { kind: 'native' } },
  { id: 'd3440', family: 'desktop', width: 3440, height: 1440, model: 'dell-u3425we', mapping: { kind: 'native' } },
  { id: 'monitor3440', family: 'desktop', width: 3440, height: 1440, model: 'dell-u3425we', mapping: { kind: 'native' } },
  { id: 'd3840', family: 'desktop', width: 3840, height: 2160, model: 'dell-u2723qe', mapping: { kind: 'native' } },
  { id: 'monitor3840', family: 'desktop', width: 3840, height: 2160, model: 'dell-u2723qe', mapping: { kind: 'native' } },
];

/** No width-only fallback: a TV at 1920/2560/3440/3840 must never acquire monitor hardware. */
export function monitorProfile(id: string, family: string = 'desktop'): MonitorProfile | undefined {
  return family === 'desktop' ? MONITOR_PROFILES.find(profile => profile.id === id) : undefined;
}
export function monitorHardware(model: string): MonitorHardware | undefined {
  return MONITOR_HARDWARE.find(hardware => hardware.model === model);
}
