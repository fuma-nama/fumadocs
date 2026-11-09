import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { expect, test } from 'vitest';
import { loader } from 'fumadocs-core/source';
import { applyMdxPreset, defineDocs, type DocCollection } from '@/config';
import { buildConfig } from '@/config/build';
import { createCore } from '@/core';
import { createMdxLoader } from '@/loaders/mdx';
import { createMetaLoader } from '@/loaders/meta';
import { toFumadocsSource } from '@/runtime/server';

test('the frontmatter and meta files in code', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'page-code-'));
  await fs.mkdir(path.join(dir, '[framework]'));
  await fs.writeFile(
    path.join(dir, 'names.ts'),
    'export const names = { next: "Next.js", waku: "Waku" };',
  );
  const metaFile = path.join(dir, '[framework]/meta.ts');
  await fs.writeFile(
    metaFile,
    `import { names } from '../names';
export const staticParams = [{ framework: 'next' }, { framework: 'waku' }];
export default ({ framework }: { framework: keyof typeof names }) => ({ title: names[framework] });`,
  );
  const files = {
    deploy: path.join(dir, '[framework]/deploy.mdx'),
    home: path.join(dir, 'index.mdx'),
    invalid: path.join(dir, 'invalid.mdx'),
    named: path.join(dir, '[framework]/named.mdx'),
    math: path.join(dir, 'math.mdx'),
  };
  await fs.writeFile(
    files.deploy,
    `---
title: Deploy
---

import { names } from '../names';
import { Card } from './card';
export const frontmatter = {

  description: \`Deploy on \${names[props.framework]}\`,
};
`,
  );
  // the block of the export can have other statements
  await fs.writeFile(
    files.home,
    `export const name = 'Home';\nexport const frontmatter = { title: name };\n`,
  );
  await fs.writeFile(files.invalid, `export const frontmatter = { title: 1 };\n`);
  // JSX in the block, `props` on a static page, and syntax of other plugins in the content
  await fs.writeFile(
    files.math,
    'export function Note() { return <b>note</b>; }\nexport const frontmatter = { title: props.title ?? "Math" };\n\n$x_{\\alpha}$\n',
  );
  // the required title of a dynamic page only in code, an import after it, another declarator stays
  await fs.writeFile(
    files.named,
    `export const frontmatter = { title: names[props.framework] }, label = 'x';\nimport { names } from '../names';\n\n{label}\n`,
  );

  const core = createCore({
    environment: 'vite',
    configPath: path.join(dir, 'source.config.ts'),
    outDir: dir,
  });
  await core.init({ config: buildConfig({ docs: defineDocs({ dir }) }, dir) });
  const mdx = createMdxLoader({ getCore: async () => core });
  const dependencies: string[] = [];
  const load = async (filePath: string, query: Record<string, string>) =>
    (await mdx.load({
      filePath,
      query: { collection: 'docs', ...query },
      getSource: () => fs.readFile(filePath, 'utf-8'),
      development: false,
      compiler: { addDependency: (file) => dependencies.push(file) },
    }))!.code;

  // the frontmatter runs at build time with the imports it reads, for each params
  const head = await load(files.deploy, { only: 'frontmatter' });
  expect(head).toContain(
    '"{\\"framework\\":\\"waku\\"}":{"title":"Deploy","description":"Deploy on Waku"}',
  );
  expect(dependencies).toContain(path.join(await fs.realpath(dir), 'names.ts'));
  // the result is cached until a file it reads changes
  const names = path.join(dir, 'names.ts');
  await fs.writeFile(names, 'export const names = { next: "Next.js", waku: "Waku 2" };');
  await fs.utimes(names, new Date(), new Date(Date.now() + 10_000));
  expect(await load(files.deploy, { only: 'frontmatter' })).toContain(
    '"description":"Deploy on Waku 2"',
  );
  await fs.writeFile(names, 'export const names = { next: "Next.js", waku: "Waku" };');
  await fs.utimes(names, new Date(), new Date(Date.now() + 20_000));
  // the page compiles once with the frontmatter of each params, its content doesn't run the code
  const page = await load(files.deploy, {});
  expect(page).toContain('"description": "Deploy on Waku"');
  expect(page).not.toContain('names[props.framework]');
  // fields of the schema can be in code only, and the schema validates them
  expect(await load(files.home, { only: 'frontmatter' })).toContain('"title":"Home"');
  // the other statements of its block stay in the page
  expect(await load(files.home, {})).toMatch(/name = ['"]Home/);
  await expect(load(files.invalid, { only: 'frontmatter' })).rejects.toThrow(/title/);
  expect(await load(files.math, { only: 'frontmatter' })).toContain('"title":"Math"');
  expect(await load(files.named, { only: 'frontmatter' })).toContain(
    '"{\\"framework\\":\\"next\\"}":{"title":"Next.js"}',
  );

  // the meta loader runs a meta file in code for each folder of its params, validated by the schema
  const meta = createMetaLoader({ getCore: async () => core });
  const loadMeta = async (filePath: string) => {
    const out = await meta.load({
      filePath,
      query: { collection: 'docs' },
      getSource: () => fs.readFile(filePath, 'utf-8'),
      development: false,
      compiler: { addDependency: (file) => dependencies.push(file) },
    });
    return JSON.parse(out!.code.slice('export default '.length));
  };
  dependencies.length = 0;
  const metaData = await loadMeta(metaFile);
  expect(metaData._dataAt).toEqual({
    '{"framework":"next"}': { staticParams: expect.any(Array), title: 'Next.js' },
    '{"framework":"waku"}': { staticParams: expect.any(Array), title: 'Waku' },
  });
  expect(dependencies).toContain(path.join(await fs.realpath(dir), 'names.ts'));
  const badFile = path.join(dir, 'bad/meta.ts');
  await fs.mkdir(path.dirname(badFile));
  await fs.writeFile(badFile, 'export default { pages: 1 };');
  await expect(loadMeta(badFile)).rejects.toThrow(/pages/);

  const source = loader({
    baseUrl: '/',
    source: toFumadocsSource(
      [
        {
          info: { path: '[framework]/deploy.mdx', fullPath: files.deploy },
          title: 'Deploy',
          load: async () => ({}),
          _frontmatterAt: {
            '{"framework":"next"}': { title: 'Deploy', description: 'Deploy on Next.js' },
            '{"framework":"waku"}': { title: 'Deploy', description: 'Deploy on Waku' },
          },
        } as never,
      ],
      [{ info: { path: '[framework]/meta.ts', fullPath: metaFile }, ...metaData }],
    ),
  });
  expect(source.getPageTree().children.map((node) => node.name)).toEqual(['Next.js', 'Waku']);
  expect(source.getPage(['waku', 'deploy'])?.data).toMatchObject({
    description: 'Deploy on Waku',
  });

  await fs.rm(dir, { recursive: true });
});

test('static analysis of a collection with its own options', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'page-code-'));
  const file = path.join(dir, 'index.mdx');
  await fs.writeFile(file, '---\ntitle: Home\n---\n\n## Hello {props.name}\n\n[Link](/a)\n');
  const docs = (compiler?: 'satteri') =>
    defineDocs({
      dir,
      docs: {
        analysis: 'static',
        postprocess: { extractLinkReferences: true, includeProcessedMarkdown: true },
        ...(compiler ? { compiler } : { mdxOptions: applyMdxPreset() }),
      },
    });

  for (const compiler of [undefined, 'satteri'] as const) {
    const core = createCore({ environment: 'vite', outDir: dir });
    await core.init({ config: buildConfig({ docs: docs(compiler) }, dir) });
    const { code } = (await createMdxLoader({ getCore: async () => core }).load({
      filePath: file,
      query: { collection: 'docs' },
      getSource: () => fs.readFile(file, 'utf-8'),
      development: false,
      compiler: { addDependency() {} },
    }))!;
    for (const name of ['toc', 'structuredData', 'extractedReferences', '_markdown'])
      expect(code).not.toMatch(new RegExp(`(const|let) ${name} = \\(?props\\)? =>`));
    expect(code).not.toContain('_headingIds');
  }
});

test('custom props of getPage render the content and outputs of a page', async () => {
  const { server, toFumadocsSource: toSource } = await import('@/runtime/server');
  const { asMarkdown } = await import('fumadocs-core/server');
  type Props = Record<string, string>;
  const create = server<{ docs: DocCollection }, { DocData: { docs: object } }>();
  const docs = await create.doc('docs', '', {
    '[framework]/index.mdx': {
      frontmatter: { title: 'Home', staticParams: [{ framework: 'next' }] },
      default: () => null,
      // like the outputs of runtime analysis
      toc: (props: Props) => [{ title: `${props.framework} ${props.name}`, url: '#a', depth: 2 }],
      structuredData: (props: Props) => [
        { id: 'a', content: ` ${props.framework} ${props.name} ` },
        { content: ' ' },
      ],
      _markdown: (props: Props) => (asMarkdown() ? `${props.framework} ${props.name}` : null),
    },
  });
  const source = loader({ baseUrl: '/', source: toSource(docs, []) });

  // the outputs are values for the path params
  expect(source.getPage(['next'])?.data.toc[0].title).toBe('next undefined');
  const page = source.getPage(['next'], { props: { name: 'Fuma' } })!;
  expect(page.url).toBe('/next');
  expect(page.data.toc[0].title).toBe('next Fuma');
  // records are trimmed, empty ones are left out
  expect(page.data.structuredData).toEqual({
    headings: [{ id: 'a', content: 'next Fuma' }],
    contents: [],
  });
  await expect(page.data.getText('processed')).resolves.toBe('next Fuma');
});
