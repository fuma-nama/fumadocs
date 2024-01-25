import fs from 'node:fs/promises';
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
      './src/{i18n,layout,page,provider,mdx,mdx.client}.{ts,tsx}',
    ],
    outExtension: () => ({ js: '.js' }),
    async onSuccess() {
      const content = (await fs.readFile('./dist/mdx.js')).toString();

      await fs.writeFile(
        './dist/mdx.js',
        `import { Pre } from "./mdx.client.js";\n${content}`,
      );
    },
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
