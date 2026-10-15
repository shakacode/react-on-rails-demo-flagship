import { expect, test } from '@playwright/test';

test('keeps the blocking demo disabled on hosted production apps', async ({ request }) => {
  test.skip(!process.env.PLAYWRIGHT_BASE_URL, 'Production guard is covered by controller tests locally.');
  const response = await request.get('/slow?delay_ms=10000');
  expect(response.status()).toBe(404);
});

test('reveals a styled delayed boundary before client JavaScript loads', async ({ page }) => {
  test.skip(Boolean(process.env.PLAYWRIGHT_BASE_URL), 'The slow demo is local development only.');
  await page.addInitScript(() => {
    const sampleFirstVisibleFrame = () => {
      const panel = document.querySelector('[data-slow-stats-panel]');
      if (panel && panel.getClientRects().length > 0) {
        (window as Window & { slowPanelAtReveal?: string }).slowPanelAtReveal =
          getComputedStyle(panel).backgroundColor;
      } else {
        requestAnimationFrame(sampleFirstVisibleFrame);
      }
    };
    requestAnimationFrame(sampleFirstVisibleFrame);
  });
  let blockedScripts = 0;
  await page.route('**/*', (route) => {
    if (route.request().resourceType() === 'script') {
      blockedScripts += 1;
      return route.abort();
    }
    return route.continue();
  });
  await page.goto('/slow?delay_ms=500', { waitUntil: 'domcontentloaded' });
  const panel = page.locator('[data-slow-stats-panel]');
  await expect(panel).toBeVisible();
  await expect(panel).toContainText('Stats loaded after 500ms');
  await expect(panel).toHaveCSS('background-color', 'rgb(26, 26, 46)');
  await expect.poll(() => page.evaluate(() =>
    (window as Window & { slowPanelAtReveal?: string }).slowPanelAtReveal,
  )).toBeDefined();
  expect(await page.evaluate(() =>
    (window as Window & { slowPanelAtReveal?: string }).slowPanelAtReveal,
  )).toBe('rgb(26, 26, 46)');
  expect(blockedScripts).toBeGreaterThan(0);
});
