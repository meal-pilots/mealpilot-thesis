module.exports = function (api) {
  api.cache(true)
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          alias: {
            '@': './src',
            '@core': './src/core',
            '@features': './src/features',
            '@entities': './src/entities',
            '@shared': './src/shared',
            '@screens': './src/screens',
          },
        },
      ],
      'react-native-reanimated/plugin',
    ],
  }
}
