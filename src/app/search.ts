import * as z from 'zod/mini';
import { CONTEXT_IDS, DEVICES, hasRole, type ContextId } from '../core';

export const VIEWS = ['page', 'lines', 'scale'] as const;
export type View = (typeof VIEWS)[number];

const raw = z.object({
  workspace: z.catch(z.enum(['workflow', 'free']), 'workflow'),
  ctx: z.catch(z.enum(CONTEXT_IDS as [ContextId, ...ContextId[]]), 'admin'),
  role: z.catch(z.string().check(z.maxLength(40)), 'h1'),
  device: z.catch(z.string().check(z.maxLength(12)), 'l1280'),
  orient: z.catch(z.enum(['portrait', 'landscape']), 'portrait'),
  theme: z.catch(z.enum(['light', 'dark']), 'light'),
  view: z.catch(z.enum(VIEWS), 'page'),
});
export type StudioSearch = z.infer<typeof raw>;

/** URL durumu: geçersiz değerler sessizce varsayılana döner; tür bağlamda yoksa H1. */
export function validateStudioSearch(input: Record<string, unknown>): StudioSearch {
  const s = raw.parse(input);
  if (!hasRole(s.ctx, s.role)) s.role = 'h1';
  if (!DEVICES.some((d) => d.id === s.device)) s.device = 'l1280';
  return s;
}
