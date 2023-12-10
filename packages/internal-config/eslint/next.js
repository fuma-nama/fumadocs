const { resolve } = require('node:path')

const project = resolve(process.cwd(), 'tsconfig.json')

module.exports = {
  extends: [
    ...[
      '@vercel/style-guide/eslint/node',
      '@vercel/style-guide/eslint/browser',
      '@vercel/style-guide/eslint/typescript',
      '@vercel/style-guide/eslint/react',
      '@vercel/style-guide/eslint/next',
      'eslint-config-turbo'
    ].map(require.resolve),
    'plugin:tailwindcss/recommended'
  ],
  parserOptions: {
    project
  },
  globals: {
    React: true,
    JSX: true
  },
  settings: {
    tailwindcss: {
      callees: ['clsx', 'cva', 'cn']
    },
    'import/resolver': {
      typescript: {
        project
      }
    }
  },
  ignorePatterns: ['node_modules/', 'dist/'],
  rules: {
    'no-console': 'off',
    'import/no-default-export': 'off'
  }
}
