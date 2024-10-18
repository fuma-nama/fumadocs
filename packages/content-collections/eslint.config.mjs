import library from 'eslint-config-custom/library.js';

export default [
  {
    ignores: ['dist', 'node_modules', '*.test.ts'],
  },
  ...library,
];
