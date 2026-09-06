import { expect, test, type Page } from './fixtures';

type AudioCounts = { buffers: number; oscillators: number; durations: number[] };
declare global {
  interface Window {
    __ACTION_AUDIO__?: AudioCounts;
  }
}

async function sounds(page: Page) {
  return page.evaluate(() => window.__ACTION_AUDIO__!);
}

test('background and action controls preserve the view and only actions or the slider make sound', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const counts = { buffers: 0, oscillators: 0, durations: [] as number[] };
    window.__ACTION_AUDIO__ = counts;
    const bufferStart = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args: Parameters<typeof bufferStart>) {
      counts.buffers++;
      counts.durations.push(this.buffer?.duration ?? 0);
      return bufferStart.apply(this, args);
    };
    const oscillatorStart = OscillatorNode.prototype.start;
    OscillatorNode.prototype.start = function (...args: Parameters<typeof oscillatorStart>) {
      counts.oscillators++;
      return oscillatorStart.apply(this, args);
    };
  });
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__UNFOLD_DEBUG__?.camera.target));
  await page.waitForTimeout(500);
  const canvas = await page.locator('canvas').elementHandle();
  const before = await page.evaluate(() => window.__UNFOLD_DEBUG__!.camera);
  await expect(page.getByRole('button', { name: 'GitHub repository' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Attachments', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Reload', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Assembled', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Motion study', exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: 'Labels', exact: true }).click();
  await page.getByRole('button', { name: 'Labels', exact: true }).click();
  await page.getByRole('button', { name: 'Studio background', exact: true }).click();
  const sharedPopupWidth = await page
    .getByRole('dialog')
    .evaluate((element) => getComputedStyle(element).width);
  await page.getByRole('button', { name: 'Dark red', exact: true }).click();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await expect(page.locator('.workspace')).toHaveCSS('background-color', 'rgb(125, 0, 0)');
  await page.getByRole('button', { name: 'Switch to light mode' }).click();
  await expect(page.locator('.workspace')).toHaveCSS('background-color', 'rgb(125, 0, 0)');
  expect((await sounds(page)).buffers).toBe(0);
  expect((await sounds(page)).oscillators).toBe(0);
  expect(await canvas!.evaluate((element) => element.isConnected)).toBe(true);

  for (const action of ['Shoot', 'Chamber']) {
    const button = page.getByRole('button', { name: action, exact: true });
    await button.click();
    await expect(button).toHaveAttribute('aria-busy', 'true');
    await expect(button).toHaveCSS('cursor', 'pointer');
    await expect(button).toHaveAttribute('aria-busy', 'false', { timeout: 15_000 });
  }
  const gunSounds = await sounds(page);
  expect(gunSounds.durations.some((duration) => Math.abs(duration - 0.55) < 0.001)).toBe(true);
  expect(gunSounds.durations.some((duration) => Math.abs(duration - 0.72) < 0.001)).toBe(true);
  await page.getByRole('button', { name: 'Mute sounds' }).click();
  await page.getByRole('button', { name: 'Shoot', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Shoot', exact: true })).toHaveAttribute(
    'aria-busy',
    'false',
  );
  expect((await sounds(page)).buffers).toBe(gunSounds.buffers);
  await page.getByRole('button', { name: 'Enable sounds' }).click();
  expect((await sounds(page)).buffers).toBe(gunSounds.buffers);
  const slider = page.getByRole('slider', { name: 'Separation' });
  await expect(slider).toHaveCSS('cursor', 'pointer');
  await slider.press('End');
  await expect(slider).toHaveValue('100');
  await expect
    .poll(async () =>
      (await sounds(page)).durations.some((duration) => Math.abs(duration - 0.036) < 0.001),
    )
    .toBe(true);
  const separatedSounds = await sounds(page);
  for (const action of ['Shoot', 'Chamber']) {
    const button = page.getByRole('button', { name: action, exact: true });
    await button.click();
    const popup = page.getByRole('dialog', { name: 'Nice try, mate!', exact: true });
    await expect(popup).toContainText('Assemble the gun first');
    await expect(popup).toHaveCSS('width', sharedPopupWidth);
    await expect(page.locator('.viewer-viewport')).toHaveAttribute('data-render-active', 'false');
    expect(await sounds(page)).toEqual(separatedSounds);
    if (action === 'Shoot')
      await popup.getByRole('button', { name: 'Got it', exact: true }).click();
    else await page.keyboard.press('Escape');
    await expect(popup).toHaveCount(0);
    await expect(button).toBeFocused();
    await expect(button).toHaveAttribute('aria-busy', 'false');
    await expect(slider).toHaveValue('100');
    expect(await canvas!.evaluate((element) => element.isConnected)).toBe(true);
  }
  await slider.press('Home');
  await page.waitForTimeout(500);
  const after = await page.evaluate(() => window.__UNFOLD_DEBUG__!.camera);
  const pose = (value: typeof before) => [
    ...value.position,
    ...value.quaternion,
    ...(value.target ?? []),
  ];
  expect(
    Math.max(...pose(before).map((value, index) => Math.abs(value - pose(after)[index]))),
  ).toBeLessThan(0.01);
  await page.reload();
  await expect(page.locator('.workspace')).toHaveCSS('background-color', 'rgb(125, 0, 0)');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
