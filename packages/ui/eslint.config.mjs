import next from 'eslint-config-custom/next.js';

export default [
  ...next,
  {
    rules: {
      // for the import hacks
      '@typescript-eslint/consistent-type-imports': 'off',
      // some arrays like link items won't be changed
      'react/no-array-index-key': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      'import/no-relative-packages': 'off',
    },
  },
];
