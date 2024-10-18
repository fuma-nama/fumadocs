import library from 'eslint-config-custom/library.js';

export default [
  {
    ignores: ['dist', 'node_modules', 'test/repo', 'test/repo-2'],
  },
  ...library,
  {
    rules: {
      'import/no-relative-packages': 'off',
    },
  },
];
