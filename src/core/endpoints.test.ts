import { expect, it } from 'vitest';
import { applyOverride, applyOverrideAt, buildExport, cssSize, defaultDecisions, importData, resolveAt, sizeAt } from './index';
it('two endpoints ignore legacy device sizes and interpolate integer px in every context', () => {
  let d = applyOverrideAt(defaultDecisions(), 'html', 'h1', { size: 70, lh: 1.8 }, 768);
  d = applyOverride(d, 'html', 'h1', { mode: 'endpoints', size: 24, max: 40 });
  for (const ctx of ['html', 'admin'] as const) for (const w of [320, 360, 768, 1920, 3840]) {
    expect(sizeAt(resolveAt(d, ctx, 'h1', w), d.contexts[ctx].settings, 'h1', w)).toBe(Math.round(24 + (40 - 24) * (w - 320) / (3840 - 320)));
  }
  expect(resolveAt(d, 'html', 'h1', 768).lh).toBe(1.8);
  expect(cssSize(resolveAt(d, 'html', 'h1', 320), d.contexts.html.settings, 'h1')).toContain('@media (min-width: 430px) { font-size: 1.5625rem; }');
  const exported = buildExport(d, 'all');
  const role = (exported.contexts.html as any).roles.h1;
  expect(role.fontSize.byDevice['768']).toBe(26);
  const restored = importData(exported, defaultDecisions(), 'html');
  expect(sizeAt(resolveAt(restored.decisions, 'admin', 'h1', 768), restored.decisions.contexts.admin.settings, 'h1', 768)).toBe(26);
  d = applyOverrideAt(d, 'html', 'h1', { max: 48 }, 1920);
  expect(sizeAt(resolveAt(d, 'html', 'h1', 3840), d.contexts.html.settings, 'h1', 3840)).toBe(48);
  d = applyOverride(d, 'html', 'long', { mode: 'endpoints', size: 12, max: 50 });
  expect(sizeAt(resolveAt(d, 'html', 'long', 3840), d.contexts.html.settings, 'long', 3840)).toBe(18);
});
