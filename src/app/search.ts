import * as z from 'zod/mini';
import { CONTEXT_IDS, DEVICES, hasRole, type ContextId } from '../core';

// Bounded mirrors of workflow-only IDs; keep routing independent of the workflow engine.
// navigation.test.ts checks parity against the complete WORKFLOW_DEVICES registry.
const workflowOnlyDevice = /^(?:monitor(?:2048|2560|3440|3840)|tv(?:1280|1920|2560|3440|3840))$/;

/** Legacy core desktop links resolve to the workflow's matching monitor profile. */
export function workflowDeviceId(id: string): string {
  const device=DEVICES.find(item=>item.id===id && item.group==='desktop' && item.w>=2560);
  const monitor=device?`monitor${device.w}`:id;
  return workflowOnlyDevice.test(monitor)?monitor:id;
}

/** Preview geometry only: this does not project workflow-only TV/monitor decisions. */
export function freeEditorDeviceId(id: string): string {
  if(DEVICES.some(device=>device.id===id))return id;
  if(!workflowOnlyDevice.test(id))return 'l1280';
  const width=Number(id.replace(/^(?:monitor|tv)/,''));
  const candidates=DEVICES.filter(device=>device.w===width);
  return candidates.find(device=>device.group==='desktop')?.id ?? candidates[0]?.id ?? 'l1280';
}

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
  if(s.workspace==='workflow')s.device=workflowDeviceId(s.device);
  const registered=DEVICES.some(d=>d.id===s.device && (s.workspace==='free' || d.w<2560));
  const workflowExtra=s.workspace==='workflow' && workflowOnlyDevice.test(s.device);
  if (!registered && !workflowExtra) s.device = 'l1280';
  return s;
}
