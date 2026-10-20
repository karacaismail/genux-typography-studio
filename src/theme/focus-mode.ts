/** Merkezi klavye odak modu. Görünür odak kapalı başlar; yalnız Tab ve Shift+Tab açar.
 *  pointerdown/touchstart yalnız görsel modu kapatır (odak ve klavye erişimi korunur).
 *  Durum tek yerde: <html data-focus="kbd">. Depolama yok. */
export function installFocusMode(root: HTMLElement = document.documentElement) {
  const on = (e: KeyboardEvent) => {
    if (e.key === 'Tab') root.dataset.focus = 'kbd';
  };
  const off = () => {
    if (root.dataset.focus) delete root.dataset.focus;
  };
  window.addEventListener('keydown', on, true);
  window.addEventListener('pointerdown', off, { capture: true, passive: true });
  window.addEventListener('touchstart', off, { capture: true, passive: true });
  return () => {
    window.removeEventListener('keydown', on, true);
    window.removeEventListener('pointerdown', off, true);
    window.removeEventListener('touchstart', off, true);
  };
}
