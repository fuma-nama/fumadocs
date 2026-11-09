import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { AstroIntegration } from 'astro';
import type { LoaderContext } from 'astro/loaders';
import type { Plugin } from 'vite';
import type { SatteriResolvedOptions } from '@astrojs/markdown-satteri';
import { type Data, mdxToJs } from 'satteri';
import { loader } from 'fumadocs-core/source';
import { pageSchema } from 'fumadocs-core/source/schema';
import { afterAll, expect, it, vi } from 'vitest';
import fumadocs from '@/index';
import { frontmatterQuery } from '@/shared';
import { toFumadocsSource, type PageEntry } from '@/source';

const config = vi.hoisted(() => ({ loaders: {} as Record<string, object>, root: '/' }));
vi.mock('virtual:fumadocs/config', () => config);
/** the files of the collection, as `glob()` loads them */
const files = vi.hoisted(() => [] as string[]);
vi.mock('astro/loaders', async () => {
  const fs = await import('node:fs/promises');
  const { frontmatter } = await import('fumadocs-core/content/md/frontmatter');
  return {
    glob: ({ base }: { base: string }) => ({
      name: 'glob',
      async load({ parseData, store, generateDigest, config }: LoaderContext) {
        for (const id of files) {
          const filePath = `${config.root}/${base}/${id}`;
          const contents = await fs.readFile(filePath, 'utf8');
          const { data, content } = frontmatter(contents);
          const digest = generateDigest(contents);
          const parsed = await parseData({ id, data: data as Record<string, unknown>, filePath });
          store.set({ id, data: parsed, body: content, filePath: `${base}/${id}`, digest });
        }
      },
    }),
  };
});
/** the modules of entries, by their IDs */
const rendered = vi.hoisted(() => new Map<string, unknown>());
const render = vi.hoisted(() => vi.fn((entry: { id: string }) => rendered.get(entry.id)));
vi.mock('astro:content', () => ({ render }));

// in the package, so the compiled modules resolve its dependencies
const root = mkdtempSync(path.join(import.meta.dirname, '.tmp-'));
afterAll(() => rmSync(root, { recursive: true, force: true }));

/** run the setup of the integration, with the options of Sätteri and the plugins of Vite */
async function setup() {
  const satteri = {
    mdastPlugins: [],
    hastPlugins: [],
    features: {},
  } as unknown as SatteriResolvedOptions;
  let plugins: Plugin[] = [];
  await (
    fumadocs({ includeProcessedMarkdown: true, rehypeCodeOptions: false }).hooks[
      'astro:config:setup'
    ] as (options: object) => Promise<void>
  )({
    config: {
      root: pathToFileURL(`${root}/`),
      markdown: { processor: { name: 'satteri', options: satteri } },
      integrations: [] as AstroIntegration[],
    },
    injectScript() {},
    updateConfig({ vite }: { vite: { plugins: Plugin[] } }) {
      plugins = vite.plugins;
    },
  });
  return { satteri, plugins };
}

/** compile a file of the collection like Astro, the module is imported by `render()` */
async function compile(entry: PageEntry) {
  const { satteri } = await setup();
  const { code, data } = await mdxToJs(entry.body!, {
    mdastPlugins: satteri.mdastPlugins,
    hastPlugins: satteri.hastPlugins,
    fileURL: pathToFileURL(path.join(root, 'content/docs', entry.id)),
    jsxImportSource: 'astro',
    data: { astro: { frontmatter: {} } } as Data,
  });
  // a TypeScript importer resolves the runtime of `src` from its `.js` path
  const file = path.join(root, `${rendered.size}.ts`);
  writeFileSync(file, code);
  const mod = (await import(/* @vite-ignore */ file)) as { default: unknown };
  rendered.set(entry.id, {
    Content: mod.default,
    remarkPluginFrontmatter: data.astro!.frontmatter,
  });
}

it('compiles a file once, its outputs read the params of each page', async () => {
  const entry: PageEntry = {
    id: '[version]/install.mdx',
    body: `## Install {props.version}

<show when={props.version === 'v2'}>

## Migrate

Only in v2.

</show>

Run the installer of {props.version}.`,
    data: { title: 'Install', staticParams: [{ version: 'v1' }, { version: 'v2' }] },
  };
  await compile(entry);
  const source = loader({ source: toFumadocsSource([entry]), baseUrl: '/docs' });

  for (const version of ['v1', 'v2']) {
    const { toc, structuredData } = await source.getPage([version, 'install'])!.data.load();
    expect(toc.map((item) => item.title)).toEqual(
      version === 'v2' ? ['Install v2', 'Migrate'] : ['Install v1'],
    );
    expect(toc[0].url).toBe(`#install-${version}`);
    expect(structuredData.contents.map((item) => item.content)).toEqual(
      version === 'v2' ? ['Only in v2.', 'Run the installer of v2.'] : ['Run the installer of v1.'],
    );
  }
  expect(new Set(render.mock.calls.map(([item]) => item))).toEqual(new Set([entry]));
});

it('runs the frontmatter in code for each params', async () => {
  const content = path.join(root, 'content/docs');
  mkdirSync(path.join(content, '[version]'), { recursive: true });
  writeFileSync(path.join(root, 'versions.ts'), `export const latest = 'v2';`);
  writeFileSync(
    path.join(content, '[version]/meta.json'),
    JSON.stringify({ staticParams: [{ version: 'v1' }, { version: 'v2' }] }),
  );
  writeFileSync(
    path.join(content, '[version]/install.mdx'),
    `---
description: Install it
---

import { latest } from '../../../versions.ts';

export const prefix = 'Install';
export const frontmatter = { title: \`\${prefix} \${props.version === latest ? 'Latest' : props.version}\` };

Run the installer.`,
  );
  files.push('[version]/install.mdx');
  config.root = root;
  config.loaders.docs = { dir: 'content/docs' };

  // the module of the frontmatter in code, as the plugin of Vite loads it
  const { plugins } = await setup();
  const plugin = plugins.find((item) => item.name === '@fumadocs/astro:frontmatter')!;
  const load = (plugin.load as { handler: (id: string) => Promise<string> }).handler;
  for (const id of files) {
    const file = path.join(content, id);
    // next to the file, for its relative imports
    writeFileSync(`${file}.ts`, await load(`${file}${frontmatterQuery}`));
  }

  const entries: PageEntry[] = [];
  const { pageLoader } = await import('@/loaders');
  await pageLoader().load({
    config: { root },
    store: { set: (entry: PageEntry) => entries.push(entry) },
    generateDigest: String,
    // validated by the schema of the collection
    parseData: async ({ data }: { data: unknown }) => ({ ...pageSchema.parse(data), valid: true }),
    entryTypes: new Map([
      [
        '.json',
        { getEntryInfo: ({ contents }: { contents: string }) => ({ data: JSON.parse(contents) }) },
      ],
    ]),
  } as unknown as LoaderContext);

  const meta = {
    id: '[version]/meta.json',
    data: { staticParams: [{ version: 'v1' }, { version: 'v2' }] },
  };
  const source = loader({ source: toFumadocsSource(entries, [meta as never]), baseUrl: '/docs' });
  // each params listed in the meta file
  expect(source.getPage(['v1', 'install'])!.data).toMatchObject({
    title: 'Install v1',
    description: 'Install it',
    valid: true,
  });
  expect(source.getPage(['v2', 'install'])!.data).toMatchObject({
    title: 'Install Latest',
    valid: true,
  });
});
