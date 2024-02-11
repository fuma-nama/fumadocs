import fs from 'node:fs/promises';
import path from 'node:path';
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
  'auto-type-table',
  'dialog/search',
  'dialog/search-default',
  'dialog/search-algolia',
];

const injectImports = {
  './src/components/auto-type-table.tsx': './src/components/type-table.tsx',
  './src/page.tsx': './src/page.client.tsx',
  './src/mdx.tsx': './src/mdx.client.tsx',
  './src/layout.tsx': './src/layout.client.tsx',
};

function getOutPath(src: string): string {
  const replacedPath = src
    .split('/')
    .map((v) => (v === 'src' ? 'dist' : v))
    .join('/');

  const info = path.parse(replacedPath);

  return path.join('./', info.dir, `${info.name}.js`).replace(path.sep, '/');
}

async function injectImport(src: string, inject: string): Promise<void> {
  const srcOut = getOutPath(src);
  const injectOut = getOutPath(inject);
  const sourceContent = (await fs.readFile(src)).toString();

  const regex = /^declare const {(?<names>(?:.|\n)*)}: typeof import\(.+\)/m;
  const result = regex.exec(sourceContent);

  if (result) {
    const relativeImportPath = path
      .relative(path.dirname(srcOut), injectOut)
      .replace(path.sep, '/');

    const replaceTo = `import {${result[1]}} from ${JSON.stringify(
      `./${relativeImportPath}`,
    )}`;
    const outContent = (await fs.readFile(srcOut)).toString();

    await fs.writeFile(srcOut, `${replaceTo}\n${outContent}`);
  }
}

export default defineConfig([
  {
    entry: [
      `./src/components/{${exportedComponents.join(',')}}.tsx`,
      './src/{i18n,layout,page,provider,mdx}.{ts,tsx}',
      './src/twoslash/popup.tsx',
      './src/*.client.tsx',
    ],
    external: ['server-only', '../../dist/image-zoom.css'],
    outExtension: () => ({ js: '.js' }),
    async onSuccess() {
      const replaceImports = Object.entries(injectImports).map(
        ([src, inject]) => injectImport(src, inject),
      );

      await Promise.all(replaceImports);
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
