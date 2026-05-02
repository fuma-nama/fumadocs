import { defineConfig } from 'tsdown';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Scanner } from '@tailwindcss/oxide';

export default defineConfig({
  format: 'esm',
  target: 'es2023',
  entry: [
    './src/{index,i18n}.ts',
    './src/ui/index.tsx',
    './src/ui/base.tsx',
    './src/ui/create-client.tsx',
    './src/ui/client/index.tsx',
    './src/playground/client.tsx',
    './src/scalar/index.tsx',
    './src/server/index.ts',
    './src/requests/generators/*.ts',
  ],
  unbundle: true,
  dts: {
    sourcemap: false,
  },
  sourcemap: false,
  async onSuccess() {
    await compileInline();
  },
  platform: 'browser',
  deps: {
    onlyBundle: [
      'fast-content-type-parse',
      '@fastify/deepmerge',

      '@scalar/json-magic',
      'pathe',
      'yaml',
      '@scalar/helpers',
      '@scalar/openapi-upgrader',
    ],
    neverBundle: [/^node:/],
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
  return names.map((name) => `@source inline(${JSON.stringify(name)});`).join('\n');
}
