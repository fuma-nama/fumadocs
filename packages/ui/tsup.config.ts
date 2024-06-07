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
  'dialog/search',
  'dialog/search-default',
  'dialog/search-algolia',
  'layout/root-toggle',
];

const injectImports = ['./src/page.tsx', './src/mdx.tsx', './src/layout.tsx'];

function getOutPath(src: string): string {
  const replacedPath = src
    .split('/')
    .map((v) => (v === 'src' ? 'dist' : v))
    .join('/');

  const info = path.parse(replacedPath);

  return path.join('./', info.dir, `${info.name}.js`).replace(path.sep, '/');
}

async function injectImport(src: string): Promise<void> {
  const srcOut = getOutPath(src);
  const sourceContent = (await fs.readFile(src)).toString();
  let outContent = (await fs.readFile(srcOut)).toString();

  const regex =
    /^declare const {(?<names>(?:.|\n)*?)}: typeof import\((?<from>.+)\)/gm;
  let result;

  while ((result = regex.exec(sourceContent)) && result.groups) {
    const { from, names } = result.groups;
    const importName = from.slice(1, from.length - 1);
    const replaceTo = `import {${names}} from ${JSON.stringify(importName)}`;

    outContent = `${replaceTo}\n${outContent}`;
  }

  await fs.writeFile(srcOut, outContent);
}

export default defineConfig([
  {
    entry: [
      `./src/components/{${exportedComponents.join(',')}}.tsx`,
      './src/{i18n,layout,page,provider,mdx,tailwind-plugin}.{ts,tsx}',
      './src/twoslash/popup.tsx',
      './src/*.client.tsx',
    ],
    external: ['server-only', '../../dist/image-zoom.css', 'tailwindcss'],
    async onSuccess() {
      const replaceImports = injectImports.map((src) => injectImport(src));

      await Promise.all(replaceImports);
    },
    format: 'esm',
    dts: true,
    target: 'es2022',
  },
  {
    // todo: Remove support for CommonJS in next major
    entry: ['./src/tailwind-plugin.ts'],
    format: 'cjs',
    external: ['tailwindcss'],
    dts: false,
    target: 'node18',
  },
]);
