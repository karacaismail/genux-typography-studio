import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Vitest global'leri kapalı: Testing Library'nin otomatik temizliği elle bağlanır.
afterEach(() => { if (typeof document !== 'undefined') cleanup(); });

// jsdom'da olmayan tarayıcı API'leri (Mantine bileşenleri bunları kullanır). Node ortamındaki testlerde atlanır.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false, media: query, onchange: null,
    addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
  }) as MediaQueryList;
}
class RO { observe() {} unobserve() {} disconnect() {} }
if (typeof window !== 'undefined') {
  window.ResizeObserver ??= RO as unknown as typeof ResizeObserver;
  Element.prototype.scrollIntoView ??= () => {};
}
