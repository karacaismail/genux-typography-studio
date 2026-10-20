/** Platforma göre kısayol değiştirici simgesi (yalnız gösterim için). */
export const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
export const MOD = IS_MAC ? '⌘' : 'Ctrl';

export const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: [MOD, 'K'], label: 'Komut paleti' },
  { keys: [MOD, 'Z'], label: 'Geri al' },
  { keys: [MOD, '⇧', 'Z'], label: 'Yinele' },
  { keys: [MOD, 'S'], label: 'Hazır ayarı kaydet' },
  { keys: [MOD, 'E'], label: 'JSON dışa aktar' },
  { keys: [MOD, '⇧', 'O'], label: 'JSON içe aktar' },
  { keys: [MOD, 'Enter'], label: 'Önizlemeyi tam ekran aç' },
];
