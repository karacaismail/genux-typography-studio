import { useMemo } from 'react';
import { ROLE, breakpointAt, deviceDims, resolveAt, resolveContextAt } from '../core';
import { useStudio } from '../store/studio';
import { useStudioSearch } from './useStudioSearch';

/** Etkin bağlam, seçili tür ve çözümlenmiş değerleri. */
export function useCurrent() {
  const [search] = useStudioSearch();
  const decisions = useStudio((s) => s.decisions);
  const { ctx, role: id } = search;
  return useMemo(() => {
    const dims = deviceDims(search.device, search.orient);
    // Değerler seçili cihazın genişliğinde, kırılım zinciri uygulanmış hâliyle.
    return {
      search,
      decisions,
      ctx,
      id,
      def: ROLE[id],
      r: resolveAt(decisions, ctx, id, dims.w),
      resolved: resolveContextAt(decisions, ctx, dims.w),
      settings: decisions.contexts[ctx].settings,
      dims,
      bp: breakpointAt(dims.w),
    };
  }, [search, decisions, ctx, id]);
}
