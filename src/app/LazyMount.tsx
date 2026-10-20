import { Suspense, useEffect, useState, type ReactNode } from 'react';

/** İlk ihtiyaçta yüklenir, sonra bağlı kalır (kapanış geçişi ve tekrar açılış için). */
export function LazyMount({ when, children }: { when: boolean; children: ReactNode }) {
  const [on, setOn] = useState(when);
  useEffect(() => { if (when) setOn(true); }, [when]);
  return on ? <Suspense fallback={null}>{children}</Suspense> : null;
}

/** İlk çizimden bir kare sonra true: ilk açılışta da giriş geçişi oynar. */
export function useNextFrame() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return ready;
}
