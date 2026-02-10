import next from 'eslint-config-custom/next.js';

export default [
  {
    ignores: ['dist/', 'node_modules/', '*.test.ts', '*.output.js'],
  },
  ...next,
  {
    rules: {
      'no-console': 'off',
      'no-fallthrough': 'off',
      // handled by bundler
      'import/no-cycle': 'off',
    },
  },
];
