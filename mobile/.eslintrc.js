module.exports = {
  root: true,
  extends: ['expo'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react-hooks'],
  rules: {
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    // @typescript-eslint v8 removed `ban-types` (split into more granular rules).
    // Disable to silence "rule not found" errors coming from `eslint-config-expo`.
    '@typescript-eslint/ban-types': 'off',
  },
  ignorePatterns: ['node_modules', 'ios', 'android', '.expo', 'dist'],
}
