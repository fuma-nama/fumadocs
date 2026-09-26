import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterAll, afterEach, expect, test, vi } from 'vitest';
import { getConfig } from '../src';

// realpath: the crawl resolves symlinks, and macOS keeps its temp dir behind one
const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'fumadocs-vite-')));

afterAll(() => fs.rm(root, { recursive: true, force: true }));
afterEach(() => vi.restoreAllMocks());

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
  dependencies: { 'mdx-lib': '*', 'cjs-lib': '*', 'mixed-lib': '*', 'shared-lib': '*' },
});
// ESM intermediate carrying a declaration-only dependency, like `@mdx-js/mdx` > `@types/mdx`.
// It also reaches `shared-lib` and `cjs-lib` again, and forms a cycle with `cycle-lib`
await writePkg('node_modules/mdx-lib', {
  name: 'mdx-lib',
  type: 'module',
  exports: { '.': './index.js' },
  dependencies: { '@types/mdx': '*', 'shared-lib': '*', 'cjs-lib': '*', 'cycle-lib': '*' },
});
await writePkg('node_modules/cycle-lib', {
  name: 'cycle-lib',
  type: 'module',
  exports: { '.': './index.js' },
  dependencies: { 'mdx-lib': '*', 'shared-lib': '*' },
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
// CJS reachable through several chains of different lengths
await writePkg('node_modules/shared-lib', {
  name: 'shared-lib',
  main: 'index.js',
});

test('pre-bundles CJS runtime entries only, never declaration files (#3492)', async () => {
  const config = await getConfig({ root, isBuild: false });

  expect(config.optimizeDeps).toEqual({
    include: [
      'fumadocs-fixture > cjs-lib',
      'fumadocs-fixture > cjs-lib/shim',
      'fumadocs-fixture > mixed-lib',
      'fumadocs-fixture > shared-lib',
    ],
    exclude: ['fumadocs-fixture'],
  });
  expect(config.ssr.noExternal).toEqual(['fumadocs-fixture']);
});

test('reads each package.json once, whatever the number of chains reaching it (#3599)', async () => {
  const readFile = vi.spyOn(fs, 'readFile');
  await getConfig({ root, isBuild: false });

  const reads = readFile.mock.calls.map(([file]) => path.relative(root, String(file)));
  expect(reads.sort()).toEqual([
    'node_modules/@types/mdx/package.json',
    'node_modules/cjs-lib/package.json',
    'node_modules/cycle-lib/package.json',
    'node_modules/fumadocs-fixture/package.json',
    'node_modules/mdx-lib/package.json',
    'node_modules/mixed-lib/package.json',
    'node_modules/shared-lib/package.json',
    'package.json',
  ]);
});

test('memoizes the crawl until the installed packages change', async () => {
  const memoRoot = path.join(root, 'memo');
  await writePkg('memo', { name: 'memo-app', dependencies: { 'fumadocs-fixture': '*' } });
  const installState = path.join(memoRoot, 'node_modules/.pnpm/lock.yaml');
  await fs.mkdir(path.dirname(installState), { recursive: true });
  await fs.writeFile(installState, 'lockfileVersion: 1');

  const readFile = vi.spyOn(fs, 'readFile');
  const first = await getConfig({ root: memoRoot, isBuild: false });
  expect(first.optimizeDeps.include).toContain('fumadocs-fixture > shared-lib');
  const readsOnFirstCall = readFile.mock.calls.length;
  expect(readsOnFirstCall).toBeGreaterThan(0);

  // same install: served from memory
  const second = await getConfig({ root: memoRoot, isBuild: false });
  expect(readFile.mock.calls.length).toBe(readsOnFirstCall);
  expect(second).toEqual(first);

  // an install ran: the crawl runs again
  await fs.writeFile(installState, 'lockfileVersion: 2\n');
  await getConfig({ root: memoRoot, isBuild: false });
  expect(readFile.mock.calls.length).toBe(readsOnFirstCall * 2);
});
