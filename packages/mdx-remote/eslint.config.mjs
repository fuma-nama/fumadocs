import library from 'eslint-config-custom/library.js';

export default [
  {
    ignores: ['dist/', 'node_modules/', 'test/**/*'],
  },
  ...library,
  {
    rules: {
      'import/no-named-as-default': 'off',
      'import/no-named-as-default-member': 'off',
    },
  },
];
