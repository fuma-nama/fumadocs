import { describe, expect, test } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { TOCItemType } from 'fumadocs-core/toc';
import { createMarkdownCompiler, localMd } from '@/local-md';
import { fromJS, fromSerialized } from '@/local-md/renderer';

const cwd = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(cwd, 'fixtures', 'local-md');
const contentDir = path.join(fixturesDir, 'content');

async function readFixture(name: string) {
  const filePath = path.join(fixturesDir, name);
  const content = await fs.readFile(filePath, 'utf8');
  return { filePath, content };
}

/** trailing newline keeps the snapshot files stable under the repo formatter */
function snapshot(value: unknown) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function serializeToc(toc: TOCItemType[] | undefined) {
  if (!toc?.length) return [];
  return toc.map((item) => ({
    url: item.url,
    depth: item.depth,
    _step: item._step,
    titleHtml: renderToStaticMarkup(item.title),
  }));
}

const cases = [
  { name: 'simple', file: 'simple.md' },
  { name: 'rich', file: 'rich.md' },
  { name: 'expressions', file: 'expressions.mdx' },
  { name: 'jsx', file: 'jsx.mdx' },
] as const;

describe('compiler', () => {
  for (const { name, file } of cases) {
    test(`compiles ${name}`, async () => {
      const { filePath, content } = await readFixture(file);
      const compiler = createMarkdownCompiler();
      const out = await compiler.compile({ path: filePath, value: content });

      await expect(
        snapshot({ code: out.code, structuredData: out.structuredData }),
      ).toMatchFileSnapshot(path.join(fixturesDir, `${name}.compiler.json`));
    });

    test(`renders ${name}`, async () => {
      const { filePath, content } = await readFixture(file);
      const compiler = createMarkdownCompiler();
      const out = await compiler.compile({ path: filePath, value: content });
      const renderer = fromJS({
        code: out.code,
        filePath: out.filePath,
        baseUrl: pathToFileURL(out.filePath).href,
        structuredData: out.structuredData,
      });

      const { body, toc } = await renderer.render();
      await expect(
        snapshot({
          structuredData: renderer.structuredData,
          bodyHtml: renderToStaticMarkup(body),
          toc: serializeToc(toc),
        }),
      ).toMatchFileSnapshot(path.join(fixturesDir, `${name}.renderer.json`));
    });
  }

  test('renderSync matches render', async () => {
    const { filePath, content } = await readFixture('simple.md');
    const out = await createMarkdownCompiler().compile({ path: filePath, value: content });
    const renderer = fromJS({ code: out.code, filePath: out.filePath });

    const async = await renderer.render();
    const sync = renderer.renderSync();
    expect(renderToStaticMarkup(sync.body)).toBe(renderToStaticMarkup(async.body));
  });

  test('serialize round-trips through fromSerialized', async () => {
    const { filePath, content } = await readFixture('rich.md');
    const out = await createMarkdownCompiler().compile({ path: filePath, value: content });
    const renderer = fromJS({
      code: out.code,
      filePath: out.filePath,
      structuredData: out.structuredData,
    });

    const restored = fromSerialized(renderer.serialize());
    expect(renderToStaticMarkup((await restored.render()).body)).toBe(
      renderToStaticMarkup((await renderer.render()).body),
    );
    expect(restored.structuredData).toEqual(renderer.structuredData);
  });

  test('exposes MDX exports and passes components through', async () => {
    const { filePath, content } = await readFixture('jsx.mdx');
    const out = await createMarkdownCompiler().compile({ path: filePath, value: content });
    const renderer = await fromJS<{ ignored: unknown }>({
      code: out.code,
      filePath: out.filePath,
    }).render({
      h1: (props) => createElement('h1', { ...props, 'data-custom': 'yes' }),
    });

    expect(renderer.exports.ignored).toBeDefined();
    expect(renderToStaticMarkup(renderer.body)).toContain('data-custom="yes"');
  });

  test('documents without headings get an empty toc', async () => {
    const out = await createMarkdownCompiler().compile({
      path: path.join(fixturesDir, 'none.md'),
      value: 'Just a paragraph, no headings.\n',
    });
    const { toc } = await fromJS({ code: out.code, filePath: out.filePath }).render();
    expect(toc).toEqual([]);
  });

  test('forwards satteriOptions to the preset', async () => {
    const compiler = createMarkdownCompiler({
      satteriOptions: { remarkStructureOptions: false },
    });
    const out = await compiler.compile({
      path: path.join(fixturesDir, 'opt.md'),
      value: '# Heading\n\ntext\n',
    });

    expect(out.structuredData).toBeUndefined();
  });
});

describe('localMd source', () => {
  test('builds virtual files from the content dir', async () => {
    const source = await localMd({ dir: contentDir }).staticSource();
    const summary = source.files
      .map((file) =>
        file.type === 'page'
          ? { type: file.type, path: file.path, title: file.data.title }
          : { type: file.type, path: file.path },
      )
      .sort((a, b) => a.path.localeCompare(b.path));

    expect(summary).toEqual([
      { type: 'page', path: 'guide.md', title: 'Guide' },
      { type: 'page', path: 'index.mdx', title: 'Getting Started' },
      { type: 'meta', path: 'meta.json' },
    ]);
  });

  test('page.load() renders body and toc', async () => {
    const source = await localMd({ dir: contentDir }).staticSource();
    const page = source.files.find((file) => file.path === 'index.mdx');
    if (page?.type !== 'page') throw new Error('expected index.mdx page');

    const { body, toc } = await (await page.data.load()).render();
    const html = renderToStaticMarkup(body);

    expect(html).toContain('Welcome to the docs.');
    expect(toc.map((item) => item.url)).toEqual(['#getting-started', '#install']);
  });

  test('applies baseDir to virtual paths', async () => {
    const source = await localMd({ dir: contentDir }).staticSource({ baseDir: 'docs' });
    expect(source.files.map((file) => file.path).sort()).toEqual([
      path.join('docs', 'guide.md'),
      path.join('docs', 'index.mdx'),
      path.join('docs', 'meta.json'),
    ]);
  });

  test('compiles each page at most once', async () => {
    let compiles = 0;
    const instance = localMd({
      dir: contentDir,
      satteriOptions: {
        // satteri calls plugin factories once per compile
        mdastPlugins: [
          () => {
            compiles++;
            return { name: 'count-compiles' };
          },
        ],
      },
    });
    const source = await instance.staticSource();
    const page = source.files.find((file) => file.path === 'guide.md');
    if (page?.type !== 'page') throw new Error('expected guide.md page');

    await page.data.load();
    await page.data.load();
    expect(compiles).toBe(1);
  });

  test('invalidateFile resets the cached static source', async () => {
    const instance = localMd({ dir: contentDir });
    const source = await instance.staticSource();
    expect(await instance.staticSource()).toBe(source);

    instance.invalidateFile(path.join(contentDir, 'guide.md'));
    expect(await instance.staticSource()).not.toBe(source);
  });

  test('dynamicSource re-reads files and notifies loaders', async () => {
    const instance = localMd({ dir: contentDir });
    const dynamic = instance.dynamicSource();
    let invalidated = 0;
    dynamic.configure?.({ invalidate: () => void invalidated++ } as never);

    expect((await dynamic.files()).length).toBe(3);
    instance.invalidateFile(path.join(contentDir, 'guide.md'));
    expect(invalidated).toBe(1);
    expect((await dynamic.files()).length).toBe(3);
  });
});
