import { expect, test } from '@playwright/test';
import { fresh } from './helpers';

test('narrow editor reveals selected below-fold role inside the fixed phone aperture', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 850 });
  await fresh(page, '?ctx=html&device=m320&role=figcaption&view=page');
  const scroller = page.getByRole('region', { name: 'Kaydırılabilir ekran içeriği, 320 piksel', exact: true });
  const selected = scroller.locator('[data-role="figcaption"].is-editing').first();
  await expect(selected).toBeAttached();
  await expect.poll(() => scroller.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
  const bounds = await scroller.boundingBox();
  const target = await selected.boundingBox();
  expect(target!.y).toBeGreaterThanOrEqual(bounds!.y - 1);
  expect(target!.y + target!.height).toBeLessThanOrEqual(bounds!.y + bounds!.height + 1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
});

for (const [width, landscapeWidth] of [[390, 844], [430, 932]] as const) {
  test(`landscape ${width} comparison fits safe content area at both zoom levels`, async ({ page }) => {
    await page.setViewportSize({ width: 1680, height: 1000 });
    await page.goto('/');
    await page.getByRole('radio', { name: `${width} px`, exact: true }).click();
    await page.getByRole('radiogroup', { name: 'Önizleme yönü', exact: true }).getByText('Yatay', { exact: true }).click();
    const comparison = page.getByRole('region', { name: 'Ekran 2 · Kümenin tamamı', exact: true });
    const scroller = comparison.getByRole('region', { name: `Kaydırılabilir ekran içeriği, ${landscapeWidth} piksel`, exact: true });
    for (const zoom of ['actual', 'fit']) {
      await expect.poll(() => scroller.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
      await expect(comparison.getByTestId('group-surface')).toHaveCSS('width', `${landscapeWidth - (width === 390 ? 81 : 93)}px`);
      if (zoom === 'actual') await page.getByRole('button', { name: 'Çerçeveye sığdır', exact: true }).click();
    }
  });
}
