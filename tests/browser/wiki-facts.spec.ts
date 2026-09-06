import type { Route } from '@playwright/test';
import { expect, test, type Page } from './fixtures';

declare global {
  interface Window {
    __WIKI_SIGNALS__?: AbortSignal[];
    __WIKI_INJECTED__?: boolean;
  }
}

const factsEndpoint = 'https://*.wikipedia.org/w/api.php?**';
const summaryEndpoint = 'https://*.wikipedia.org/api/rest_v1/page/summary/**';

async function showInformation(page: Page, mobile: boolean) {
  if (mobile) await page.getByRole('button', { name: 'Show right panel', exact: true }).click();
}

async function hideInformation(page: Page, mobile: boolean) {
  if (mobile) await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  else await page.getByRole('button', { name: 'Hide right panel', exact: true }).click();
}

async function reopenInformation(page: Page) {
  await page.getByRole('button', { name: 'Show right panel', exact: true }).click();
}

function factsResponse(html: string, title = 'Remote fixture item') {
  return JSON.stringify({ parse: { title, text: html } });
}

test('quick facts retain source values and remove markup, media, citations, and absent fields', async ({
  page,
}, testInfo) => {
  let mediaRequests = 0;
  await page.route('https://example.invalid/**', async (route) => {
    mediaRequests++;
    await route.abort();
  });
  await page.route(factsEndpoint, (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: factsResponse(`
        <script>window.__WIKI_INJECTED__ = true</script>
        <img src="https://example.invalid/outside.jpg" onerror="window.__WIKI_INJECTED__ = true">
        <table class="infobox"><tbody>
          <tr><th>Place&nbsp;of&nbsp;origin</th><td>United&nbsp;States<span hidden>hidden content</span><img src="https://example.invalid/flag.jpg" onerror="window.__WIKI_INJECTED__ = true"></td></tr>
          <tr><th>Cartridge</th><td><a href="javascript:window.__WIKI_INJECTED__=true">.44-40</a><sup class="reference">[9]</sup><br>.22 Short</td></tr>
          <tr><th>Cartridge</th><td>.32-20</td></tr>
          <tr><th>Manufacturer</th><td><script>bad script</script>Remote manufacturer</td></tr>
        </tbody></table>
      `),
    }),
  );
  await page.goto('/');
  await showInformation(page, testInfo.project.name === 'mobile');
  const facts = page.getByRole('region', { name: 'Quick facts', exact: true });
  await expect(facts.getByRole('definition')).toHaveText([
    'Remote fixture item',
    'United States',
    '.44-40 · .22 Short · .32-20',
    'Remote manufacturer',
  ]);
  await expect(facts.getByRole('term')).toHaveText([
    'Name',
    'Origin',
    'Ammunition',
    'Manufacturer',
  ]);
  await expect(facts.locator('img, script, iframe, a, sup')).toHaveCount(0);
  expect(await page.evaluate(() => window.__WIKI_INJECTED__)).toBeUndefined();
  expect(mediaRequests).toBe(0);
});

test('facts failure and retry leave the summary usable and successful requests cached', async ({
  page,
}, testInfo) => {
  const mobile = testInfo.project.name === 'mobile';
  let factsRequests = 0;
  let summaryRequests = 0;
  await page.route(summaryEndpoint, (route) => {
    summaryRequests++;
    return route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        title: 'Wikipedia article',
        extract: 'Independent summary text.',
        lang: 'en',
      }),
    });
  });
  await page.route(factsEndpoint, (route) => {
    factsRequests++;
    return route.fulfill({
      status: factsRequests === 1 ? 503 : 200,
      contentType: 'application/json',
      body:
        factsRequests === 1 ? '{}' : factsResponse('<p>No infobox exists for this article.</p>'),
    });
  });
  await page.goto('/');
  await showInformation(page, mobile);
  await expect(page.getByText('Independent summary text.', { exact: true })).toBeVisible();
  await expect(page.getByText('Quick facts couldn’t be loaded.', { exact: true })).toBeVisible();
  await hideInformation(page, mobile);
  await reopenInformation(page);
  await expect(page.getByText('Quick facts couldn’t be loaded.', { exact: true })).toBeVisible();
  expect(factsRequests).toBe(1);
  await page.getByRole('button', { name: 'Retry quick facts', exact: true }).click();
  await expect(page.locator('.reference-facts dd')).toHaveText(['Remote fixture item']);
  await hideInformation(page, mobile);
  await reopenInformation(page);
  await expect(page.getByText('Independent summary text.', { exact: true })).toBeVisible();
  await expect(page.locator('.reference-facts dd')).toHaveText(['Remote fixture item']);
  expect(factsRequests).toBe(2);
  expect(summaryRequests).toBe(1);
});

test('Wikipedia resources wait for mobile visibility and abort together when hidden', async ({
  page,
}, testInfo) => {
  const mobile = testInfo.project.name === 'mobile';
  await page.addInitScript(() => {
    const originalFetch = window.fetch;
    window.__WIKI_SIGNALS__ = [];
    window.fetch = (input, init) => {
      if (String(input).includes('wikipedia.org/') && init?.signal) {
        window.__WIKI_SIGNALS__!.push(init.signal);
      }
      return originalFetch(input, init);
    };
  });
  const held: Route[] = [];
  let release = false;
  let factsRequests = 0;
  let summaryRequests = 0;
  await page.route(factsEndpoint, (route) => {
    factsRequests++;
    if (!release) {
      held.push(route);
      return;
    }
    return route.fulfill({
      contentType: 'application/json',
      body: factsResponse(
        '<table class="infobox"><tr><th>Origin</th><td>Source country</td></tr></table>',
      ),
    });
  });
  await page.route(summaryEndpoint, (route) => {
    summaryRequests++;
    if (!release) {
      held.push(route);
      return;
    }
    return route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ title: 'Wikipedia article', extract: 'Visible summary.', lang: 'en' }),
    });
  });
  await page.goto('/');
  if (mobile) {
    await expect(page.getByRole('button', { name: 'Show right panel', exact: true })).toBeVisible();
    expect(factsRequests).toBe(0);
    expect(summaryRequests).toBe(0);
  }
  await showInformation(page, mobile);
  await page.waitForFunction(() => window.__WIKI_SIGNALS__?.length === 2);
  await hideInformation(page, mobile);
  await page.waitForFunction(() => window.__WIKI_SIGNALS__?.every((signal) => signal.aborted));
  await Promise.all(held.map((route) => route.abort().catch(() => {})));
  release = true;
  await reopenInformation(page);
  await expect(page.getByText('Visible summary.', { exact: true })).toBeVisible();
  await expect(page.locator('.reference-facts dd')).toHaveText([
    'Remote fixture item',
    'Source country',
  ]);
  expect(summaryRequests).toBe(2);
  expect(factsRequests).toBe(2);
});
