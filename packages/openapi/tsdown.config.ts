import { defineConfig } from 'tsdown';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Scanner } from '@tailwindcss/oxide';
import { packageTranslationsPlugin } from '../shared/compile-package-translations.ts';

export default defineConfig({
  format: 'esm',
  target: 'es2023',
  entry: [
    './src/{index,index.browser,i18n}.ts',
    './src/operation.tsx',
    './src/ui/{index,base}.tsx',
    './src/ui/{playground/client,scalar/index}.tsx',
    './src/playground/index.ts',
    './src/server/index.tsx',
    './src/requests/index.ts',
    './src/requests/generators/*.ts',
  ],
  unbundle: true,
  ignoreWatch: ['src/.translations/**'],
  dts: {
    sourcemap: false,
  },
  sourcemap: false,
  plugins: [packageTranslationsPlugin()],
  async onSuccess() {
    await compileInline();
  },
  platform: 'browser',
  deps: {
    onlyBundle: ['shared-api', 'fast-content-type-parse', '@fastify/deepmerge', 'xml-js'],
    neverBundle: [/^node:/, 'fs'],
  },
  exports: {
    enabled: true,
    customExports(v) {
      const { './index.browser': browser, ...rest } = v;

      return {
        ...rest,
        // `generateFiles()` touches the filesystem, so client bundles get the stubbed build
        '.': { types: './dist/index.d.ts', browser, import: v['.'] },
        './css/*': './css/*',
      };
    },
  },
});

async function compileInline() {
  await mkdir('css/generated', { recursive: true });
  const scanner = new Scanner({
    sources: [
      {
        // the shared UI is bundled into this package, its classes belong to our CSS
        base: path.resolve('../shared-api/src/components'),
        pattern: '**/*.{ts,tsx}',
        negated: false,
      },
      {
        base: path.resolve('src'),
        pattern: '{playground,ui}/**/*.{ts,tsx}',
        negated: false,
      },
      {
        base: path.resolve('src'),
        pattern: 'server/**/*.tsx',
        negated: false,
      },
    ],
  });
  await writeFile('css/generated/shared.css', namesToFile(scanner.scan()));

  console.log('generated CSS files');
}

function namesToFile(names: string[]) {
  return `@source inline(${JSON.stringify(names.join(' '))});`;
}
