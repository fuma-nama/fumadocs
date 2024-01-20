import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: [
      './src/components/{type-table,roll-button,image-zoom,files,tabs,accordion,steps,search,inline-toc,callout,api}.{ts,tsx}',
      './src/components/dialog/{search,search-default,search-algolia}.tsx',
      './src/mdx/*.{ts,tsx}',
      './src/{i18n,layout,page,provider}.{ts,tsx}',
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
