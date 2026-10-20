import { BASE_BP, GROUP_BPS, HARD, TIERS, decisionAt, tierOf } from './constants';
import { contrastInfo } from './color';
import { resolveContext } from './resolve';
import { resolveContextAt } from './screens';
import { HEADINGS, ROLE, isReading, rolesOf } from './roles';
import { deviates, isRelative, minSizeOf, sizeAt, valueText } from './size';
import type { Check, ContextId, ContextSettings, Decisions, RoleProps } from './types';
import { fmt } from './util';

export type FontStatus = 'loading' | 'ok' | 'fail';
export interface CheckEnv { overflow?: boolean; fontStatus?: FontStatus }

export interface RoleWarning { code: string; text: string }
/** Tek türün uyarıları. Denetçi ve gezgin aynı listeyi kullanır. */
export function roleWarnings(r: RoleProps, s: ContextSettings, id: string, w: number = BASE_BP): RoleWarning[] {
  const out: RoleWarning[] = [];
  const reading = isReading(id);
  if (deviates(r, s, id, w)) out.push({ code: 'decision', text: `Karardan sapma: ${valueText(r, s)} px (${w} px ekranda karar ${decisionAt(id, w)} px).` });
  (['light', 'dark'] as const).forEach((t) => {
    const c = contrastInfo(r, id, t);
    if (!c.pass) out.push({ code: 'contrast', text: `Kontrast ${t === 'dark' ? 'koyu' : 'açık'} temada ${fmt(c.ratio, 2)}:1 (${c.on} üstünde), gereken ${fmt(c.need)}:1.` });
  });
  if (!reading && !isRelative(r) && minSizeOf(r, id) < HARD.standard) out.push({ code: 'exception', text: `${fmt(minSizeOf(r, id))} px: istisna (varsayılan 16, en az 12).` });
  if (r.lh < 1) out.push({ code: 'lh', text: 'Satır yüksekliği 1,0 altında: çok satırlı metinde satırlar üst üste binebilir.' });
  else if (reading && r.lh < 1.5) out.push({ code: 'lh', text: 'Okuma metninde satır yüksekliği 1,5 altında (WCAG 1.4.8 AAA önerisi).' });
  if (r.w < HARD.minWeight) out.push({ code: 'weight', text: 'Ağırlık 300 altında (GenUX proje kuralı: en az 300).' });
  else if (r.w === HARD.minWeight && r.size < 24) out.push({ code: 'weight', text: 'Ağırlık 300: ağırlık önerisi bunu yalnız çok büyük dekoratif başlıklara ayırıyor.' });
  if (reading && r.tt === 'uppercase') out.push({ code: 'case', text: 'Okuma metninde büyük harf okunurluğu düşürür.' });
  if (r.fst === 'italic' && r.ff === 'sans') out.push({ code: 'italic', text: "Outfit'in italik kesimi yok; tarayıcı yapay eğik italik üretir." });
  if (reading && r.clamp > 0) out.push({ code: 'clamp', text: 'Okuma metninde satır sınırı içeriği gizler.' });
  if (reading && r.mw > 80) out.push({ code: 'measure', text: 'Satır uzunluğu 80 karakteri aşıyor (WCAG 1.4.8 AAA önerisi).' });
  return out;
}

export function computeChecks(dec: Decisions, ctx: ContextId, env: CheckEnv = {}): Check[] {
  const s = dec.contexts[ctx].settings;
  const R = resolveContext(dec, ctx);
  const ids = rolesOf(ctx).map((r) => r.id);
  const name = (id: string) => ROLE[id].label;
  const out: Check[] = [];

  const smallest = ids.reduce((a, id) => (minSizeOf(R[id], id) < minSizeOf(R[a], a) ? id : a), ids[0]);
  out.push({ status: 'enforced', title: 'Varsayılan 16 px; istisnada en az 12 px', detail: `Hiçbir tür, hiçbir ekranda 12 px altına inmez. En küçük: ${name(smallest)} ${fmt(minSizeOf(R[smallest], smallest))} px.` });
  const below = ids.filter((id) => !isRelative(R[id]) && minSizeOf(R[id], id) < HARD.standard);
  if (below.length) out.push({ status: 'info', title: `16 px altındaki türler (istisna) · ${below.length}`, detail: `${below.map((id) => `${name(id)} ${fmt(minSizeOf(R[id], id))}`).join(' · ')}. Varsayılan 16 px; bunlar istisna olarak işaretli.`, roles: below });
  out.push({ status: 'enforced', title: 'Okuma metni 16 px altına inmez (kesin karar)', detail: ids.filter((id) => ROLE[id].kind === 'reading').map((id) => `${name(id)} ${fmt(R[id].size)}`).join(' · ') });
  out.push({ status: 'enforced', title: 'Uzun okuma 18 px (kesin karar)', detail: 'Boyut kilitli; akışkanlık kapalı.' });

  // Kırılım zinciri uygulanmış değerler; kararlar ekran grubunun ilk kırılımında karşılaştırılır.
  const RA = (w: number) => resolveContextAt(dec, ctx, w);
  const groupName = (w: number) => TIERS.find((t) => t.id === tierOf(w))!.label;
  const devItems: string[] = [];
  const devs = new Set<string>();
  GROUP_BPS.forEach((w) => ids.forEach((id) => {
    if (deviates(RA(w)[id], s, id, w)) { devItems.push(`${groupName(w)} ${name(id)}: ${valueText(RA(w)[id], s)} (karar ${decisionAt(id, w)})`); devs.add(id); }
  }));
  out.push(devItems.length
    ? { status: 'warn', title: 'Karardan sapma', detail: devItems.join(' · '), roles: [...devs] }
    : { status: 'pass', title: 'Başlık ve gövde kararlarıyla birebir', detail: 'Mobil 32/28/24/21/18/16 · tablet 34/30/26/22/19/16 · laptop 36/32/28/24/20/16 · masaüstü 40/35/30/26/22/18 · gövde ve paragraf 16 · uzun okuma 18' });

  // Oran testi her ekran sınıfında (mobil uç en dar) yapılır.
  const pairs = HEADINGS.slice(0, -1).map((id, i) => [id, HEADINGS[i + 1]] as const);
  // Oran testi her ekran grubunun ilk kırılımında (320, 744, 1280, 2560).
  const at = (id: string, w: number) => sizeAt(RA(w)[id], s, id, w);
  const weak: string[] = [];
  const weakRoles = new Set<string>();
  GROUP_BPS.forEach((w) => pairs.forEach(([a, b]) => {
    const q = at(a, w) / at(b, w);
    if (q < dec.ratio) { weak.push(`${groupName(w)} ${name(a)}/${name(b)} = ${fmt(q, 3)}`); weakRoles.add(a); weakRoles.add(b); }
  }));
  out.push(weak.length
    ? { status: 'warn', title: `Ardışık başlık oranı ${fmt(dec.ratio)} altında`, detail: `${weak.join(' · ')}. Öneri testi: aynı kapta yan yana başlıklar için.`, roles: [...weakRoles] }
    : { status: 'pass', title: `Ardışık başlık oranı en az ${fmt(dec.ratio)}`, detail: pairs.map(([a, b]) => `${name(a)}/${name(b)} = ${fmt(at(a, BASE_BP) / at(b, BASE_BP), 3)}`).join(' · ') });

  const R1920 = RA(1920);
  const top = ids.reduce((a, id) => (sizeAt(R1920[id], s, id, 1920) > sizeAt(R1920[a], s, a, 1920) ? id : a), ids[0]);
  const topRatio = sizeAt(R1920[top], s, top, 1920) / R1920.body.size;
  out.push({ status: topRatio <= 4 ? 'pass' : 'warn', title: 'En büyük metin / gövde en fazla 4', detail: `${name(top)} ${fmt(sizeAt(R1920[top], s, top, 1920))} ÷ Gövde ${fmt(R1920.body.size)} = ${fmt(topRatio, 2)} (1920 px)`, roles: topRatio <= 4 ? undefined : [top] });

  const lowC: string[] = [];
  const lowRoles = new Set<string>();
  (['light', 'dark'] as const).forEach((t) => ids.forEach((id) => {
    const c = contrastInfo(R[id], id, t);
    if (!c.pass) { lowC.push(`${name(id)} (${t === 'dark' ? 'koyu' : 'açık'}, ${c.on}) ${fmt(c.ratio, 2)}:1`); lowRoles.add(id); }
  }));
  out.push(lowC.length
    ? { status: 'warn', title: 'Kontrast AA altında', detail: lowC.join(' · '), roles: [...lowRoles] }
    : { status: 'pass', title: 'Bütün türler kontrast AA (açık ve koyu)', detail: 'Her tür durduğu en zayıf zemine göre ölçülür.' });

  const issues = ids
    .map((id) => [id, roleWarnings(R[id], s, id).filter((w) => w.code !== 'decision' && w.code !== 'contrast' && w.code !== 'exception')] as const)
    .filter(([, w]) => w.length);
  if (issues.length) out.push({ status: 'info', title: 'Tür uyarıları', detail: issues.map(([id, w]) => `${name(id)}: ${w.map((x) => x.text).join(' ')}`).join(' · '), roles: issues.map(([id]) => id) });

  const fluidOff = ids.filter((id) => R[id].mode === 'fluid' && s.set === 'productive');
  if (fluidOff.length) out.push({ status: 'info', title: 'Productive set: akışkanlık kapalı', detail: `${fluidOff.map(name).join(' · ')} en küçük değerinde sabit.`, roles: fluidOff });
  if (env.overflow) out.push({ status: 'warn', title: 'Önizlemede kabına sığmayan metin var', detail: 'Bir kelime satıra sığmıyor; önizleme yatay kayıyor. Kelime ortasından bölme uygulanmaz.' });
  if (env.fontStatus) {
    out.push(env.fontStatus === 'ok' ? { status: 'pass', title: 'Outfit yüklendi', detail: 'Önizleme Outfit ile gösteriliyor.' }
      : env.fontStatus === 'fail' ? { status: 'warn', title: 'Outfit yüklenemedi', detail: 'Önizleme sistem yazı tipiyle gösteriliyor; kararlar Outfit içindir.' }
        : { status: 'info', title: 'Outfit yükleniyor', detail: 'Yazı tipi gelene kadar sistem yazı tipi gösterilir.' });
  }
  return out;
}

export const checkCounts = (checks: Check[]) => ({
  warn: checks.filter((c) => c.status === 'warn').length,
  info: checks.filter((c) => c.status === 'info').length,
  pass: checks.filter((c) => c.status === 'pass' || c.status === 'enforced').length,
});
