// Custom Metro config to alias a missing RN internal file and stop warnings
const { getDefaultConfig } = require('expo/metro-config');
const { resolve } = require('metro-resolver');
const path = require('path');

module.exports = (() => {
  /** @type {import('metro-config').ConfigT} */
  const config = getDefaultConfig(__dirname);

  // Keep alias for direct module specifier matches
  config.resolver = config.resolver || {};
  config.resolver.alias = {
    ...(config.resolver.alias || {}),
    'react-native/Libraries/Utilities/LoadingView': path.resolve(__dirname, 'shims/LoadingViewStub.js'),
    'react-native/Libraries/Utilities/LoadingView.js': path.resolve(__dirname, 'shims/LoadingViewStub.js'),
  };

  // Force-override export-resolved requests as well
  const stubPath = path.resolve(__dirname, 'shims/LoadingViewStub.js');
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (
      moduleName === 'react-native/Libraries/Utilities/LoadingView' ||
      moduleName === 'react-native/Libraries/Utilities/LoadingView.js'
    ) {
      return { type: 'sourceFile', filePath: stubPath };
    }
    return resolve(context, moduleName, platform);
  };

  return config;
})();
