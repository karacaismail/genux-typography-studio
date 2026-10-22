import { expect, test, type Locator, type Page } from '@playwright/test';

// Independent acceptance values: do not derive expectations from the production model/geometry.
const tablets = [
  { id: 't600', name: 'Nexus 7 (2013)', width: 600, height: 960, bodyWidth: 114, bodyHeight: 200, cameraX: .7, home: false, gesture: false },
  { id: 't744', name: 'iPad mini (6. nesil)', width: 744, height: 1133, bodyWidth: 134.8, bodyHeight: 195.4, cameraX: .5, home: false, gesture: true },
  { id: 't768', name: 'iPad Air 2', width: 768, height: 1024, bodyWidth: 169.5, bodyHeight: 240, cameraX: .5, home: true, gesture: false },
  { id: 't820', name: 'iPad Air (5. nesil)', width: 820, height: 1180, bodyWidth: 178.5, bodyHeight: 247.6, cameraX: .5, home: false, gesture: true },
  { id: 't834', name: 'iPad Pro 11″ (4. nesil)', width: 834, height: 1194, bodyWidth: 178.5, bodyHeight: 247.6, cameraX: .5, home: false, gesture: true },
] as const;
type Tablet = typeof tablets[number];
type Rect = { x: number; y: number; width: number; height: number; right: number; bottom: number };

function inside(inner: Rect, outer: Rect) {
  expect(inner.x).toBeGreaterThanOrEqual(outer.x);
  expect(inner.y).toBeGreaterThanOrEqual(outer.y);
  expect(inner.right).toBeLessThanOrEqual(outer.right);
  expect(inner.bottom).toBeLessThanOrEqual(outer.bottom);
}

// Browser layout quantizes fractional physical-to-CSS geometry; center checks allow <0.05 CSS px.
async function hardware(body: Locator, model: Tablet, landscape: boolean) {
  const width = landscape ? model.height : model.width;
  const height = landscape ? model.width : model.height;
  await expect(body).toHaveCount(1);
  await expect(body).toHaveAttribute('data-kind', 'tablet');
  await expect(body).toHaveAttribute('data-profile', model.home ? 'classic' : 'tablet');
  if (landscape) await expect(body).toHaveAttribute('data-landscape', 'true');
  else await expect(body).not.toHaveAttribute('data-landscape');
  const screen = body.getByRole('region', { name: 'Önizleme ekranı, ' + width + ' piksel', exact: true });
  await expect(screen).toHaveCSS('width', width + 'px');
  await expect(screen).toHaveCSS('height', height + 'px');
  // Frame transform proves actual zoom; CSS width alone would also pass a scaled preview.
  await expect(body.locator('..')).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
  await expect(body.locator('[data-device-hardware] > span:first-child')).toBeVisible();
  await expect(body.locator('[data-device-home]')).toHaveCount(model.home ? 1 : 0);
  // Gesture decoration has no semantic/data hook; scope the CSS-module class to this model body.
  const gesture = body.locator(':scope > [class*="homeIndicator"]');
  await expect(gesture).toHaveCount(model.gesture ? 1 : 0);
  if (model.gesture) {
    await expect(gesture).toBeVisible();
    await expect(gesture).toHaveCSS(landscape ? 'width' : 'height', '5px');
  }
  if (model.home) {
    await expect(body.locator('[data-device-home]')).toHaveCSS('width', '52px');
    await expect(body.locator('[data-device-home]')).toHaveCSS('height', '52px');
  }
  const measured = await body.evaluate(element => {
    const rect = (node: Element): Rect => {
      const r = node.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom };
    };
    const aperture = element.querySelector('[aria-label^="Önizleme ekranı,"]');
    const camera = element.querySelector('[data-device-hardware] > span:first-child');
    const depth = element.querySelector('[data-screen-depth]');
    if (!aperture || !camera || !depth) throw new Error('Tablet aperture, camera or depth overlay missing');
    const home = element.querySelector('[data-device-home]');
    const indicator = element.querySelector(':scope > [class*="homeIndicator"]');
    return { body: rect(element), screen: rect(aperture), depth: rect(depth), camera: rect(camera), home: home ? rect(home) : null, gesture: indicator ? rect(indicator) : null };
  });
  expect(measured.screen.width).toBe(width);
  expect(measured.screen.height).toBe(height);
  expect(landscape ? measured.body.width / measured.body.height : measured.body.height / measured.body.width)
    .toBeCloseTo(model.bodyHeight / model.bodyWidth, 3);
  inside(measured.screen, measured.body);
  inside(measured.camera, measured.body);
  expect(measured.camera.width).toBeGreaterThan(0);
  expect(measured.camera.height).toBeGreaterThan(0);
  expect(measured.camera.width).toBe(measured.camera.height);
  // The depth overlay must match the fixed live aperture, including after content grows.
  for (const key of ['x', 'y', 'width', 'height'] as const) expect(measured.depth[key]).toBeCloseTo(measured.screen[key], 3);
  if (landscape) {
    expect(measured.camera.right).toBeLessThan(measured.screen.x);
    expect((measured.camera.y + measured.camera.height / 2 - measured.body.y) / measured.body.height).toBeCloseTo(1 - model.cameraX, 3);
    expect(measured.camera.x + measured.camera.width / 2 - measured.body.x).toBeCloseTo((measured.screen.x - measured.body.x) / 2, 1);
  } else {
    expect(measured.camera.bottom).toBeLessThan(measured.screen.y);
    expect((measured.camera.x + measured.camera.width / 2 - measured.body.x) / measured.body.width).toBeCloseTo(model.cameraX, 3);
    expect(measured.camera.y + measured.camera.height / 2 - measured.body.y).toBeCloseTo((measured.screen.y - measured.body.y) / 2, 1);
  }
  if (measured.home) {
    inside(measured.home, measured.body);
    if (landscape) {
      expect(measured.home.x).toBeGreaterThan(measured.screen.right);
      expect(measured.home.y + measured.home.height / 2).toBeCloseTo(measured.body.y + measured.body.height / 2, 1);
    } else {
      expect(measured.home.y).toBeGreaterThan(measured.screen.bottom);
      expect(measured.home.x + measured.home.width / 2).toBeCloseTo(measured.body.x + measured.body.width / 2, 1);
    }
  }
  if (measured.gesture) inside(measured.gesture, measured.screen);
  return measured;
}

async function orientation(page: Page, label: 'Dikey' | 'Yatay') {
  const group = page.getByRole('radiogroup', { name: 'Önizleme yönü', exact: true });
  await group.getByText(label, { exact: true }).click();
  await expect(group.getByRole('radio', { name: label, exact: true })).toBeChecked();
}

for (const model of tablets) {
  test(model.id + ' ' + model.name + ' keeps physical hardware and fixed apertures across both previews, orientations and editor handoff', async ({ page }) => {
    await page.setViewportSize({ width: 3840, height: 1800 });
    await page.goto('/?workspace=workflow&ctx=html&device=' + model.id + '&role=h1');
    const selected = page.getByRole('region', { name: 'Ekran 1 · Seçili element', exact: true });
    const comparison = page.getByRole('region', { name: 'Ekran 2 · Kümenin tamamı', exact: true });
    const selectedBody = selected.locator('[data-model="' + model.id + '"]');
    const comparisonBody = comparison.locator('[data-model="' + model.id + '"]');
    await expect(page.getByRole('radio', { name: model.width + ' px', exact: true })).toBeChecked();
    await expect(page.getByRole('radiogroup', { name: 'Önizleme yönü', exact: true }).getByRole('radio', { name: 'Dikey', exact: true })).toBeChecked();
    for (const label of ['Dikey', 'Yatay'] as const) {
      await orientation(page, label);
      const landscape = label === 'Yatay';
      const a = await hardware(selectedBody, model, landscape);
      const b = await hardware(comparisonBody, model, landscape);
      await expect(selected.getByText(/ölçek %100/)).toBeVisible();
      await expect(comparison.getByText(/ölçek %100/)).toBeVisible();
      expect(a.body.width).toBe(b.body.width);
      expect(a.body.height).toBe(b.body.height);
      expect(Math.abs(a.body.y - b.body.y)).toBeLessThan(1);
      expect(Math.abs(a.body.bottom - b.body.bottom)).toBeLessThan(1);
      expect(Math.abs(a.screen.y - b.screen.y)).toBeLessThan(1);
      expect(Math.abs(a.screen.bottom - b.screen.bottom)).toBeLessThan(1);
      await expect(page.getByRole('radio', { name: model.width + ' px', exact: true })).toBeChecked();
      await expect(page.getByRole('region', { name: 'H1 karar formu', exact: true })).toBeVisible();
      await expect(comparison.getByRole('button', { name: 'H1 düzenle', exact: true })).toHaveAttribute('aria-pressed', 'true');
      expect(new URL(page.url()).searchParams.get('device')).toBe(model.id);
    }

    // Handoff preserves the explicit profile. Workflow's preview-only orientation is reset
    // deliberately; free editor has its own URL orientation and initially uses fit zoom.
    await orientation(page, 'Dikey');
    await page.getByRole('button', { name: 'Serbest editör', exact: true }).click();
    await expect(page.locator('[data-canvas-root]')).toBeVisible();
    // First-visit onboarding can open after the lazy editor mounts, especially in WebKit.
    const skipTour=page.getByRole('button',{name:'Geç',exact:true});
    try{await skipTour.click({timeout:2000});}catch{if(await skipTour.isVisible())throw new Error('Onboarding could not be dismissed');}
    expect(new URL(page.url()).searchParams.get('device')).toBe(model.id);
    expect(new URL(page.url()).searchParams.get('ctx')).toBe('html');
    expect(new URL(page.url()).searchParams.get('role')).toBe('h1');
    const editorBody = page.locator('[data-canvas-root] [data-model="' + model.id + '"]');
    await page.getByRole('button', { name: 'Gerçek boyuta geç', exact: true }).click();
    await hardware(editorBody, model, false);
    await page.getByRole('button', { name: 'Yatay yöne çevir', exact: true }).click();
    await hardware(editorBody, model, true);

    // Narrow Canvas requests autoHeight: named tablets must still keep their fixed aperture.
    await page.setViewportSize({ width: 320, height: 850 });
    const screen = editorBody.getByRole('region', { name: 'Önizleme ekranı, ' + model.height + ' piksel', exact: true });
    const scroller = screen.getByRole('region', { name: 'Kaydırılabilir ekran içeriği, ' + model.height + ' piksel', exact: true });
    const grownHeight=await scroller.evaluate(async element => {
      const filler = document.createElement('div');
      filler.dataset.tabletHardwareStress = 'true';
      filler.style.height = '5000px';
      filler.textContent = 'Uzun tablet içeriği';
      const measured=element.firstElementChild as HTMLElement|null;
      if(!measured)throw new Error('Measured tablet content child missing');
      measured.append(filler);
      await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
      element.scrollTop = element.scrollHeight;
      return measured.offsetHeight;
    });
    expect(grownHeight).toBeGreaterThanOrEqual(5000);
    await expect.poll(() => scroller.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
    await hardware(editorBody, model, true);
    await expect(screen).toHaveCSS('height', model.width + 'px');
  });
}
