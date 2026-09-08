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

test('project: other content sources', async () => {
  const { source } = await project({
    'package.json': pkg,
    'app/layout.tsx': '',
    'lib/source.ts': `export const source = loader({ baseUrl: '/docs', source: createMDXSource(allDocs, allMetas) });`,
  });
  expect(source.collections).toBeNull();
  expect(source.loader).toBe(true);
});
