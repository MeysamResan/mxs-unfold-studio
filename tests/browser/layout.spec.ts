import { expect, test, setSeparation } from './fixtures';

test('bottom controller collapses without losing the scene or control state', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__UNFOLD_DEBUG__?.camera?.target));
  await setSeparation(page, 75);
  await page.getByRole('button', { name: 'Labels', exact: true }).click();
  const canvas = await page.locator('canvas').elementHandle();
  const before = await page.locator('.stage').boundingBox();
  const focalPixels = await page.evaluate(() => window.__UNFOLD_DEBUG__!.projection!.focalPixels);
  const modelRequests = await page.evaluate(
    () =>
      performance.getEntriesByType('resource').filter((entry) => entry.name.endsWith('.glb'))
        .length,
  );
  await page.getByRole('button', { name: 'Hide bottom controller' }).click();
  await expect(page.getByRole('button', { name: 'Show bottom controller' })).toHaveAttribute(
    'aria-expanded',
    'false',
  );
  await expect(page.getByRole('slider', { name: 'Separation' })).toHaveCount(0);
  await expect
    .poll(() =>
      page
        .locator('.controller-region')
        .evaluate((element) => element.getBoundingClientRect().height),
    )
    .toBeLessThan(1);
  const expanded = await page.locator('.stage').boundingBox();
  expect(expanded!.height).toBeGreaterThan(before!.height + 100);
  await expect
    .poll(() => page.evaluate(() => window.__UNFOLD_DEBUG__!.projection!.focalPixels))
    .toBeCloseTo(focalPixels, 1);
  expect(await canvas!.evaluate((element) => element.isConnected)).toBe(true);
  await expect(page.locator('canvas')).toHaveCount(1);
  await page.getByRole('button', { name: 'Show bottom controller' }).click();
  await expect(page.getByRole('slider', { name: 'Separation' })).toHaveValue('75');
  await expect(page.getByRole('button', { name: 'Labels', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(await canvas!.evaluate((element) => element.isConnected)).toBe(true);
  expect(
    await page.evaluate(
      () =>
        performance.getEntriesByType('resource').filter((entry) => entry.name.endsWith('.glb'))
          .length,
    ),
  ).toBe(modelRequests);
});

test('right-aligned layout tools and a persistent theme keep the same viewer', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__UNFOLD_DEBUG__?.camera?.target));
  const brand = await page.locator('.brand').boundingBox();
  const tools = await page.getByRole('group', { name: 'Panel visibility' }).boundingBox();
  expect(tools!.x).toBeGreaterThan(brand!.x + brand!.width);
  const navigation = await page.locator('.header-nav').boundingBox();
  expect(navigation!.x + navigation!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  const canvas = await page.locator('canvas').elementHandle();
  await page.getByRole('button', { name: 'Switch to light mode' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.getByRole('button', { name: 'Switch to dark mode' })).toBeVisible();
  expect(await canvas!.evaluate((element) => element.isConnected)).toBe(true);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.getByRole('button', { name: 'Switch to dark mode' })).toBeVisible();
  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
