import { expect, test } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { getDefaultConfig } from '@/config';
import { loadProject } from '@/project';

async function project(files: Record<string, string>) {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'fumadocs-cli-'));
  for (const [file, content] of Object.entries(files)) {
    await fs.mkdir(path.dirname(path.join(cwd, file)), { recursive: true });
    await fs.writeFile(path.join(cwd, file), content);
  }
  return loadProject(await getDefaultConfig(cwd), cwd);
}

const pkg = JSON.stringify({ dependencies: { next: '16.0.0' } });

test('project: macro collections in lib/source.ts', async () => {
  const { source, baseDir } = await project({
    'package.json': pkg,
    'app/layout.tsx': '',
    'lib/source.ts': `export const docs = defineDocs({ dir: 'docs', docs: { async: true } });
export const source = loader({ baseUrl: '/', source: docs.toFumadocsSource() });`,
  });
  expect(baseDir).toBe('');
  expect(source).toEqual({
    loader: true,
    dynamic: false,
    collections: 'lib/source.ts',
    async: true,
    baseUrl: '/',
    dir: 'docs',
  });
});

test('project: config API with src dir & baseUrl from lib/shared.ts', async () => {
  const { source, baseDir } = await project({
    'package.json': pkg,
    'src/app/layout.tsx': '',
    'source.config.ts': `export const docs = defineDocs({ dir: 'content/docs' });`,
    'src/lib/shared.ts': `export const docsRoute = '/guide';`,
    'src/lib/source.ts': `import { docsRoute } from './shared';
export const source = loader({ baseUrl: docsRoute, source: docs.toFumadocsSource() });`,
  });
  expect(baseDir).toBe('src');
  expect(source.collections).toBe('source.config.ts');
  expect(source.async).toBe(false);
  expect(source.baseUrl).toBe('/guide');
});

test('project: Astro', async () => {
  const files = {
    'package.json': JSON.stringify({ dependencies: { astro: '7.4.2' } }),
    'astro.config.mjs': `export default defineConfig({ integrations: [fumadocs({ dir: 'content/guide' })] });`,
    'src/pages/index.astro': '',
    'src/lib/shared.ts': `export const docsRoute = '/guide';`,
    'src/lib/source.ts': `import { toFumadocsSource } from '@fumadocs/astro/source';
import { docsRoute } from './shared';

export const source = loader({
  source: toFumadocsSource(await getCollection('docs'), await getCollection('meta')),
  baseUrl: docsRoute,
});`,
  };
  const { framework, baseDir, static: isStatic, source } = await project(files);
  expect(framework).toBe('astro');
  expect(baseDir).toBe('src');
  expect(isStatic).toBe(true);
  expect(source).toEqual({
    loader: true,
    dynamic: false,
    collections: 'astro.config.mjs',
    async: true,
    baseUrl: '/guide',
    dir: 'content/guide',
  });

  const server = await project({
    ...files,
    'astro.config.mjs': `export default defineConfig({ output: 'server', integrations: [fumadocs()] });`,
  });
  expect(server.static).toBe(false);
});

test('project: other content sources', async () => {
  const { source } = await project({
    'package.json': pkg,
    'app/layout.tsx': '',
    'lib/source.ts': `export const source = loader({ baseUrl: '/docs', source: createMDXSource(allDocs, allMetas) });`,
  });
  expect(source.collections).toBeNull();
  expect(source.loader).toBe(true);
});
