const serverWebpackConfig = require('./serverWebpackConfig');

const configureRsc = () => {
  const rscConfig = serverWebpackConfig({ rscBundle: true });
  const serverBundleEntry = rscConfig.entry['server-bundle'];

  rscConfig.entry = {
    'rsc-bundle': serverBundleEntry,
  };

  rscConfig.module.rules.push({
    test: /\.(ts|tsx|js|jsx|mjs)$/,
    enforce: 'post',
    loader: 'react-on-rails-rsc/WebpackLoader',
  });

  rscConfig.resolve = {
    ...rscConfig.resolve,
    conditionNames: ['react-server', '...'],
    alias: {
      ...rscConfig.resolve?.alias,
      'react-dom/server': false,
    },
  };

  rscConfig.output.filename = 'rsc-bundle.js';

  return rscConfig;
};

module.exports = configureRsc;
