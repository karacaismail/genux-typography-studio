import { workflowDeviceId } from '../../app/search';
import { CONTEXT_IDS, ROLE, type ContextId, type Decisions } from '../../core';
import { approve, FLOW_STEPS, isReviewed, WORKFLOW_DEVICES, type FlowState } from './model';

export interface WorkflowLocation { ctx: ContextId; device: string; role: string }
/** Only actual, recognised URL fields override a saved cursor; router defaults are not intent. */
export function readWorkflowLocation(query: string): Partial<WorkflowLocation> {
  const params = new URLSearchParams(query);
  const ctx = params.get('ctx');
  const device = workflowDeviceId(params.get('device') ?? '');
  const role = params.get('role');
  return {
    ...(ctx && CONTEXT_IDS.includes(ctx as ContextId) ? { ctx: ctx as ContextId } : {}),
    ...(device && WORKFLOW_DEVICES.some(item => item.device.id === device) ? { device } : {}),
    ...(role && Object.hasOwn(ROLE, role) ? { role } : {}),
  };
}

export function workflowLocation(flow: FlowState): WorkflowLocation {
  const step = FLOW_STEPS.find(item => item.key === flow.cursor) ?? FLOW_STEPS[0];
  return { ctx: step.ctx, device: step.device.id, role: step.roles.includes(flow.role) ? flow.role : step.roles[0] };
}

export function resolveWorkflowLocation(flow: FlowState, location: Partial<WorkflowLocation>): FlowState {
  const saved = FLOW_STEPS.find(item => item.key === flow.cursor) ?? FLOW_STEPS[0];
  const ctx = location.ctx ?? saved.ctx;
  const device = location.device ?? saved.device.id;
  const candidates = FLOW_STEPS.filter(item => item.ctx === ctx && item.device.id === device);
  const target = candidates.find(item => item.roles.includes(location.role ?? flow.role))
    ?? candidates.find(item => item.group === saved.group) ?? candidates[0] ?? saved;
  const role = target.roles.includes(location.role ?? flow.role) ? (location.role ?? flow.role) : target.roles[0];
  return target.key === flow.cursor && role === flow.role ? flow : { ...flow, cursor: target.key, role };
}

/** Resolve selection inside the functional state update, including approval gates. */
export function approveAndAdvance(flow: FlowState, decisions: Decisions, now = new Date(), reason?: string): FlowState {
  const step = FLOW_STEPS.find(item => item.key === flow.cursor) ?? FLOW_STEPS[0];
  const role = step.roles.includes(flow.role) ? flow.role : step.roles[0];
  const next = approve(flow, decisions, step, role, now, {reason});
  if (next === flow || !isReviewed(next, decisions, step, role)) return next;
  const index = step.roles.indexOf(role);
  if (index < step.roles.length - 1) return { ...next, cursor: step.key, role: step.roles[index + 1] };
  const remaining = step.roles.find(item => !isReviewed(next, decisions, step, item));
  if (remaining) return { ...next, cursor: step.key, role: remaining };
  const following = FLOW_STEPS[FLOW_STEPS.indexOf(step) + 1];
  return following ? { ...next, cursor: following.key, role: following.roles[0] } : next;
}
