import { useNavigate, useSearch } from '@tanstack/react-router';
import { useCallback } from 'react';
import type { StudioSearch } from './search';

/** URL'deki çalışma durumu (bağlam, tür, cihaz, yön, tuval teması, görünüm). Değişiklikler geçmişe eklenmez. */
export function useStudioSearch() {
  const search = useSearch({ from: '/' });
  const navigate = useNavigate({ from: '/' });
  const setSearch = useCallback(
    (patch: Partial<StudioSearch>) => navigate({ search: (prev: StudioSearch) => ({ ...prev, ...patch }), replace: true }),
    [navigate],
  );
  return [search, setSearch] as const;
}
