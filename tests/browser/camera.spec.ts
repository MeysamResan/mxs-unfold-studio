import { expect, test, setSeparation, type Page } from './fixtures';

type CameraPose = { position: number[]; quaternion: number[]; target: number[] | null };

async function cameraPose(page: Page): Promise<CameraPose> {
  return page.evaluate(() => window.__UNFOLD_DEBUG__!.camera);
}

function poseDifference(a: CameraPose, b: CameraPose) {
  const left = [...a.position, ...a.quaternion, ...(a.target ?? [])];
  const right = [...b.position, ...b.quaternion, ...(b.target ?? [])];
  return Math.max(...left.map((value, index) => Math.abs(value - right[index])));
}

async function orbitAndZoom(page: Page, zoomDelta = -180) {
  await page.waitForFunction(() => Boolean(window.__UNFOLD_DEBUG__?.camera?.target));
  const initial = await cameraPose(page);
  const canvas = page.locator('canvas');
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  const x = box!.x + box!.width * 0.4;
  const y = box!.y + box!.height * 0.35;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 80, y + 40, { steps: 12 });
  await page.mouse.up();
  await page.mouse.wheel(0, zoomDelta);
  let previous = await cameraPose(page);
  await expect
    .poll(
      async () => {
        await page.waitForTimeout(450);
        const next = await cameraPose(page);
        const difference = poseDifference(previous, next);
        previous = next;
        return difference;
      },
      { timeout: 10_000 },
    )
    .toBeLessThan(0.00001);
  const explored = await cameraPose(page);
  expect(poseDifference(initial, explored)).toBeGreaterThan(0.1);
  return { initial, explored };
}

async function expectPose(page: Page, expected: CameraPose) {
  // Let React, resizing, and a subsequent rendered frame expose any camera reassignment.
  await page.waitForTimeout(450);
  // OrbitControls retains sub-pixel damping below its own change-event threshold.
  expect(poseDifference(await cameraPose(page), expected)).toBeLessThan(0.01);
}

test('controller actions preserve the explored camera until an explicit reset', async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto('/');
  const { initial, explored } = await orbitAndZoom(page);

  await page.getByRole('button', { name: 'Labels', exact: true }).click();
  await expectPose(page, explored);
  await page.getByRole('button', { name: 'Mute sounds' }).click();
  await expectPose(page, explored);
  await page.getByRole('button', { name: 'Enable sounds' }).click();
  await expectPose(page, explored);
  await page.getByRole('button', { name: 'Viewer settings', exact: true }).click();
  await expectPose(page, explored);
  await page.getByRole('radio', { name: 'Balanced Lower resolution, lighter rendering' }).check();
  await page.getByRole('button', { name: '1.5×', exact: true }).click();
  await expectPose(page, explored);
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await expectPose(page, explored);
  await setSeparation(page, 75);
  await expectPose(page, explored);
  await setSeparation(page, 0);
  await expectPose(page, explored);
  await page.getByRole('button', { name: 'Chamber', exact: true }).click();
  await expectPose(page, explored);
  await setSeparation(page, 0);
  await expectPose(page, explored);

  for (const name of [
    'Hide bottom controller',
    'Show bottom controller',
    'Switch to light mode',
    'Switch to dark mode',
  ]) {
    await page.getByRole('button', { name, exact: true }).click();
    await expectPose(page, explored);
  }
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect
    .poll(async () => poseDifference(await cameraPose(page), initial))
    .toBeLessThan(0.0001);
});

test('panel changes and fullscreen preserve the explored camera', async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== 'desktop',
    'Desktop sidebars and fullscreen resize the studio.',
  );
  test.setTimeout(60_000);
  await page.goto('/');
  // Zoom out before widening the stage to catch viewport-dependent zoom-limit clamping.
  const { explored } = await orbitAndZoom(page, 900);
  for (const name of [
    'Hide left panel',
    'Hide right panel',
    'Show left panel',
    'Show right panel',
  ]) {
    await page.getByRole('button', { name, exact: true }).click();
    await expectPose(page, explored);
  }
  await page.getByRole('button', { name: 'Toggle fullscreen' }).click();
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
  await expectPose(page, explored);
  await page.getByRole('button', { name: 'Toggle fullscreen' }).click();
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(false);
  await expectPose(page, explored);
});
