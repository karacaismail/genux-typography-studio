import { recommendedRole, resolveAt, sizeAt, type Decisions } from '../core';
import { FLOW_STEPS, REVIEW_TARGETS, canApproveDecision, decisionsForStep, emptyFlow, fingerprint, type FlowState } from '../features/workflow/model';
import { constrainPrediction, resolvePolicy } from '../features/workflow/policy';

const at = new Date('2026-10-21T12:00:00.000Z');
const ratioException = 'Full-ledger fixture: preserve individually fitted heading sizes where the integer ratio cannot fit.';

/** Construct every profile before resolving/fingerprinting it. Snapshots never supply learned values.
 * This is an approved-record fixture, not a simulation of thousands of user approve() actions.
 * Nonwaivable checks still run for every target; ratio exceptions carry an explicit test reason. */
export function createFullLedger(d: Decisions): FlowState {
  const profiles: NonNullable<FlowState['profiles']> = {};
  const catalog = new Map<string, ReturnType<typeof constrainPrediction>['values']>();
  const empty = emptyFlow();
  for (const [key, { step, role }] of REVIEW_TARGETS) {
    const cacheKey = `${step.ctx}:${step.device.w}:${role}`;
    let values = catalog.get(cacheKey);
    if (!values) {
      values = constrainPrediction({ ...recommendedRole(step.ctx, role, step.device.w), mw: 0, gr: 1 }, role, step.device.w, resolvePolicy(empty, d, step.ctx)).values;
      catalog.set(cacheKey, values);
    }
    profiles[key] = structuredClone(values);
  }
  const ledger: FlowState = { ...empty, cursor: FLOW_STEPS.at(-1)!.key, profiles, reviews: {} };
  const reviews: FlowState['reviews'] = {};
  for (const [key, { step, role }] of REVIEW_TARGETS) {
    const options = /^h[1-6]$/.test(role) ? { reason: ratioException } : {};
    if (!canApproveDecision(ledger, d, step, role, options)) throw new Error(`Invalid full-ledger fixture decision: ${key}`);
    const effective = decisionsForStep(ledger, d, step);
    const values = resolveAt(effective, step.ctx, role, step.device.w);
    reviews[key] = {
      ...options, at: at.toISOString(), values: structuredClone(values),
      appliedFontSizePx: Math.round(sizeAt(values, d.contexts[step.ctx].settings, role, step.device.w)),
      fingerprint: fingerprint(effective, step, role, ledger),
    };
  }
  return { ...ledger, reviews };
}

