import { defineConfig } from 'tsup';

const exportedComponents = [
  'type-table',
  'roll-button',
  'image-zoom',
  'files',
  'tabs',
  'accordion',
  'steps',
  'search',
  'inline-toc',
  'callout',
  'api',
  'card',
  'heading',
  'codeblock',
];

export default defineConfig([
  {
    entry: [
      `./src/components/{${exportedComponents.join(',')}}.tsx`,
      './src/components/dialog/{search,search-default,search-algolia}.tsx',
      './src/{i18n,layout,page,provider,mdx}.{ts,tsx}',
    ],
    outExtension: () => ({ js: '.js' }),
    format: 'esm',
    dts: true,
    target: 'es2022',
  },
  {
    entry: ['./src/tailwind-plugin.ts'],
    format: 'cjs',
    external: ['tailwindcss'],
    dts: true,
    target: 'node18',
  },
]);
