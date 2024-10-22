import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: ['node_modules/', 'dist/'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      'no-console': 'off',

      'import/no-extraneous-dependencies': 'off',
      'import/no-default-export': 'off',

      // handled by typescript eslint
      'import/default': 'off',
      'import/export': 'off',
      'import/namespace': 'off',
      'import/no-unresolved': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
];
