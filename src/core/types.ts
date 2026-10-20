// GenUX tipografi alan modeli. Saf TypeScript; arayüzden bağımsız.

export type ContextId = 'html' | 'admin' | 'marketing' | 'ecommerce' | 'bi' | 'ai';
export type ProductId = Exclude<ContextId, 'html'>;
export type Theme = 'light' | 'dark';
export type Kind = 'heading' | 'display' | 'reading' | 'long' | 'ui' | 'tag' | 'inline';
export type SizeMode = 'static' | 'tiers' | 'fluid' | 'relative' | 'endpoints';
export type TierId = 'mobile' | 'tablet' | 'laptop' | 'desktop';
export type FontFamilyKey = 'sans' | 'mono' | 'system';
export type FontStyleKey = 'normal' | 'italic';
export type TextTransformKey = 'none' | 'uppercase' | 'capitalize' | 'lowercase';
export type TextDecorationKey = 'none' | 'underline' | 'line-through';
export type NumericKey = 'normal' | 'tabular-nums' | 'proportional-nums';
export type AlignKey = 'start' | 'center' | 'end';
export type WrapKey = 'wrap' | 'balance' | 'pretty';
export type BgKey = 'surface' | 'field' | 'bg';
export type CategoryId = 'headings' | 'body' | 'interface' | 'data' | 'commerce' | 'conversation' | 'editorial' | 'technical';

export interface GrayPair {
  light: string;
  dark: string;
}

/** Bir türün çözümlenmiş tipografi özellikleri. */
export interface RoleProps {
  size: number;
  mode: SizeMode;
  sizes: Record<TierId, number> | null;
  em: number;
  /** Ekranla büyüme: 320 → 1920 px arasındaki toplam çarpan (1 = sabit). Kırılıma girmez. */
  gr: number;
  max: number;
  w: number;
  lh: number;
  ls: number;
  ws: number;
  ff: FontFamilyKey;
  fst: FontStyleKey;
  tt: TextTransformKey;
  td: TextDecorationKey;
  num: NumericKey;
  ta: AlignKey;
  wrap: WrapKey;
  mw: number;
  clamp: number;
  mt: number;
  mb: number;
  c: GrayPair;
}
export type PropKey = keyof RoleProps;
export type RoleOverrides = Partial<RoleProps>;

/** Katalogdaki bir tür (değişmez tanım). */
export interface RoleDef {
  id: string;
  label: string;
  /** Eski laboratuvar grubu (JSON uyumluluğu ve filtre için). */
  group: string;
  category: CategoryId;
  kind: Kind;
  ctx: ContextId[];
  def: RoleProps;
  bgs: BgKey[];
  src: string;
  sample: string;
  samples?: Partial<Record<ContextId, string>>;
  /** HTML5 metin elementi: temel katmanda ve her ürün türünde bulunur. */
  el?: boolean;
}

export interface ContextSettings {
  set: 'expressive' | 'productive';
  basis: 'viewport' | 'container';
  minW: number;
  maxW: number;
}

export interface ContextState {
  settings: ContextSettings;
  /** Yalnız kullanıcının ezdiği değerler (temel ekran, 320 px); geri kalanı zincirden çözülür. */
  overrides: Record<string, RoleOverrides>;
  /** Kırılım ezmeleri: tür → en küçük genişlik (px) → ezme. Küçükten büyüğe kalıtılır (min-width). Renk girmez. */
  screens?: Record<string, Record<string, RoleOverrides>>;
}

export interface Decisions {
  contexts: Record<ContextId, ContextState>;
  ratio: number;
}

/** Bir özelliğin değerinin nereden geldiği. */
export type Inheritance = 'default' | 'inherited' | 'context' | 'overridden';

export type CheckStatus = 'pass' | 'warn' | 'info' | 'enforced';
export interface Check {
  status: CheckStatus;
  title: string;
  detail: string;
  roles?: string[];
}

export interface Device {
  id: string;
  group: TierId;
  w: number;
  h: number;
  name: string;
}
