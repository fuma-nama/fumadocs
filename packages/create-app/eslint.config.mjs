import library from 'eslint-config-custom/next.js';

export default [
  {
    ignores: ['dist/', 'scripts/', 'node_modules/', 'template/'],
  },
  ...library,
  {
    rules: {
      'import/no-relative-packages': 'off',
    },
  },
];
