import { expect, test, type Page, type Request } from '@playwright/test';

const SEEDED_TASK_TITLE = 'Break something on purpose';

const isTaskPatchRequest = (request: Request) =>
  request.method() === 'PATCH' && /\/api\/tasks\/\d+$/.test(new URL(request.url()).pathname);

function capturePageErrors(page: Page) {
  const errors: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(`console: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));

  return errors;
}

test('streams six cards and hydrates without console or page errors', async ({ page, request }) => {
  const response = await request.get('/');
  expect(response.ok()).toBe(true);
  const streamedHTML = await response.text();
  expect(streamedHTML.match(/data-testid="task-card"/g)).toHaveLength(6);

  const errors = capturePageErrors(page);
  await page.goto('/', { waitUntil: 'networkidle' });

  await expect(page.getByTestId('task-card')).toHaveCount(6);
  await expect(page.getByTestId('tasks-app')).toBeVisible();
  expect(errors, errors.join('\n\n')).toEqual([]);
});

test('sends a CSRF-backed status mutation and persists it after reload', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  const status = page.getByLabel(`Status for ${SEEDED_TASK_TITLE}`, { exact: true });
  await expect(status).toHaveValue('todo');

  const mutationRequest = page.waitForRequest(isTaskPatchRequest);
  const mutationResponse = page.waitForResponse((response) => isTaskPatchRequest(response.request()));

  await status.selectOption('doing');
  const [sentRequest, receivedResponse] = await Promise.all([mutationRequest, mutationResponse]);

  expect(sentRequest.headers()['x-csrf-token']).toBeTruthy();
  expect(receivedResponse.ok()).toBe(true);
  await expect(status).toHaveValue('doing');

  await page.reload({ waitUntil: 'networkidle' });
  const persistedStatus = page.getByLabel(`Status for ${SEEDED_TASK_TITLE}`, { exact: true });
  await expect(persistedStatus).toHaveValue('doing');

  const restoreResponse = page.waitForResponse((response) => isTaskPatchRequest(response.request()));
  await persistedStatus.selectOption('todo');
  expect((await restoreResponse).ok()).toBe(true);
  await expect(persistedStatus).toHaveValue('todo');
});

test('shows validation for an empty title and rejects a missing CSRF token', async ({ page, request }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.getByTestId('new-task-form').getByRole('button', { name: 'Add task', exact: true }).click();

  const alert = page.getByRole('alert');
  await expect(alert).toContainText("Title can't be blank");
  await expect(alert).not.toContainText('CSRF');

  await request.get('/');
  const missingTokenResponse = await request.post('/api/tasks', {
    data: { task: { title: '', notes: '' } },
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
  });
  expect(missingTokenResponse.status()).toBe(422);
  await expect(missingTokenResponse.json()).resolves.toEqual({ errors: ['Invalid or missing CSRF token'] });
});
