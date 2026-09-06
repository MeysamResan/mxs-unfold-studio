import { expect, test, setSeparation } from './fixtures';

test('loads the real model and supports a complete exploration flow', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page).toHaveTitle('Unfold Studio — An inside perspective');
  const isMobile = testInfo.project.name === 'mobile';
  await page.waitForFunction(
    () => performance.getEntriesByName('unfold:model-first-frame').length > 0,
  );
  if (isMobile) await page.getByRole('button', { name: 'Show right panel' }).click();
  await expect(
    page.getByRole('heading', { name: 'Colt Lightning rifle', exact: true }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Wooden stock', exact: false }).click();
  await expect(page.getByRole('button', { name: 'Wooden stock', exact: false })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  if (isMobile) await page.keyboard.press('Escape');
  await setSeparation(page, 75);
  await expect(page.getByRole('slider', { name: 'Separation' })).toHaveValue('75');
  await page.getByRole('button', { name: 'Labels', exact: true }).click();
  await expect(page.locator('.scene-label')).toHaveCount(6);
  await page.keyboard.press('r');
  await page.keyboard.press('e');
  await page.keyboard.press('l');
  await expect(page.getByRole('slider', { name: 'Separation' })).toHaveValue('75');
  await expect(page.locator('.scene-label')).toHaveCount(6);
  await expect(page.locator('.workspace-top, .workspace-footer, kbd')).toHaveCount(0);
  await expect(page.locator('.scene-label').first()).toBeVisible();
  const labelBox = await page.locator('.scene-label').first().boundingBox();
  expect(labelBox?.width).toBeGreaterThan(90);
  await expect(page.locator('.scene-label')).toHaveText([
    'Wooden stock',
    'Central body',
    'Front assembly',
    'Wooden fore-end',
    'Moving details',
    'Lower details',
  ]);
  await page.screenshot({ path: testInfo.outputPath('exploded.png'), fullPage: true });

  await page.getByRole('button', { name: 'Chamber', exact: true }).click();
  const assemblyPopup = page.getByRole('dialog', { name: 'Nice try, mate!', exact: true });
  await expect(assemblyPopup).toContainText('Assemble the gun first');
  await assemblyPopup.getByRole('button', { name: 'Got it', exact: true }).click();
  await expect(assemblyPopup).toHaveCount(0);
  await expect(page.getByRole('slider', { name: 'Separation' })).toHaveValue('75');
  await expect(page.getByRole('button', { name: 'Chamber', exact: true })).toHaveAttribute(
    'aria-busy',
    'false',
  );
  await setSeparation(page, 0);
  await page.getByRole('button', { name: 'Chamber', exact: true }).click();
  await expect(assemblyPopup).toHaveCount(0);
  await expect(page.getByRole('slider', { name: 'Separation' })).toHaveValue('0');
  await expect(page.getByRole('button', { name: 'Chamber', exact: true })).toHaveAttribute(
    'aria-busy',
    'true',
  );
  await expect(page.getByRole('button', { name: 'Chamber', exact: true })).toHaveAttribute(
    'aria-busy',
    'false',
    { timeout: 15_000 },
  );
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(page.getByRole('slider', { name: 'Separation' })).toHaveValue('0');
  await expect(page.locator('.scene-label')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Chamber', exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Viewer settings', exact: true }).click();
  await page.getByRole('radio', { name: 'Balanced Lower resolution, lighter rendering' }).check();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await page.getByRole('button', { name: 'Viewer settings', exact: true }).click();
  await expect(
    page.getByRole('radio', { name: 'Balanced Lower resolution, lighter rendering' }),
  ).toBeChecked();
  await page.keyboard.press('Escape');

  await expect(page.getByRole('dialog')).toHaveCount(0);
  if (isMobile) await page.getByRole('button', { name: 'Show left panel' }).click();
  const search = page.getByRole('textbox', { name: 'Search collection' });
  await expect(search).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'The collection' })).toHaveCount(0);
  const searchCanvas = await page.locator('canvas').elementHandle();
  await search.fill('missing');
  await expect(page.getByText('No objects match')).toBeVisible();
  await search.fill('  RIFLE   lightning  ');
  await expect(page.locator('.collection-card')).toHaveCount(1);
  await search.fill('wooden stock');
  await expect(page.locator('.collection-card')).toHaveCount(1);
  await search.press('Escape');
  await expect(search).toBeFocused();
  if (isMobile) await expect(page.getByRole('dialog', { name: 'Browse collection' })).toBeVisible();
  await expect(search).toHaveValue('');
  await search.fill('lightning');
  expect(await searchCanvas!.evaluate((canvas) => canvas.isConnected)).toBe(true);
  const thumbnail = page.locator('.collection-card img');
  await expect(thumbnail).toBeVisible();
  await expect
    .poll(() => thumbnail.evaluate((image) => (image as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0);
  const imageBox = await thumbnail.boundingBox();
  expect(imageBox!.height).toBeGreaterThan(100);
  await expect(page.locator('canvas')).toHaveCount(1);
  await page.screenshot({ path: testInfo.outputPath('collection.png'), fullPage: true });
  await page.locator('.collection-card').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  expect(errors).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('studio.png'), fullPage: true });
});

test('rests when idle and returns to idle after a single chamber action', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__UNFOLD_DEBUG__?.frames));
  await page.waitForTimeout(700);
  const before = await page.evaluate(() => window.__UNFOLD_DEBUG__!.frames);
  await page.waitForTimeout(450);
  const after = await page.evaluate(() => window.__UNFOLD_DEBUG__!.frames);
  expect(after - before).toBeLessThanOrEqual(2);
  await page.getByRole('button', { name: 'Chamber', exact: true }).click();
  const playing = await page.evaluate(() => window.__UNFOLD_DEBUG__!.frames);
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => window.__UNFOLD_DEBUG__!.frames)).toBeGreaterThan(playing + 2);
  await expect(page.getByRole('button', { name: 'Chamber', exact: true })).toHaveAttribute(
    'aria-busy',
    'false',
    { timeout: 15_000 },
  );
  await page.waitForTimeout(500);
  const paused = await page.evaluate(() => window.__UNFOLD_DEBUG__!.frames);
  await page.waitForTimeout(400);
  expect((await page.evaluate(() => window.__UNFOLD_DEBUG__!.frames)) - paused).toBeLessThanOrEqual(
    2,
  );
});

test('recovers from an interrupted asset download', async ({ page }) => {
  await page.route('**/media/models/*.glb', (route) => route.abort('failed'));
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Reload model' })).toBeVisible();
  await page.unroute('**/media/models/*.glb');
  await page.getByRole('button', { name: 'Reload model' }).click();
  await page.waitForFunction(
    () => performance.getEntriesByName('unfold:model-first-frame').length > 0,
  );
  await expect(page.getByRole('button', { name: 'Reload model' })).toHaveCount(0);
});

test('browses firearm categories and shows the selected object Wikipedia reference', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  await page.waitForFunction(
    () => performance.getEntriesByName('unfold:model-first-frame').length > 0,
  );
  await expect(page.getByRole('link', { name: 'Unfold Studio home' })).toHaveText('Unfold Studio');
  const header = await page.locator('.app-header').boundingBox();
  expect(header!.height).toBeLessThanOrEqual(52);

  const isMobile = testInfo.project.name === 'mobile';
  if (isMobile) {
    await page.getByRole('button', { name: 'Show left panel' }).click();
    await page.getByRole('dialog').evaluate(async (dialog) => {
      await Promise.allSettled(dialog.getAnimations().map((animation) => animation.finished));
    });
  }
  const categories = page.getByRole('navigation', { name: 'Object categories' });
  const searchField = await page
    .getByRole('search', { name: 'Collection', exact: true })
    .boundingBox();
  const categoryButton = await categories
    .getByRole('button', { name: 'Firearms', exact: true })
    .boundingBox();
  expect(Math.abs(searchField!.x - categoryButton!.x)).toBeLessThan(1);
  expect(Math.abs(searchField!.width - categoryButton!.width)).toBeLessThan(1);
  await expect(categories.getByRole('button', { name: 'Firearms', exact: true })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  await expect(categories.getByRole('button', { name: 'Rifles', exact: true })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  await categories.getByRole('button', { name: 'Sidearms', exact: true }).click();
  await expect(categories.getByText('No objects in sidearms yet.')).toBeVisible();
  await categories.getByRole('button', { name: 'Rifles', exact: true }).click();
  await categories.getByRole('button', { name: 'Lightning', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  if (isMobile) {
    await page.getByRole('button', { name: 'Show right panel' }).click();
    await page.getByRole('dialog').evaluate(async (dialog) => {
      await Promise.allSettled(dialog.getAnimations().map((animation) => animation.finished));
    });
  }
  const information = page.getByRole('complementary', { name: 'Object information', exact: true });
  const reference = information.getByRole('link', { name: 'Read on Wikipedia' });
  await expect(reference).toHaveAttribute(
    'href',
    'https://en.wikipedia.org/wiki/Colt_Lightning_rifle',
  );
  await expect(reference).toHaveAttribute('target', '_blank');
  const quickFacts = information.getByRole('region', { name: 'Quick facts', exact: true });
  const summary = information.getByRole('region', { name: 'Summary', exact: true });
  await expect(quickFacts).toContainText('United States');
  await expect(quickFacts).toContainText('1884–1904');
  await expect(quickFacts).toContainText('.44-40');
  await expect(quickFacts).not.toContainText('[1]');
  await expect(summary).toContainText('Wikipedia fixture text');
  await expect(
    information.getByText('Summary by Wikipedia contributors.', { exact: false }),
  ).toHaveCount(0);
  const articleWidth = await information.locator('.wikipedia-reference').boundingBox();
  const linkWidth = await reference.boundingBox();
  expect(Math.abs(linkWidth!.x - articleWidth!.x)).toBeLessThan(1);
  expect(Math.abs(linkWidth!.width - articleWidth!.width)).toBeLessThan(1);
  await expect(information.getByRole('heading', { name: 'Colt Lightning rifle' })).toBeVisible();
  const detailsViewport = information.locator('.scroll-area-viewport');
  expect(
    await detailsViewport.evaluate((element) => element.scrollWidth - element.clientWidth),
  ).toBe(0);
  if (isMobile) {
    await expect(information.locator('.inspector-scroll')).toHaveAttribute(
      'data-overflow',
      'false',
    );
    await expect(
      page.getByRole('dialog', { name: 'Object information', exact: true }),
    ).toBeVisible();
    await expect(
      information.getByRole('heading', { name: 'Colt Lightning rifle', exact: true }),
    ).toBeInViewport();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Show left panel' }).click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  } else {
    const left = await page
      .getByRole('complementary', { name: 'Collection navigation' })
      .boundingBox();
    const center = await page.getByRole('region', { name: 'Object studio' }).boundingBox();
    const right = await information.boundingBox();
    expect(left!.x + left!.width).toBeLessThanOrEqual(center!.x + 1);
    expect(center!.x + center!.width).toBeLessThanOrEqual(right!.x + 1);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('uses larger text and overlay scrollbars without shifting the layout', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  await page.waitForFunction(
    () => performance.getEntriesByName('unfold:model-first-frame').length > 0,
  );
  const isMobile = testInfo.project.name === 'mobile';
  if (isMobile) await page.getByRole('button', { name: 'Show right panel' }).click();
  const scroller = page.locator(isMobile ? '.modal-scroll' : '.inspector-scroll');
  const viewport = scroller.locator(':scope > .scroll-area-viewport');
  await expect(scroller).toHaveAttribute('data-overflow', 'true');
  const dimensions = await viewport.evaluate((element) => ({
    outer: (element as HTMLElement).offsetWidth,
    inner: element.clientWidth,
  }));
  expect(dimensions.outer).toBe(dimensions.inner);
  const referenceFont = await page
    .locator('.reference-summary')
    .evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
  const controlFont = await page
    .getByRole('button', { name: 'Shoot', exact: true })
    .evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
  expect(referenceFont).toBeGreaterThanOrEqual(16);
  expect(controlFont).toBeGreaterThanOrEqual(16);

  const trackedContent = page.locator(isMobile ? '.brand' : '.reference-content h1');
  const before = await trackedContent.boundingBox();
  const thumb = scroller.locator(':scope > .scroll-area-track > .scroll-area-thumb');
  const thumbBox = await thumb.boundingBox();
  expect(thumbBox).not.toBeNull();
  await page.mouse.move(thumbBox!.x + thumbBox!.width / 2, thumbBox!.y + 12);
  await page.mouse.down();
  await page.mouse.move(thumbBox!.x + thumbBox!.width / 2, thumbBox!.y + 102, { steps: 8 });
  await page.mouse.up();
  await expect.poll(() => viewport.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  const after = await trackedContent.boundingBox();
  expect(after!.x).toBeCloseTo(before!.x, 1);
  expect(after!.width).toBeCloseTo(before!.width, 1);
  await viewport.evaluate((element) => {
    element.scrollTop = 0;
  });

  if (isMobile) await page.keyboard.press('Escape');
  const brandBefore = await page.locator('.brand').boundingBox();
  await page.getByRole('button', { name: 'About Unfold Studio' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  const brandWithDialog = await page.locator('.brand').boundingBox();
  expect(brandWithDialog!.x).toBeCloseTo(brandBefore!.x, 1);
  expect(brandWithDialog!.width).toBeCloseTo(brandBefore!.width, 1);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
