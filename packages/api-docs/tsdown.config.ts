import { defineConfig } from 'tsdown';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Scanner } from '@tailwindcss/oxide';
import { packageTranslationsPlugin } from '../shared/compile-package-translations.ts';

export default defineConfig({
  format: 'esm',
  target: 'es2023',
  entry: [
    './src/{codegen,i18n}.ts',
    './src/{components,auto-anchor,schema}/**/*',
    './src/utils/{id-to-title,url}.ts',
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
    onlyBundle: [
      '@fastify/deepmerge',

      '@apidevtools/json-schema-ref-parser',

      // for Vite RSC compatibility
      'ajv',
      'fast-deep-equal',
      'json-schema-traverse',
      'fast-uri',
    ],
    neverBundle: [/^node:/, 'fs', /ajv(.+)\.d\.ts/],
  },
  exports: {
    enabled: true,
    customExports(v) {
      v['./css/*'] = './css/*';
      return v;
    },
  },
});

async function compileInline() {
  await mkdir('css/generated', { recursive: true });
  const scanner = new Scanner({
    sources: [
      {
        base: path.resolve('src'),
        pattern: 'components/**/*.{ts,tsx}',
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
