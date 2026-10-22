import { expect, test, type Locator } from '@playwright/test';

// Independent acceptance cases, not values imported from the production model factory.
// Closed-chassis depth/footprint is deliberately not treated as the open lid's aspect ratio.
const laptops = [
  { id: 'l960', name: 'Dell XPS 13 9360', width: 960, height: 540, camera: 'bottom', cameraX: .15 },
  { id: 't1024', name: 'PowerBook G4 12 (2005)', width: 1024, height: 768, camera: 'none', cameraX: .5 },
  { id: 'l1280', name: 'MacBook Air M1', width: 1280, height: 800, camera: 'top', cameraX: .5 },
  { id: 'l1366', name: 'ThinkPad T480', width: 1366, height: 768, camera: 'top', cameraX: .5 },
  { id: 'l1440', name: 'MacBook Air M1', width: 1440, height: 900, camera: 'top', cameraX: .5 },
  { id: 'l1536', name: 'Dell XPS 13 9360', width: 1536, height: 864, camera: 'bottom', cameraX: .15 },
  { id: 'l1680', name: 'MacBook Air M1', width: 1680, height: 1050, camera: 'top', cameraX: .5 },
] as const;
type Laptop = typeof laptops[number];
type Rect = { x: number; y: number; width: number; height: number; right: number; bottom: number };

function contained(inner: Rect, outer: Rect) {
  expect(inner.x).toBeGreaterThanOrEqual(outer.x);
  expect(inner.y).toBeGreaterThanOrEqual(outer.y);
  expect(inner.right).toBeLessThanOrEqual(outer.right);
  expect(inner.bottom).toBeLessThanOrEqual(outer.bottom);
}

async function laptopHardware(body: Locator, model: Laptop) {
  await expect(body).toHaveCount(1);
  await expect(body).toHaveAttribute('data-kind', 'laptop');
  await expect(body).toHaveAttribute('data-profile', 'laptop');
  await expect(body).not.toHaveAttribute('data-landscape');
  const screen = body.getByRole('region', { name: 'Önizleme ekranı, ' + model.width + ' piksel', exact: true });
  await expect(screen).toHaveCSS('width', model.width + 'px');
  await expect(screen).toHaveCSS('height', model.height + 'px');
  // Both CSS dimensions and rendered dimensions must be unscaled at actual zoom.
  const transform = await body.locator('..').evaluate(element => new DOMMatrix(getComputedStyle(element).transform).toFloat64Array().slice(0, 4));
  expect(Array.from(transform)).toEqual([1, 0, 0, 0]);
  const base = body.locator('xpath=following-sibling::*[@data-device-base]');
  await expect(base).toHaveCount(1);
  await expect(base).toBeVisible();
  await expect(base).toHaveAttribute('data-kind', 'laptop');
  const hardware = body.locator('[data-device-hardware]');
  await expect(hardware).toHaveCount(1);
  if (model.camera === 'none') {
    await expect(hardware).toHaveCSS('display', 'none');
    await expect(hardware).not.toHaveAttribute('data-camera-present');
    await expect(hardware.locator(':scope > span:first-child')).not.toBeVisible();
    await expect(body).not.toHaveAttribute('data-camera-edge');
  } else {
    await expect(hardware).toHaveAttribute('data-camera-present', 'true');
    await expect(body).toHaveAttribute('data-camera-edge', model.camera);
    await expect(hardware.locator(':scope > span:first-child')).toBeVisible();
  }
  await expect(body.locator('[data-device-home]')).toHaveCount(0);
  await expect(body.locator(':scope > [class*="homeIndicator"]')).toHaveCount(0);
  const metrics = await body.evaluate(element => {
    const rect = (node: Element): Rect => {
      const r = node.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom };
    };
    const screen = element.querySelector('[aria-label^="Önizleme ekranı,"]');
    const depth = element.querySelector('[data-screen-depth]');
    const hardware = element.querySelector('[data-device-hardware]');
    const camera = hardware?.firstElementChild;
    const base = element.nextElementSibling;
    if (!screen || !depth || !hardware || !camera || !base?.hasAttribute('data-device-base')) throw new Error('Laptop aperture, hardware or sibling base missing');
    return { body: rect(element), screen: rect(screen), depth: rect(depth), base: rect(base), camera: getComputedStyle(hardware).display === 'none' ? null : rect(camera) };
  });
  expect(metrics.screen.width).toBe(model.width);
  expect(metrics.screen.height).toBe(model.height);
  contained(metrics.screen, metrics.body);
  expect(metrics.body.width).toBeGreaterThan(metrics.screen.width);
  expect(metrics.body.height).toBeGreaterThan(metrics.screen.height);
  // Side bezels are symmetric; neither the fixed aperture nor front lip may drift horizontally.
  expect(metrics.screen.x - metrics.body.x).toBeCloseTo(metrics.body.right - metrics.screen.right, 1);
  expect(metrics.base.width).toBeGreaterThan(metrics.body.width);
  expect(metrics.base.x).toBeLessThan(metrics.body.x);
  expect(Math.abs((metrics.body.x - metrics.base.x) - (metrics.base.right - metrics.body.right))).toBeLessThan(.05);
  expect(metrics.base.y).toBeCloseTo(metrics.body.bottom, 2);
  expect(metrics.base.height).toBeGreaterThan(0);
  expect(metrics.base.height).toBeLessThan(metrics.body.height - metrics.screen.height);
  for (const key of ['x', 'y', 'width', 'height'] as const) expect(metrics.depth[key]).toBeCloseTo(metrics.screen[key], 3);
  if (model.camera === 'none') expect(metrics.camera).toBeNull();
  else {
    const camera = metrics.camera!;
    contained(camera, metrics.body);
    expect(camera.width).toBeGreaterThan(0);
    expect(camera.height).toBeGreaterThan(0);
    expect(camera.width).toBeCloseTo(camera.height, 2);
    expect((camera.x + camera.width / 2 - metrics.body.x) / metrics.body.width).toBeCloseTo(model.cameraX, 3);
    if (model.camera === 'bottom') expect(camera.y).toBeGreaterThan(metrics.screen.bottom);
    else expect(camera.bottom).toBeLessThan(metrics.screen.y);
  }
  return metrics;
}

async function growContent(scroller: Locator) {
  const grownHeight = await scroller.evaluate(async element => {
    const measured = element.firstElementChild as HTMLElement | null;
    if (!measured) throw new Error('Measured laptop content child missing');
    const filler = document.createElement('div');
    filler.dataset.laptopHardwareStress = 'true';
    filler.style.height = '5000px';
    filler.textContent = 'Uzun dizüstü içeriği';
    measured.append(filler);
    // Let ResizeObserver and React layout updates settle before checking the fixed aperture.
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    element.scrollTop = element.scrollHeight;
    return measured.offsetHeight;
  });
  expect(grownHeight).toBeGreaterThanOrEqual(5000);
  await expect.poll(() => scroller.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
}

for (const model of laptops) {
  test(model.id + ' ' + model.name + ' keeps both workflow apertures aligned at actual size, including 320px layout', async ({ page }) => {
    await page.setViewportSize({ width: 3840, height: 2000 });
    await page.goto('/?workspace=workflow&ctx=html&device=' + model.id + '&role=h1');
    const selected = page.getByRole('region', { name: 'Ekran 1 · Seçili element', exact: true });
    const comparison = page.getByRole('region', { name: 'Ekran 2 · Kümenin tamamı', exact: true });
    const aBody = selected.locator('[data-model="' + model.id + '"]');
    const bBody = comparison.locator('[data-model="' + model.id + '"]');
    await expect(page.getByRole('radio', { name: model.width + ' px', exact: true })).toBeChecked();
    const a = await laptopHardware(aBody, model);
    const b = await laptopHardware(bBody, model);
    await expect(selected.getByText(/ölçek %100/)).toBeVisible();
    await expect(comparison.getByText(/ölçek %100/)).toBeVisible();
    for (const part of ['body', 'screen', 'base'] as const) {
      expect(a[part].width).toBe(b[part].width);
      expect(a[part].height).toBe(b[part].height);
      expect(Math.abs(a[part].y - b[part].y)).toBeLessThan(1);
      expect(Math.abs(a[part].bottom - b[part].bottom)).toBeLessThan(1);
    }
    await expect(page.getByRole('radiogroup', { name: 'Önizleme yönü', exact: true })).toHaveCount(0);
    await page.setViewportSize({ width: 320, height: 850 });
    for (const body of [aBody, bBody]) {
      const scroller = body.getByRole('region', { name: 'Kaydırılabilir ekran içeriği, ' + model.width + ' piksel', exact: true });
      await growContent(scroller);
      const narrow = await laptopHardware(body, model);
      expect(narrow.body.width).toBe(a.body.width);
      expect(narrow.body.height).toBe(a.body.height);
    }
    await expect(page.getByRole('radio', { name: model.width + ' px', exact: true })).toBeChecked();
    expect(new URL(page.url()).searchParams.get('device')).toBe(model.id);
  });
}

test('named M1 laptop survives editor handoff and narrow autoHeight without stretching its aperture', async ({ page }) => {
  const model = laptops.find(item => item.id === 'l1440')!;
  await page.setViewportSize({ width: 3840, height: 2000 });
  await page.goto('/?workspace=workflow&ctx=html&device=' + model.id + '&role=h1');
  await expect(page.getByRole('region', { name: 'H1 karar formu', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Serbest editör', exact: true }).click();
  await expect(page.locator('[data-canvas-root]')).toBeVisible();
  const skip = page.getByRole('button', { name: 'Geç', exact: true });
  try { await skip.click({ timeout: 2000 }); }
  catch { if (await skip.isVisible()) throw new Error('Onboarding could not be dismissed'); }
  expect(new URL(page.url()).searchParams.get('device')).toBe(model.id);
  expect(new URL(page.url()).searchParams.get('ctx')).toBe('html');
  expect(new URL(page.url()).searchParams.get('role')).toBe('h1');
  await page.getByRole('button', { name: 'Gerçek boyuta geç', exact: true }).click();
  const body = page.locator('[data-canvas-root] [data-model="' + model.id + '"]');
  const before = await laptopHardware(body, model);
  await expect(page.getByRole('button', { name: 'Yatay yöne çevir', exact: true })).toBeDisabled();
  await page.setViewportSize({ width: 320, height: 850 });
  await growContent(body.getByRole('region', { name: 'Kaydırılabilir ekran içeriği, ' + model.width + ' piksel', exact: true }));
  const after = await laptopHardware(body, model);
  expect(after.body.width).toBe(before.body.width);
  expect(after.body.height).toBe(before.body.height);
});
