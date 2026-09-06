import { test as base, expect, type Page } from '@playwright/test';

export { expect };
export type { Page };

export const test = base.extend<{ wikipedia: void }>({
  wikipedia: [
    async ({ page }, use) => {
      await page.route('https://*.wikipedia.org/api/rest_v1/page/summary/**', (route) =>
        route.fulfill({
          contentType: 'application/json',
          headers: { 'access-control-allow-origin': '*' },
          body: JSON.stringify({
            title: 'Colt Lightning rifle',
            extract:
              'Wikipedia fixture text for the selected article. This deliberately long test summary exercises scrolling and text wrapping in the information panel. '.repeat(
                8,
              ),
            lang: 'en',
            dir: 'ltr',
            type: 'standard',
          }),
        }),
      );
      await page.route('https://*.wikipedia.org/w/api.php?**', (route) =>
        route.fulfill({
          contentType: 'application/json',
          headers: { 'access-control-allow-origin': '*' },
          body: JSON.stringify({
            parse: {
              title: 'Colt Lightning rifle',
              text: '<table class="infobox"><tbody><tr><th>Type</th><td>Rifle</td></tr><tr><th>Place of origin</th><td>United States</td></tr><tr><th>Produced</th><td>1884–1904<sup class="reference">[1]</sup></td></tr><tr><th>Manufacturer</th><td>Colt</td></tr><tr><th>Cartridge</th><td>.44-40<br>.22 Short</td></tr></tbody></table>',
            },
          }),
        }),
      );
      await use();
    },
    { auto: true },
  ],
});

export async function setSeparation(page: Page, value: number) {
  await page.getByRole('slider', { name: 'Separation' }).evaluate((input, next) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
      input,
      String(next),
    );
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
}

export async function startChamber(page: Page) {
  await page.getByRole('button', { name: 'Viewer settings', exact: true }).click();
  await page.getByRole('button', { name: '0.5×', exact: true }).click();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.locator('.page-scroll > .scroll-area-viewport').evaluate((element) => {
    element.scrollTop = 0;
  });
  await page.getByRole('button', { name: 'Chamber', exact: true }).click();
  await page.locator('.viewer-viewport').scrollIntoViewIfNeeded();
  await expect(page.getByRole('button', { name: 'Chamber', exact: true })).toHaveAttribute(
    'aria-busy',
    'true',
  );
}
