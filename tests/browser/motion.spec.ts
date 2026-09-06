import { expect, test } from './fixtures';

test('animates native dialog dismissal and restores focus for every close method', async ({
  page,
}) => {
  await page.goto('/');
  const about = page.getByRole('button', { name: 'About Unfold Studio' });
  const dialog = page.getByRole('dialog');

  for (const method of ['button', 'escape', 'backdrop']) {
    await about.click();
    await expect(dialog).toBeVisible();
    expect(await dialog.evaluate((element) => getComputedStyle(element).animationName)).toBe(
      'modal-arrive',
    );

    if (method === 'button') {
      await page.getByRole('button', { name: 'Close dialog' }).click();
    } else if (method === 'escape') {
      await page.keyboard.press('Escape');
    } else {
      await page.mouse.click(3, 3);
    }

    await expect(dialog).toHaveCount(0);
    await expect(about).toBeFocused();
  }
});

test('collapsed categories release their content and reduced motion disables interface animation', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  if (testInfo.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Show left panel' }).click();
  }
  const categories = page.getByRole('navigation', { name: 'Object categories' });
  const firearms = categories.getByRole('button', { name: 'Firearms', exact: true });
  const controlledId = await firearms.getAttribute('aria-controls');
  const content = page.locator(`[id="${controlledId}"]`);
  await firearms.click();
  await expect(firearms).toHaveAttribute('aria-expanded', 'false');
  await expect(content).toHaveAttribute('inert', '');
  await expect(content.locator('.category-children')).toHaveCount(0);
  await firearms.click();
  await expect(content).not.toHaveAttribute('inert', '');
  await expect(categories.getByRole('button', { name: 'Rifles', exact: true })).toBeVisible();

  if (testInfo.project.name === 'mobile') {
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'About Unfold Studio' }).click();
  const modal = page.getByRole('dialog');
  expect(
    await modal.evaluate((element) => ({
      animation: getComputedStyle(element).animationName,
      transition: getComputedStyle(element).transitionDuration,
    })),
  ).toEqual({ animation: 'none', transition: '0s' });
  await page.keyboard.press('Escape');
  await expect(modal).toHaveCount(0);
});
