import { defineConfig } from 'tsdown';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Scanner } from '@tailwindcss/oxide';
import { compilePackageTranslations } from '../shared/compile-package-translations.ts';

export default defineConfig({
  format: 'esm',
  target: 'es2023',
  entry: [
    './src/{index,i18n}.ts',
    './src/ui/index.tsx',
    './src/ui/base.tsx',
    './src/ui/asyncapi/index.tsx',
    './src/ui/asyncapi-base.tsx',
    './src/ui/client/index.tsx',
    './src/playground/client.tsx',
    './src/scalar/index.tsx',
    './src/server/index.tsx',
    './src/requests/generators/*.ts',
  ],
  unbundle: true,
  dts: {
    sourcemap: false,
  },
  sourcemap: false,
  plugins: [
    {
      name: 'generate-translations',
      async buildStart() {
        await compilePackageTranslations({
          input: ['src/**/*.{ts,tsx}'],
        });
      },
    },
  ],
  async onSuccess() {
    await compileInline();
  },
  platform: 'browser',
  deps: {
    onlyBundle: [
      'fast-content-type-parse',
      '@fastify/deepmerge',

      '@apidevtools/json-schema-ref-parser',
      '@scalar/openapi-upgrader',

      // for Vite RSC compatibility
      'xml-js',
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
        pattern: '{playground,scalar,ui}/**/*.{ts,tsx}',
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
