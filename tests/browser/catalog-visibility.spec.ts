import { expect, test } from './fixtures';

test('loads catalog thumbnails only after their visible area enters the collection viewport', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  const thumbnailRequests = new Map<number, number>();
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    const url = new URL(request.url());
    const index = url.searchParams.get('catalog-visibility');
    if (url.pathname.endsWith('.webp') && index !== null) {
      const key = Number(index);
      thumbnailRequests.set(key, (thumbnailRequests.get(key) ?? 0) + 1);
    }
  });

  // Exercise the actual collection with a large fixture without changing production content.
  await page.route('**/src/content/catalog.ts*', async (route) => {
    const response = await route.fetch();
    const source = await response.text();
    const registration = /export const catalog\s*=\s*\[lightning\];/;
    expect(source).toMatch(registration);
    await route.fulfill({
      response,
      body: source.replace(
        registration,
        [
          'export const catalog = Array.from({ length: 40 }, (_, index) => ({',
          '  ...lightning,',
          "  id: index === 0 ? lightning.id : 'catalog-specimen-' + index,",
          "  title: 'Catalog specimen ' + String(index).padStart(2, '0'),",
          '  thumbnail: {',
          '    ...lightning.thumbnail,',
          "    path: lightning.thumbnail.path + '?catalog-visibility=' + index,",
          '  },',
          '}));',
        ].join('\n'),
      ),
    });
  });

  await page.goto('/');
  await page.waitForFunction(
    () => performance.getEntriesByName('unfold:model-first-frame').length > 0,
  );
  const canvas = await page.locator('canvas').elementHandle();
  const modelRequests = await page.evaluate(
    () =>
      performance.getEntriesByType('resource').filter((entry) => entry.name.endsWith('.glb'))
        .length,
  );
  expect(thumbnailRequests.has(20)).toBe(false);
  expect(thumbnailRequests.has(39)).toBe(false);

  if (testInfo.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Show left panel' }).click();
  }
  const search = page.getByRole('textbox', { name: 'Search collection' });
  await search.fill('Catalog specimen');
  await expect(search).toBeFocused();
  const viewport =
    testInfo.project.name === 'mobile'
      ? page
          .getByRole('dialog', { name: 'Browse collection' })
          .locator('.modal-scroll > .scroll-area-viewport')
      : page.locator('.catalog-scroll > .scroll-area-viewport');
  const thumbnails = page.locator('.collection-card .object-thumbnail');
  const firstImage = thumbnails.first().locator('img');
  const lastImage = thumbnails.last().locator('img');
  await expect(thumbnails).toHaveCount(40);
  await expect(firstImage).toHaveCount(1);
  await expect
    .poll(() => firstImage.evaluate((image) => (image as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0);

  // Native lazy loading can prefetch many screens ahead; source assignment must be stricter.
  const offscreenSources = await viewport.evaluate((element) => {
    const viewportBounds = element.getBoundingClientRect();
    return [...element.querySelectorAll('img[src]')]
      .filter((image) => {
        const bounds = image.getBoundingClientRect();
        return (
          bounds.bottom <= Math.max(viewportBounds.top, 0) ||
          bounds.top >= Math.min(viewportBounds.bottom, innerHeight) ||
          bounds.right <= Math.max(viewportBounds.left, 0) ||
          bounds.left >= Math.min(viewportBounds.right, innerWidth)
        );
      })
      .map((image) => image.getAttribute('src'));
  });
  expect(offscreenSources).toEqual([]);
  expect(thumbnailRequests.size).toBeGreaterThan(0);
  expect(thumbnailRequests.size).toBeLessThan(40);
  await expect(thumbnails.nth(20).locator('img')).toHaveCount(0);
  await expect(lastImage).toHaveCount(0);
  expect(thumbnailRequests.has(20)).toBe(false);
  expect(thumbnailRequests.has(39)).toBe(false);

  await viewport.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(lastImage).toBeInViewport();
  await expect
    .poll(() => lastImage.evaluate((image) => (image as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0);
  expect(thumbnailRequests.get(39)).toBe(1);
  await expect(thumbnails.nth(20).locator('img')).toHaveCount(0);
  expect(thumbnailRequests.has(20)).toBe(false);
  const requestsAtBottom = [...thumbnailRequests];

  await viewport.evaluate((element) => {
    element.scrollTop = 0;
  });
  await expect(firstImage).toBeInViewport();
  // Let intersection callbacks and image loading complete before checking for repeat requests.
  await page.waitForTimeout(200);
  expect([...thumbnailRequests]).toEqual(requestsAtBottom);
  expect(thumbnailRequests.get(39)).toBe(1);

  expect(await canvas!.evaluate((element) => element.isConnected)).toBe(true);
  await expect(page.locator('canvas')).toHaveCount(1);
  expect(
    await page.evaluate(
      () =>
        performance.getEntriesByType('resource').filter((entry) => entry.name.endsWith('.glb'))
          .length,
    ),
  ).toBe(modelRequests);
  expect(await viewport.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
    true,
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
