const path = require('path');

const { parseWorkersCount, reactOnRailsProNodeRenderer } = require('react-on-rails-pro-node-renderer');

const { env } = process;
const runtimeEnvironments = [env.NODE_ENV, env.RAILS_ENV].filter(Boolean);
const developmentLike =
  runtimeEnvironments.length > 0 && runtimeEnvironments.every((value) => ['development', 'test'].includes(value));
const demoPasswordAllowed = developmentLike && env.ALLOW_DEMO_RENDERER_PASSWORD === 'true';

function requiredEnv(name) {
  const value = env[name];
  if (!value) {
    throw new Error(`${name} is required unless ALLOW_DEMO_RENDERER_PASSWORD=true in development/test`);
  }
  return value;
}

function rendererWorkersCount() {
  const value = env.RENDERER_WORKERS_COUNT;
  const parsed = parseWorkersCount(value);

  if (parsed === null && value == null) {
    return 2;
  }

  const errorMessage = `RENDERER_WORKERS_COUNT must be a non-negative integer, got ${JSON.stringify(value)}`;
  if (parsed === null || !Number.isSafeInteger(parsed)) {
    throw new Error(errorMessage);
  }

  return parsed;
}

const rendererPassword =
  demoPasswordAllowed ? env.RENDERER_PASSWORD || 'development_password' : requiredEnv('RENDERER_PASSWORD');

reactOnRailsProNodeRenderer({
  serverBundleCachePath: path.resolve(__dirname, '../.node-renderer-bundles'),
  host: env.RENDERER_HOST || 'localhost',
  port: env.RENDERER_PORT || 3800,
  logLevel: env.RENDERER_LOG_LEVEL || 'info',
  password: rendererPassword,
  workersCount: rendererWorkersCount(),
  allWorkersRestartInterval: env.RENDERER_ALL_WORKERS_RESTART_INTERVAL || 60,
  delayBetweenIndividualWorkerRestarts: 1,
  supportModules: true,
  stubTimers: false,
  replayServerAsyncOperationLogs: developmentLike,
});
