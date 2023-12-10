import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: [
      './src/components/{type-table,roll-button,image-zoom,files,tabs,accordion,steps,search,inline-toc,callout}.{ts,tsx}',
      './src/components/dialog/{search,search-default,search-algolia}.tsx',
      './src/{i18n,layout,mdx,mdx-server,nav,page,provider}.{ts,tsx}',
    ],
    outExtension: () => ({ js: '.js' }),
    format: 'esm',
    dts: true,
    target: 'es2017',
  },
  {
    entry: ['./src/tailwind-plugin.ts'],
    format: 'cjs',
    external: ['tailwindcss'],
    dts: true,
    target: 'es6',
  },
]);
