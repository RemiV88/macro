module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // react-native-reanimated requires its worklets babel plugin and it MUST
    // be the last entry. Reanimated 4 re-exports the plugin from
    // react-native-worklets, so this path keeps working.
    plugins: ['react-native-reanimated/plugin'],
  };
};
