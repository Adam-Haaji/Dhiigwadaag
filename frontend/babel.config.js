module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      // Must be the last plugin for Reanimated to work
      "react-native-reanimated/plugin",
    ],
  };
};
