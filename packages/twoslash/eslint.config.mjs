import library from 'eslint-config-custom/library.js';

export default [
  ...library,
  {
    ignores: ['dist/', 'node_modules/', '*.test.ts'],
  },
];
