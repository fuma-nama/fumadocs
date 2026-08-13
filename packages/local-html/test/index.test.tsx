import { expect, test } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import type { TOCItemType } from 'fumadocs-core/toc';
import { localHtml, parseHtml, processHtml, fromAst } from '@/index';

const cwd = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(cwd, 'fixtures');

async function readFixture(name: string) {
  const filePath = path.join(fixturesDir, name);
  const content = await fs.readFile(filePath, 'utf8');
  return { filePath, content };
}

function serializeToc(toc: TOCItemType[] | undefined) {
  if (!toc?.length) return [];
  return toc.map((item) => ({
    url: item.url,
    depth: item.depth,
    titleHtml: renderToStaticMarkup(item.title),
  }));
}

const cases = [
  { name: 'deliverable', file: 'deliverable.html' },
  { name: 'fragment', file: 'fragment.html' },
] as const;

for (const { name, file } of cases) {
  test(`renderer: ${name}`, async () => {
    const { filePath, content } = await readFixture(file);
    const res = processHtml(parseHtml(content));
    const renderer = fromAst({
      tree: res.tree,
      filePath,
      rehypeToc: res.toc,
      structuredData: res.structuredData,
    });
    const { body, toc } = await renderer.render();
    const payload = {
      structuredData: renderer.structuredData,
      bodyHtml: renderToStaticMarkup(body),
      toc: serializeToc(toc),
    };

    await expect(JSON.stringify(payload, null, 2)).toMatchFileSnapshot(
      path.join(fixturesDir, `${name}.renderer.json`),
    );
  });
}

test('a full document adapts to the docs theme', async () => {
  const { filePath, content } = await readFixture('deliverable.html');
  const res = processHtml(parseHtml(content));
  const renderer = fromAst({ tree: res.tree, filePath, rehypeToc: res.toc });
  const html = renderToStaticMarkup((await renderer.render()).body);

  // content scoped to <main>, chrome and non-content tags dropped
  expect(html).not.toContain('wordmark');
  expect(html).not.toContain('<script');
  expect(html).not.toContain('<style');
  // styling hooks removed so prose styles take over
  expect(html).not.toContain('class=');
  expect(html).not.toContain('style=');
  expect(html).not.toContain('onclick');
  // content survives
  expect(html).toContain('<strong>March</strong>');
  expect(html).toContain('<table>');
});

test('headings get generated ids and drive toc + structured data', async () => {
  const { content } = await readFixture('deliverable.html');
  const res = processHtml(parseHtml(content));

  expect(res.toc.map((item) => item.url)).toEqual(['#product-kickoff', '#goals', '#the-roadmap']);
  expect(res.structuredData.headings).toContainEqual({
    id: 'the-roadmap',
    content: 'The Roadmap',
  });
  expect(res.structuredData.contents).toContainEqual({
    heading: 'goals',
    content: 'Validate demand',
  });
});

test('components map onto html tags', async () => {
  const { filePath, content } = await readFixture('fragment.html');
  const res = processHtml(parseHtml(content));
  const renderer = fromAst({ tree: res.tree, filePath, rehypeToc: res.toc });
  const { body } = await renderer.render({
    h2: (props) => <h2 {...props} data-custom="true" />,
  });

  expect(renderToStaticMarkup(body)).toContain('data-custom="true"');
});

test('source: metadata comes from the document head', async () => {
  const source = await localHtml({ dir: fixturesDir }).staticSource();
  const pages = source.files.filter((file) => file.type === 'page');
  const byPath = Object.fromEntries(pages.map((page) => [page.path, page]));

  const deliverable = byPath['deliverable.html'];
  if (deliverable?.type !== 'page') throw new Error('expected a page');
  expect(deliverable.data.title).toBe('Product Kickoff');
  expect(deliverable.data.description).toBe('Kickoff deck for the product team.');
  expect(deliverable.data.metadata.author).toBe('Docs Team');

  const fragment = byPath['fragment.html'];
  if (fragment?.type !== 'page') throw new Error('expected a page');
  expect(fragment.data.title).toBe('A Fragment Page');
  expect(fragment.data.description).toBe('Content without a document shell.');
});

test('load() compiles each page only once', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'local-html-cache-'));

  try {
    await fs.writeFile(path.join(dir, 'a.html'), '<h1>A</h1><p>text</p>');

    const source = await localHtml({ dir }).staticSource();
    const page = source.files.find((file) => file.type === 'page');
    if (page?.type !== 'page') throw new Error('expected a page');

    const first = await page.data.load();
    const second = await page.data.load();
    expect(first).toBe(second);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
