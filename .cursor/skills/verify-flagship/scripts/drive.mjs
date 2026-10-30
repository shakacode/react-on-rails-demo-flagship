#!/usr/bin/env node
// Drive one flagship demo feature through a real Chromium page and write proof artifacts.
// Run through `verify-flagship drive FEATURE`, which supplies:
//   VERIFY_BASE_URL, VERIFY_EVIDENCE_DIR, VERIFY_RUN_ID, VERIFY_GIT_HEAD, VERIFY_LAUNCH_MODE
// Features: board | create | update | delete | slow
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const feature = process.argv[2];
const baseURL = process.env.VERIFY_BASE_URL;
const evidenceRoot = process.env.VERIFY_EVIDENCE_DIR;
const runId = process.env.VERIFY_RUN_ID ?? 'unknown';

if (!baseURL || !evidenceRoot) {
  console.error('drive.mjs: run through `verify-flagship drive FEATURE` so the run URL and evidence dir are set.');
  process.exit(2);
}

const outDir = path.join(evidenceRoot, feature ?? 'unknown');
const checks = [];
const network = [];
const consoleErrors = [];

function check(name, ok, detail = undefined) {
  checks.push({ name, ok: Boolean(ok), ...(detail === undefined ? {} : { detail }) });
  console.log(`${ok ? '[ok]  ' : '[FAIL]'} ${name}${detail === undefined ? '' : ` — ${JSON.stringify(detail)}`}`);
}

async function snap(page, name, locator = page.locator('body')) {
  await page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: true });
  await writeFile(path.join(outDir, `${name}.aria.txt`), `${await locator.ariaSnapshot()}\n`);
}

// Direct API calls (read-only second views and the missing-task probe) bypass the page's
// response events, so log them here to keep network.json complete.
async function apiCall(page, method, urlPath, headers = {}) {
  const response = await page.request.fetch(urlPath, { method, headers: { Accept: 'application/json', ...headers } });
  const body = response.status() === 204 ? null : await response.json().catch(() => '<non-JSON body>');
  network.push({ via: 'api-request-context', method, path: urlPath, status: response.status(),
    csrfHeaderSent: Boolean(headers['X-CSRF-Token']), requestBody: null, responseBody: body });
  return { status: response.status(), body };
}

async function apiTasks(page) {
  return (await apiCall(page, 'GET', '/api/tasks')).body.tasks;
}

function recordApiTraffic(page) {
  page.on('response', async (response) => {
    const request = response.request();
    if (!new URL(request.url()).pathname.startsWith('/api/')) return;
    let body = null;
    try {
      body = response.status() === 204 ? null : await response.json();
    } catch {
      body = '<non-JSON body>';
    }
    network.push({
      via: 'page',
      method: request.method(),
      path: new URL(request.url()).pathname,
      status: response.status(),
      csrfHeaderSent: Boolean(request.headers()['x-csrf-token']),
      requestBody: request.postData(),
      responseBody: body,
    });
  });
}

const card = (page, title) => page.getByTestId('task-card').filter({ has: page.getByRole('heading', { name: title, exact: true }) });

async function openBoard(page) {
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.getByTestId('tasks-app').waitFor();
}

async function addTask(page, title, notes) {
  const form = page.getByTestId('new-task-form');
  await form.getByLabel('Task title', { exact: true }).fill(title);
  await form.getByLabel('Task notes', { exact: true }).fill(notes);
  const created = page.waitForResponse((r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/tasks');
  await form.getByRole('button', { name: 'Add task', exact: true }).click();
  return created;
}

const drives = {
  async board(page) {
    const raw = await page.request.get('/');
    const html = await raw.text();
    check('raw HTML (before any JavaScript) contains 6 task cards', (html.match(/data-testid="task-card"/g) ?? []).length === 6);
    check('raw HTML contains the seeded title inside rendered <h3> markup', html.includes('Render the first screen on the server</h3>'));
    await writeFile(path.join(outDir, 'streamed.html'), html);

    await openBoard(page);
    const cards = await page.getByTestId('task-card').count();
    check('hydrated board shows 6 task cards', cards === 6, { count: cards });
    for (const [status, heading] of [['todo', 'To do'], ['doing', 'Doing'], ['done', 'Done']]) {
      const column = page.getByTestId(`column-${status}`);
      const count = await column.getByTestId('task-card').count();
      check(`column-${status} ("${heading}") holds 2 seeded cards`, count === 2, { count });
    }
    const stamp = (await page.getByTestId('ssr-timestamp').textContent())?.trim();
    check('ssr-timestamp shows an ISO server render time', /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(stamp ?? ''), { stamp });
    await snap(page, 'board', page.getByTestId('tasks-app'));
  },

  async create(page) {
    const title = `Verify create ${runId}`;
    await openBoard(page);
    await snap(page, 'before', page.getByTestId('tasks-app'));

    const form = page.getByTestId('new-task-form');
    await form.getByRole('button', { name: 'Add task', exact: true }).click();
    const alert = page.getByTestId('error-banner');
    await alert.waitFor();
    check('empty title shows server validation in the error banner', (await alert.textContent())?.includes("Title can't be blank"));
    await snap(page, 'empty-title-error', page.getByTestId('tasks-app'));
    await alert.getByRole('button', { name: 'Dismiss' }).click();
    // The browser logs the deliberate 422 as a console error; expect exactly that one and drop it.
    const expected = consoleErrors.splice(0);
    check('the only console error so far is the expected 422', expected.length === 1 && expected[0].includes('422'), expected);

    const response = await addTask(page, title, 'Created by verify-flagship');
    check('POST /api/tasks returned 201 with a CSRF header', response.status() === 201 && Boolean(response.request().headers()['x-csrf-token']), { status: response.status() });
    await card(page, title).waitFor();
    check('new card appears in the To do column', (await page.getByTestId('column-todo').locator(card(page, title)).count()) === 1);
    await snap(page, 'after-create', page.getByTestId('tasks-app'));

    await page.reload({ waitUntil: 'networkidle' });
    check('new card survives a reload (server-rendered from the DB)', (await card(page, title).count()) === 1);
    const stored = (await apiTasks(page)).find((t) => t.title === title);
    check('GET /api/tasks returns the stored task with status todo', stored?.status === 'todo', stored);
    await snap(page, 'after-reload', page.getByTestId('tasks-app'));
  },

  async update(page) {
    const title = 'Break something on purpose';
    await openBoard(page);
    const status = page.getByLabel(`Status for ${title}`, { exact: true });
    check('seeded task starts in To do', (await status.inputValue()) === 'todo');
    await snap(page, 'before', page.getByTestId('tasks-app'));

    const patched = page.waitForResponse((r) => r.request().method() === 'PATCH' && /\/api\/tasks\/\d+$/.test(new URL(r.url()).pathname));
    await status.selectOption('doing');
    const response = await patched;
    check('PATCH /api/tasks/:id returned 200 with a CSRF header', response.ok() && Boolean(response.request().headers()['x-csrf-token']), { status: response.status() });
    await page.getByTestId('column-doing').locator(card(page, title)).waitFor();
    check('card moved from column-todo to column-doing', (await page.getByTestId('column-todo').locator(card(page, title)).count()) === 0);
    await snap(page, 'after-move', page.getByTestId('tasks-app'));

    await page.reload({ waitUntil: 'networkidle' });
    check('status persists after reload', (await page.getByLabel(`Status for ${title}`, { exact: true }).inputValue()) === 'doing');
    const stored = (await apiTasks(page)).find((t) => t.title === title);
    check('GET /api/tasks returns status doing', stored?.status === 'doing', stored);
    await snap(page, 'after-reload', page.getByTestId('tasks-app'));
  },

  async delete(page) {
    const title = `Verify delete ${runId}`;
    await openBoard(page);
    const created = await addTask(page, title, 'Disposable task for the delete journey');
    check('setup: disposable task created through the form', created.status() === 201);
    await card(page, title).waitFor();
    await snap(page, 'before', page.getByTestId('tasks-app'));

    const deleted = page.waitForResponse((r) => r.request().method() === 'DELETE');
    await card(page, title).getByRole('button', { name: 'Delete', exact: true }).click();
    const response = await deleted;
    check('DELETE /api/tasks/:id returned 204 with a CSRF header', response.status() === 204 && Boolean(response.request().headers()['x-csrf-token']), { status: response.status() });
    await card(page, title).waitFor({ state: 'detached' });
    check('card is gone from the board', (await card(page, title).count()) === 0);
    await snap(page, 'after-delete', page.getByTestId('tasks-app'));

    await page.reload({ waitUntil: 'networkidle' });
    check('card stays gone after reload', (await card(page, title).count()) === 0);
    check('GET /api/tasks no longer returns the task', !(await apiTasks(page)).some((t) => t.title === title));

    const token = await page.locator('meta[name="csrf-token"]').getAttribute('content');
    const missing = await apiCall(page, 'DELETE', '/api/tasks/999999', { 'X-CSRF-Token': token });
    check('DELETE of a missing task answers JSON 404 "Task not found"', missing.status === 404 && JSON.stringify(missing.body) === '{"errors":["Task not found"]}', { status: missing.status });
  },

  async slow(page) {
    const delayMs = 1500;
    const started = Date.now();
    const stream = await fetch(`${baseURL}/slow?delay_ms=${delayMs}`);
    check('/slow answers 200 in development', stream.status === 200, { status: stream.status });
    let html = '';
    let headerAt;
    let panelAt;
    for await (const chunk of stream.body) {
      html += Buffer.from(chunk).toString('utf8');
      headerAt ??= html.includes('Slow Section (Late Suspense Boundary)') ? Date.now() - started : undefined;
      panelAt ??= html.includes('data-slow-stats-panel') ? Date.now() - started : undefined;
    }
    await writeFile(path.join(outDir, 'streamed.html'), html);
    check('header streams before the delayed panel', headerAt !== undefined && panelAt !== undefined && panelAt - headerAt >= delayMs * 0.8, { headerAtMs: headerAt, panelAtMs: panelAt });

    // Sample the panel's background on the first frame it is visible, as test/browser/slow_demo.spec.ts
    // does, so a panel that paints unstyled and is styled later still fails.
    await page.addInitScript(() => {
      const sample = () => {
        const el = document.querySelector('[data-slow-stats-panel]');
        if (el && el.getClientRects().length > 0) window.slowPanelAtReveal = getComputedStyle(el).backgroundColor;
        else requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
    let blockedScripts = 0;
    await page.route('**/*', (route) => {
      if (route.request().resourceType() === 'script') {
        blockedScripts += 1;
        return route.abort();
      }
      return route.continue();
    });
    await page.goto(`/slow?delay_ms=${delayMs}`, { waitUntil: 'domcontentloaded' });
    const panel = page.locator('[data-slow-stats-panel]');
    await panel.waitFor();
    check('panel renders with client scripts blocked', blockedScripts > 0 && (await panel.textContent())?.includes(`Stats loaded after ${delayMs}ms`), { blockedScripts });
    await page.waitForFunction(() => window.slowPanelAtReveal !== undefined);
    const firstFrame = await page.evaluate(() => window.slowPanelAtReveal);
    const background = await panel.evaluate((el) => getComputedStyle(el).backgroundColor);
    const mode = process.env.VERIFY_LAUNCH_MODE ?? 'hmr';
    const styled = 'rgb(26, 26, 46)';
    check('late boundary is styled on its first visible frame without client JS (no FOUC)', firstFrame === styled && background === styled, {
      firstFrame,
      background,
      mode,
      ...(mode === 'hmr' ? { reason: 'HMR injects CSS with JavaScript; relaunch with --mode static' } : {}),
    });
    await snap(page, 'no-js');
    await page.unroute('**/*');
    // The aborted script requests above log net::ERR_FAILED; drop only those, so a failed load in
    // the JavaScript-enabled passes below still counts.
    const kept = consoleErrors.filter((e) => !e.includes('net::ERR_FAILED'));
    consoleErrors.splice(0, consoleErrors.length, ...kept);

    await page.goto('/slow?delay_ms=not-a-number', { waitUntil: 'networkidle' });
    check('malformed delay_ms falls back to 1500ms', (await panel.textContent())?.includes('Stats loaded after 1500ms'));
    await snap(page, 'with-js');

    for (const [requested, applied] of [['-5', 0], ['20000', 10000]]) {
      const response = await page.goto(`/slow?delay_ms=${requested}`, { waitUntil: 'networkidle', timeout: 30_000 });
      const text = (await panel.count()) ? (await panel.textContent()).trim() : null;
      check(`delay_ms=${requested} is clamped to ${applied}ms and the panel renders`, response.status() === 200 && text?.includes(`Stats loaded after ${applied}ms`), {
        status: response.status(),
        panel: text ?? 'missing: the Suspense fallback never resolved',
      });
    }
  },
};

if (!Object.hasOwn(drives, feature ?? '')) {
  console.error(`drive.mjs: unknown feature "${feature}". Choose one of: ${Object.keys(drives).join(', ')}`);
  process.exit(2);
}

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({ baseURL, viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
page.on('console', (m) => m.type() === 'error' && consoleErrors.push(`console: ${m.text()}`));
page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));
recordApiTraffic(page);

let crash = null;
try {
  await drives[feature](page);
} catch (error) {
  crash = String(error?.stack ?? error);
  check(`drive completed without an exception`, false, crash.split('\n')[0]);
  await page.screenshot({ path: path.join(outDir, 'failure.png'), fullPage: true }).catch(() => {});
} finally {
  check('no console or page errors', consoleErrors.length === 0, consoleErrors.length ? consoleErrors : undefined);
  await browser.close();
}

const passed = checks.every((c) => c.ok);
await writeFile(path.join(outDir, 'network.json'), `${JSON.stringify(network, null, 2)}\n`);
await writeFile(
  path.join(outDir, 'result.json'),
  `${JSON.stringify({ feature, runId, baseURL, gitHead: process.env.VERIFY_GIT_HEAD, finishedAt: new Date().toISOString(), passed, checks, consoleErrors, crash }, null, 2)}\n`,
);
console.log(`${passed ? 'PASS' : 'FAIL'} ${feature}: evidence in ${outDir}`);
process.exit(passed ? 0 : 1);
