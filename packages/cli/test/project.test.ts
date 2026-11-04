import { expect, test } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { RegistryConnector } from 'fuma-cli/registry/connector';
import { getDefaultConfig } from '@/config';
import { loadProject, type Project } from '@/project';
import { type AnyFeature, runFeature } from '@/features';
import { ai } from '@/features/ai';
import { epub } from '@/features/epub';
import { llms } from '@/features/llms';
import { mcp } from '@/features/mcp';

async function project(files: Record<string, string>) {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'fumadocs-cli-'));
  for (const [file, content] of Object.entries(files)) {
    await fs.mkdir(path.dirname(path.join(cwd, file)), { recursive: true });
    await fs.writeFile(path.join(cwd, file), content);
  }
  return loadProject(await getDefaultConfig(cwd), cwd);
}

const pkg = JSON.stringify({ dependencies: { next: '16.0.0' } });

/** a registry with the components of `names`, without files */
function registry(names: string[]): RegistryConnector {
  return {
    fetchManifest: async () => ({
      name: 'test',
      components: names.map((name) => ({ name, files: [] })),
      files: {},
    }),
    fetchFile: async () => new Uint8Array(),
  };
}

function run(
  feature: AnyFeature,
  options: Record<string, unknown>,
  app: Project,
  names: string[] = [],
) {
  return runFeature(feature, options, {
    project: app,
    connector: registry(names),
    io: { log: () => {}, confirmOverwrite: async () => true, installDependencies: false },
  });
}

const read = (app: Project, file: string) => fs.readFile(path.join(app.cwd, file), 'utf-8');

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

  const adapter = await project({
    ...files,
    'astro.config.mjs': `export default defineConfig({ adapter: node(), integrations: [fumadocs()] });`,
  });
  expect(adapter.static).toBe(false);
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

const nextDocs = {
  'package.json': JSON.stringify({ dependencies: { next: '16.0.0' } }),
  'app/layout.tsx': '',
  'source.config.ts': `import { defineDocs } from 'fumadocs-mdx/config';

export const docs = defineDocs({ dir: 'content/docs' });
`,
  'lib/source.ts': `import { docs } from 'collections/server';
export const source = loader({ baseUrl: '/docs', source: docs.toFumadocsSource() });`,
};

test('llms: required by mcp, detected by `docsLlms`', async () => {
  const app = await project(nextDocs);
  expect(await llms.detect!(app)).toBe(false);
  await expect(run(mcp, {}, app)).rejects.toThrow('"mcp" requires "llms"');

  await run(llms, {}, app);
  expect(await read(app, 'lib/source.ts')).toContain('export const docsLlms = llms(source');
  expect(await read(app, 'source.config.ts')).toContain('includeProcessedMarkdown: true');
  expect(await llms.detect!(app)).toBe(true);
  await run(mcp, {}, app);
  expect(await read(app, 'app/api/mcp/route.ts')).toContain('docsLlms');
});

test('ai: the chat route reads processed Markdown', async () => {
  const app = await project(nextDocs);
  await run(ai, { provider: 'openrouter' }, app, ['ai/openrouter']);
  expect(await read(app, 'source.config.ts')).toContain('includeProcessedMarkdown: true');
});

test('llms: Markdown of pages at `<page>.md` on Astro', async () => {
  const app = await project({
    'package.json': JSON.stringify({ dependencies: { astro: '7.4.2' } }),
    'astro.config.mjs': `import fumadocs from '@fumadocs/astro';

export default defineConfig({ integrations: [fumadocs()] });
`,
    'src/lib/source.ts': `import { toFumadocsSource } from '@fumadocs/astro/source';
export const source = loader({ baseUrl: '/docs', source: toFumadocsSource([], []) });`,
  });
  await run(llms, {}, app);

  expect(await read(app, 'src/pages/docs/[...slug].md.ts')).toContain(
    "params: { slug: decodeURI(page.slugs.join('/')) || 'index' },",
  );
  const shared = await read(app, 'src/lib/shared.ts');
  expect(shared).toContain("export const docsRoute = '/docs';");
  expect(shared).toContain("segments.push('index.md');");
  expect(shared).not.toContain('decodeMarkdownUrl');
  await expect(fs.access(path.join(app.cwd, 'src/pages/llms.mdx'))).rejects.toThrow();
});

test('mcp & epub: Astro routes render on request with static output and an adapter', async () => {
  const app = await project({
    'package.json': JSON.stringify({ dependencies: { astro: '7.4.2' } }),
    'astro.config.mjs': `import fumadocs from '@fumadocs/astro';

export default defineConfig({ output: 'static', adapter: node(), integrations: [fumadocs()] });
`,
    'src/lib/source.ts': `import { toFumadocsSource } from '@fumadocs/astro/source';
export const source = loader({ baseUrl: '/docs', source: toFumadocsSource([], []) });`,
  });
  expect(app.static).toBe(false);
  await run(llms, {}, app);
  await run(mcp, {}, app);
  await run(epub, {}, app);

  expect(await read(app, 'src/pages/api/mcp.ts')).toContain('export const prerender = false;');
  expect(await read(app, 'src/pages/export/epub.ts')).toContain('export const prerender = false;');
});
