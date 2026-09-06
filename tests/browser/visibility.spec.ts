import { expect, test, startChamber, type Page } from './fixtures';

async function frameCount(page: Page) {
  return page.evaluate(() => window.__UNFOLD_DEBUG__?.frames ?? 0);
}

async function expectNoFrames(page: Page) {
  await expect.poll(() => page.evaluate(() => window.__UNFOLD_DEBUG__?.active)).toBe(false);
  const before = await frameCount(page);
  await page.waitForTimeout(400);
  expect(await frameCount(page)).toBe(before);
  return before;
}

async function explore(page: Page) {
  await page.waitForFunction(() => Boolean(window.__UNFOLD_DEBUG__?.camera?.target));
  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  const x = box!.x + box!.width * 0.42;
  const y = box!.y + box!.height * 0.4;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 50, y + 25, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(850);
  return page.evaluate(() => window.__UNFOLD_DEBUG__!.camera);
}

function difference(left: number[], right: number[]) {
  return Math.max(...left.map((value, index) => Math.abs(value - right[index])));
}

test('scrolling the studio out of a clipped viewport suspends and resumes the same scene', async ({
  page,
}) => {
  // The tablet layout has actual page content below the studio; no synthetic spacer is needed.
  await page.setViewportSize({ width: 1024, height: 600 });
  let modelRequests = 0;
  page.on('request', (request) => {
    if (request.url().includes('/media/models/') && request.url().endsWith('.glb')) modelRequests++;
  });
  await page.goto('/');
  const camera = await explore(page);
  const canvas = await page.locator('canvas').elementHandle();
  await startChamber(page);
  const started = await frameCount(page);
  await expect.poll(() => frameCount(page)).toBeGreaterThan(started + 3);

  const loadedRequests = modelRequests;
  const scroller = page.locator('.page-scroll > .scroll-area-viewport');
  await scroller.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(page.locator('.viewer-viewport')).toHaveAttribute('data-render-active', 'false');
  const clippedBox = await page.locator('canvas').boundingBox();
  expect(clippedBox!.y + clippedBox!.height).toBeLessThanOrEqual(0);
  const paused = await expectNoFrames(page);

  await scroller.evaluate((element) => {
    element.scrollTop = 0;
  });
  await expect(page.locator('.viewer-viewport')).toHaveAttribute('data-render-active', 'true');
  await expect.poll(() => frameCount(page)).toBeGreaterThan(paused + 3);
  await expect(page.getByRole('button', { name: 'Chamber', exact: true })).toHaveAttribute(
    'aria-busy',
    'true',
  );
  expect(
    await page.evaluate((previous) => document.querySelector('canvas') === previous, canvas),
  ).toBe(true);
  const resumed = await page.evaluate(() => window.__UNFOLD_DEBUG__!.camera);
  expect(difference(resumed.position, camera.position)).toBeLessThan(0.01);
  expect(difference(resumed.quaternion, camera.quaternion)).toBeLessThan(0.01);
  expect(modelRequests).toBe(loadedRequests);
});

test('opening a dialog suspends hidden motion while keeping the camera and play state', async ({
  page,
}) => {
  await page.goto('/');
  const camera = await explore(page);
  const canvas = await page.locator('canvas').elementHandle();
  await startChamber(page);
  const started = await frameCount(page);
  await expect.poll(() => frameCount(page)).toBeGreaterThan(started + 3);
  await page.getByRole('button', { name: 'About Unfold Studio' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('.viewer-viewport')).toHaveAttribute('data-render-active', 'false');
  const paused = await expectNoFrames(page);
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await expect(page.locator('.viewer-viewport')).toHaveAttribute('data-render-active', 'true');
  await expect.poll(() => frameCount(page)).toBeGreaterThan(paused + 3);
  await expect(page.getByRole('button', { name: 'Chamber', exact: true })).toHaveAttribute(
    'aria-busy',
    'true',
  );
  expect(
    await page.evaluate((previous) => document.querySelector('canvas') === previous, canvas),
  ).toBe(true);
  const resumed = await page.evaluate(() => window.__UNFOLD_DEBUG__!.camera);
  expect(difference(resumed.position, camera.position)).toBeLessThan(0.01);
  expect(difference(resumed.quaternion, camera.quaternion)).toBeLessThan(0.01);
});

test('a model that finishes loading behind a dialog paints when the dialog closes', async ({
  page,
}) => {
  let releaseModel: (() => void) | undefined;
  const released = new Promise<void>((resolve) => {
    releaseModel = resolve;
  });
  await page.route('**/media/models/*.glb', async (route) => {
    await released;
    await route.continue();
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'About Unfold Studio' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  releaseModel!();
  await expect(page.locator('canvas')).toHaveCount(1);
  await expect(page.locator('.viewer-viewport')).toHaveAttribute('data-render-active', 'false');
  const before = await frameCount(page);
  await page.waitForTimeout(350);
  expect(await frameCount(page)).toBe(before);
  await page.keyboard.press('Escape');
  await page.waitForFunction(
    () => performance.getEntriesByName('unfold:model-first-frame').length > 0,
  );
  await expect(page.locator('.viewer-viewport')).toHaveAttribute('data-render-active', 'true');
  await expect.poll(() => frameCount(page)).toBeGreaterThan(before);
});
