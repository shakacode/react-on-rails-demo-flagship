import { defineConfig } from '@playwright/test';
import { createHash } from 'node:crypto';

const MAX_PORT = 65_535;
const MAX_BASE_PORT = MAX_PORT - 2;

const readPort = (name: string, max = MAX_PORT): number | undefined => {
  const rawValue = process.env[name];
  if (rawValue === undefined || rawValue.trim() === '') return undefined;

  const value = rawValue.trim();
  if (!/^\d+$/.test(value)) throw new Error(`${name} must be an integer between 1 and ${max}.`);

  const port = Number(value);
  if (!Number.isSafeInteger(port) || port < 1 || port > max) {
    throw new Error(`${name} must be an integer between 1 and ${max}.`);
  }

  return port;
};

const resolveLocalPorts = () => {
  const basePort =
    readPort('REACT_ON_RAILS_BASE_PORT', MAX_BASE_PORT) ?? readPort('CONDUCTOR_PORT', MAX_BASE_PORT);
  const workspaceHash = Number.parseInt(
    createHash('sha256').update(process.cwd()).digest('hex').slice(0, 8),
    16,
  );
  const worktreeBasePort = 20_000 + (workspaceHash % 10_000) * 3;
  const ports = basePort
    ? { rails: basePort, shakapacker: basePort + 1, renderer: basePort + 2 }
    : {
        rails: readPort('PORT') ?? worktreeBasePort,
        shakapacker: readPort('SHAKAPACKER_DEV_SERVER_PORT') ?? worktreeBasePort + 1,
        renderer: readPort('RENDERER_PORT') ?? worktreeBasePort + 2,
      };

  if (new Set(Object.values(ports)).size !== 3) {
    throw new Error('Playwright Rails, Shakapacker, and renderer ports must be distinct.');
  }

  return ports;
};

const providedBaseURL = process.env.PLAYWRIGHT_BASE_URL;
const hasProvidedBaseURL = providedBaseURL !== undefined;
const normalizeProvidedBaseURL = (value: string): string => {
  const normalizedValue = value.trim();
  let url: URL;
  try {
    url = new URL(normalizedValue);
  } catch {
    throw new Error('PLAYWRIGHT_BASE_URL must be an absolute HTTP(S) URL.');
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('PLAYWRIGHT_BASE_URL must be an absolute HTTP(S) URL.');
  }

  const loopbackHosts = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
  if (!loopbackHosts.has(url.hostname) && process.env.PLAYWRIGHT_ALLOW_REMOTE_MUTATIONS !== 'true') {
    throw new Error(
      'Refusing browser mutation tests against a non-loopback PLAYWRIGHT_BASE_URL. ' +
        'Set PLAYWRIGHT_ALLOW_REMOTE_MUTATIONS=true only for a disposable target.',
    );
  }

  return normalizedValue.replace(/\/$/, '');
};

const localPorts = hasProvidedBaseURL ? null : resolveLocalPorts();
const baseURL = hasProvidedBaseURL
  ? normalizeProvidedBaseURL(providedBaseURL!)
  : `http://localhost:${localPorts!.rails}`;
const rendererURL = localPorts ? `http://localhost:${localPorts.renderer}` : undefined;

export default defineConfig({
  testDir: './test/browser',
  outputDir: './tmp/playwright-test-results',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL,
    browserName: 'chromium',
    trace: 'retain-on-failure',
  },
  webServer: hasProvidedBaseURL
    ? undefined
    : {
        command:
          'bin/rails db:prepare db:seed && bin/shakapacker-precompile-hook && bin/shakapacker && bin/dev static --no-open-browser',
        env: {
          ALLOW_DEMO_RENDERER_PASSWORD: 'true',
          DATABASE_URL: 'sqlite3:tmp/playwright.sqlite3',
          PORT: String(localPorts!.rails),
          RAILS_ENV: 'development',
          RENDERER_PORT: String(localPorts!.renderer),
          RENDERER_URL: rendererURL!,
          SHAKAPACKER_DEV_SERVER_PORT: String(localPorts!.shakapacker),
        },
        reuseExistingServer: false,
        gracefulShutdown: { signal: 'SIGTERM', timeout: 10_000 },
        timeout: 180_000,
        url: `${baseURL}/`,
      },
});
