import { expect, test } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { RegistryConnector } from 'fuma-cli/registry/connector';
import { getDefaultConfig } from '@/config';
import { loadProject } from '@/project';
import { runFeature } from '@/features';
import { docs } from '@/features/docs';
import { mcp } from '@/features/mcp';
import { search } from '@/features/search';

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
    'astro.config.mjs': `export default defineConfig({ integrations: [fumadocs({ collections: { docs: { dir: 'content/guide' } } })] });`,
    'src/pages/index.astro': '',
    'src/lib/shared.ts': `export const docsRoute = '/guide';`,
    'src/lib/source.ts': `import { toFumadocsSource } from '@fumadocs/astro/source';
import { docsRoute } from './shared';

export const source = loader({
  source: toFumadocsSource(await getCollection('docs'), await getCollection('meta')),
  baseUrl: docsRoute,
});`,
  };
  const { framework, baseDir, static: isStatic, source, fumadocsConfig } = await project(files);
  expect(framework).toBe('astro');
  expect(baseDir).toBe('src');
  expect(isStatic).toBe(true);
  expect(fumadocsConfig).toBeUndefined();
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

  const managed = await project({ ...files, 'src/fumadocs.config.ts': '' });
  expect(managed.fumadocsConfig).toBe('src/fumadocs.config.ts');
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

test('search: register the dialog in the layout module of Astro', async () => {
  const managed = await project({
    'package.json': JSON.stringify({ dependencies: { astro: '7.4.2' } }),
    'astro.config.mjs': `import fumadocs from '@fumadocs/astro';

export default defineConfig({
  integrations: [fumadocs({ components: './src/components/mdx.tsx' })],
});
`,
    'src/pages/index.astro': '',
    'src/fumadocs.config.ts': '',
    'src/lib/source.ts': `import { toFumadocsSource } from '@fumadocs/astro/source';
export const source = loader({ baseUrl: '/docs', source: toFumadocsSource([], []) });`,
  });
  const read = (file: string) => fs.readFile(path.join(managed.cwd, file), 'utf-8');
  expect(await search.detect!(managed)).toBe(false);

  await runFeature(
    search,
    { provider: 'algolia' },
    {
      project: managed,
      connector: {} as RegistryConnector,
      io: { log: () => {}, confirmOverwrite: async () => true, installDependencies: false },
    },
  );
  expect(await read('astro.config.mjs')).toContain(
    "fumadocs({ components: './src/components/mdx.tsx', layout: './src/lib/layout.shared.tsx' })",
  );
  expect(await read('src/lib/layout.shared.tsx')).toContain(
    "}\n\nexport { default as SearchDialog } from '@/components/search';\n",
  );
  expect(await read('src/pages/static.json.ts')).toContain('toDocuments(source)');
  expect(await search.detect!(managed)).toBe(true);
});

test('docs: keep the home page of Astro with i18n', async () => {
  const app = await project({
    'package.json': JSON.stringify({ dependencies: { astro: '7.4.2' } }),
    'astro.config.mjs': `import { defineConfig } from 'astro/config';

export default defineConfig({});
`,
    'src/pages/index.astro': 'home',
  });
  await runFeature(
    docs,
    { i18n: true },
    {
      project: app,
      connector: {} as RegistryConnector,
      io: { log: () => {}, confirmOverwrite: async () => true, installDependencies: false },
    },
  );
  expect(await fs.readFile(path.join(app.cwd, 'src/pages/index.astro'), 'utf-8')).toBe('home');
  await expect(fs.access(path.join(app.cwd, 'src/pages/[...lang]/index.astro'))).rejects.toThrow();
  expect(await fs.readFile(path.join(app.cwd, 'src/lib/source.ts'), 'utf-8')).toContain('i18n,');
});

test('mcp: add the plugin to the Fumadocs config of Astro', async () => {
  const app = await project({
    'package.json': JSON.stringify({ dependencies: { astro: '7.4.2' } }),
    // processed Markdown is off for docs, `mcpPlugin()` reads the raw files
    'astro.config.mjs': `export default defineConfig({
  output: 'server',
  integrations: [fumadocs({ collections: { docs: { includeProcessedMarkdown: false } } })],
});
`,
    'src/pages/index.astro': '',
    'src/fumadocs.config.ts': `import { defineConfig } from '@fumadocs/astro/config';
import { source } from './lib/source';

export default defineConfig({ source });
`,
    'src/lib/source.ts': `import { toFumadocsSource } from '@fumadocs/astro/source';
export const source = loader({ baseUrl: '/docs', source: toFumadocsSource([], []) });`,
  });
  const read = (file: string) => fs.readFile(path.join(app.cwd, file), 'utf-8');

  await runFeature(
    mcp,
    {},
    {
      project: app,
      connector: {} as RegistryConnector,
      io: { log: () => {}, confirmOverwrite: async () => true, installDependencies: false },
    },
  );
  expect(await read('src/fumadocs.config.ts')).toContain('plugins: [mcpPlugin()]');
  expect(await read('src/fumadocs.config.ts')).toContain(
    "import { mcpPlugin } from '@fumadocs/astro/plugins/mcp';",
  );
  await expect(fs.access(path.join(app.cwd, 'src/pages/api/mcp.ts'))).rejects.toThrow();
  expect(await read('src/lib/source.ts')).not.toContain('docsLlms');
});
