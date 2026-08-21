import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterAll, expect, test } from 'vitest';
import { getConfig } from '../src';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fumadocs-vite-'));

afterAll(() => fs.rm(root, { recursive: true, force: true }));

async function writePkg(dir: string, pkgJson: object) {
  const target = path.join(root, dir);
  await fs.mkdir(target, { recursive: true });
  await fs.writeFile(path.join(target, 'package.json'), JSON.stringify(pkgJson));
}

await writePkg('.', {
  name: 'app',
  dependencies: { 'fumadocs-fixture': '*' },
});
await writePkg('node_modules/fumadocs-fixture', {
  name: 'fumadocs-fixture',
  type: 'module',
  exports: { '.': './index.js' },
  dependencies: { 'mdx-lib': '*', 'cjs-lib': '*', 'mixed-lib': '*' },
});
// ESM intermediate carrying a declaration-only dependency, like `@mdx-js/mdx` > `@types/mdx`
await writePkg('node_modules/mdx-lib', {
  name: 'mdx-lib',
  type: 'module',
  exports: { '.': './index.js' },
  dependencies: { '@types/mdx': '*' },
});
await writePkg('node_modules/@types/mdx', {
  name: '@types/mdx',
  main: '',
  types: 'index.d.ts',
  exports: {
    '.': './index.d.ts',
    './types': './types.d.ts',
    './types.js': './types.d.ts',
    './package.json': './package.json',
  },
});
// CJS with an export map, like `use-sync-external-store`
await writePkg('node_modules/cjs-lib', {
  name: 'cjs-lib',
  exports: {
    '.': './index.js',
    './shim': {
      'react-native': './shim/index.native.js',
      default: './shim/index.js',
    },
    './shim/index.js': './shim/index.js',
    './package.json': './package.json',
  },
});
// CJS whose `./types` subpath resolves to a declaration file
await writePkg('node_modules/mixed-lib', {
  name: 'mixed-lib',
  exports: {
    '.': { require: './index.cjs', types: './index.d.ts' },
    './types': './types.d.ts',
  },
});

test('pre-bundles CJS runtime entries only, never declaration files (#3492)', async () => {
  const config = await getConfig({ root, isBuild: false });

  expect(config.optimizeDeps).toEqual({
    include: [
      'fumadocs-fixture > cjs-lib',
      'fumadocs-fixture > cjs-lib/shim',
      'fumadocs-fixture > mixed-lib',
    ],
    exclude: ['fumadocs-fixture'],
  });
  expect(config.ssr.noExternal).toEqual(['fumadocs-fixture']);
});
