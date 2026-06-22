// The source code including full typescript support is available at: 
// https://github.com/shakacode/react_on_rails_demo_ssr_hmr/blob/master/config/webpack/clientWebpackConfig.js

const commonWebpackConfig = require('./commonWebpackConfig');
const { RSCRspackPlugin } = require('react-on-rails-rsc/RspackPlugin');

const configureClient = () => {
  const clientConfig = commonWebpackConfig();

  // server-bundle is special and should ONLY be built by the serverConfig
  // In case this entry is not deleted, a very strange "window" not found
  // error shows referring to window["webpackJsonp"]. That is because the
  // client config is going to try to load chunks.
  delete clientConfig.entry['server-bundle'];

  clientConfig.plugins.push(new RSCRspackPlugin({
    isServer: false,
    clientReferences: [
      {
        directory: './app/javascript',
        recursive: true,
        include: /\.[cm]?[jt]sx?$/,
      },
    ],
  }));

  return clientConfig;
};

module.exports = configureClient;
