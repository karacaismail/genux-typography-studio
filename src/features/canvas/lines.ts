const FILLER = ('Satır yüksekliği bir satırın kapladığı dikey alandır. Yazı boyutu aynı kalırken bu değer büyüdükçe satırlar arasındaki boşluk artar, '
  + 'küçüldükçe satırlar birbirine yaklaşır. Uzun okumada rahat bir ritim için genellikle 1,5 civarı önerilir; başlıklarda daha sıkı değerler tercih edilir. '
  + 'Bu test alanı seçili türü birden fazla satıra yayarak farkı görünür kılar ve her satır kutusunu şeritle işaretler. '
  + 'Paragraflar arasındaki boşluk, harf ve kelime aralığı da aynı kartta birlikte değerlendirilir.').split(' ');

/** Metni ölçerek tam hedef satır sayısına oturtur (kart genişliği ve türün bütün ayarlarına göre).
 *  Kelime ortasından bölme yapılmaz; sığmayan kelimede ulaşılan satır sayısı döner. */
export function fillLines(el: HTMLElement, base: string, fs: number, lhpx: number, target: number): number {
  const words = [...base.split(' '), '—', ...FILLER, ...FILLER];
  const lines = () => Math.round(el.getBoundingClientRect().height / (lhpx * scaleOf(el)));
  const width = el.parentElement?.clientWidth || 300;
  const perLine = Math.max(8, width / (0.55 * fs));
  let n = 1;
  for (let chars = 0; n < words.length && chars + words[n].length + 1 < perLine * (target - 0.6); n += 1) chars += words[n].length + 1;
  el.textContent = words.slice(0, n).join(' ');
  if (!el.getClientRects().length) return 0;
  while (lines() < target && n < words.length) { n += 1; el.textContent = words.slice(0, n).join(' '); }
  while (lines() > target && n > 1) { n -= 1; el.textContent = words.slice(0, n).join(' '); }
  return lines();
}
/** Dönüşümle ölçeklenmiş kaplarda ölçü düzeltmesi. */
export const scaleOf = (el: HTMLElement) => (el.offsetHeight ? el.getBoundingClientRect().height / el.offsetHeight : 1) || 1;
