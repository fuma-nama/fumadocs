const TAILWIND_CONFIG = {
  extends: ['plugin:tailwindcss/recommended'],
  rules: {
    // by prettier-plugin-tailwindcss
    'tailwindcss/classnames-order': 'off',
    'tailwindcss/enforces-negative-arbitrary-values': 'error',
    'tailwindcss/enforces-shorthand': 'error',
    'tailwindcss/migration-from-tailwind-2': 'error',
    'tailwindcss/no-custom-classname': 'error'
  }
}

/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  reportUnusedDisableDirectives: true,
  ignorePatterns: ['next-env.d.ts'],
  overrides: [
    // Rules for all files
    {
      files: '**/*.{js,jsx,cjs,mjs,ts,tsx,cts,mts}',
      extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'prettier'
      ],
      rules: {
        'prefer-object-has-own': 'error',
        'logical-assignment-operators': [
          'error',
          'always',
          { enforceForIfStatements: true }
        ],
        'no-negated-condition': 'off',
        'prefer-regex-literals': ['error', { disallowRedundantWrapping: true }],
        'object-shorthand': ['error', 'always'],

        '@typescript-eslint/ban-ts-comment': 'off',
        '@typescript-eslint/consistent-type-imports': 'error'
      }
    },
    // React.js rules
    {
      files: '{packages,examples,apps}/**',
      extends: [
        'plugin:react/recommended',
        'plugin:react/jsx-runtime',
        'plugin:@next/next/recommended'
      ],
      rules: {
        // it breaks the use of component libraries
        'react/prop-types': 'off',
        'react/no-unknown-property': 'off',
        'react/jsx-curly-brace-presence': 'error',
        'react/jsx-boolean-value': 'error'
      },
      settings: {
        react: { version: 'detect' }
      }
    },
    {
      ...TAILWIND_CONFIG,
      files: 'packages/next-docs-ui/**',
      settings: {
        tailwindcss: {
          config: 'packages/next-docs-ui/tailwind.config.js',
          callees: ['cn', 'clsx']
        }
      }
    },
    {
      ...TAILWIND_CONFIG,
      files: 'apps/docs/**',
      settings: {
        tailwindcss: {
          config: 'apps/docs/tailwind.config.js',
          callees: ['cn', 'clsx', 'cva'],
          whitelist: ['nd-not-prose']
        },
        next: { rootDir: 'apps/docs' }
      }
    },
    {
      files: 'examples/simple/**',
      settings: {
        next: { rootDir: 'examples/simple' }
      }
    },
    {
      ...TAILWIND_CONFIG,
      files: 'examples/advanced/**',
      settings: {
        tailwindcss: {
          config: 'examples/advanced/tailwind.config.js'
        },
        next: { rootDir: 'examples/advanced' }
      }
    },
    {
      files: [
        'postcss.config.js',
        'tailwind.config.js',
        'next.config.js',
        '.eslintrc.cjs'
      ],
      env: {
        node: true
      },
      rules: {
        '@typescript-eslint/no-var-requires': 'off'
      }
    },
    {
      files: 'packages/**',
      rules: {
        '@next/next/no-html-link-for-pages': 'off'
      }
    },
    {
      files: ['**/*.d.ts'],
      rules: {
        'no-var': 'off'
      }
    }
  ]
}
