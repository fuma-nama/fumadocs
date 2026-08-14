import { expect, test } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import type { TOCItemType } from 'fumadocs-core/toc';
import { localHtml } from '@/index';
import { parseHtml, processHtml } from '@/html/compiler';
import { fromAst } from '@/html/renderer';

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
    const res = await processHtml(parseHtml(content));
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
  const res = await processHtml(parseHtml(content));
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
  const res = await processHtml(parseHtml(content));

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
  const res = await processHtml(parseHtml(content));
  const renderer = fromAst({ tree: res.tree, filePath, rehypeToc: res.toc });
  const { body } = await renderer.render({
    h2: (props) => <h2 {...props} data-custom="true" />,
  });

  expect(renderToStaticMarkup(body)).toContain('data-custom="true"');
});

test('embedding elements are dropped', async () => {
  const res = await processHtml(
    parseHtml(
      '<p>safe</p><iframe src="https://evil.example"></iframe><object data="x"></object><embed src="y">',
    ),
  );
  const html = renderToStaticMarkup((await fromAst({ tree: res.tree }).render()).body);

  expect(html).toContain('safe');
  expect(html).not.toContain('<iframe');
  expect(html).not.toContain('<object');
  expect(html).not.toContain('<embed');
});

test('forms and script-protocol urls are dropped', async () => {
  const res = await processHtml(
    parseHtml(
      '<p><a href="javascript:steal()">click</a></p><form action="https://evil.example"><input name="q" /></form>',
    ),
  );
  const html = renderToStaticMarkup((await fromAst({ tree: res.tree }).render()).body);

  expect(html).toContain('click');
  expect(html).not.toContain('javascript:');
  expect(html).not.toContain('<form');
});

test('the content is scoped only to an unambiguous, non-empty element', async () => {
  const render = async (value: string) => {
    const res = await processHtml(parseHtml(value));
    return renderToStaticMarkup((await fromAst({ tree: res.tree }).render()).body);
  };

  // both articles are kept, rather than silently truncating the page to the first
  expect(await render('<article><p>one</p></article><article><p>two</p></article>')).toContain(
    'two',
  );
  expect(
    await render('<!doctype html><html><body><main></main><p>real</p></body></html>'),
  ).toContain('real');
});

test('source positions are left out of the processed tree', async () => {
  const res = await processHtml(parseHtml('<h1>Title</h1><p>text</p>'));

  expect(JSON.stringify(res.tree)).not.toContain('position');
});

test('the body fallback drops page chrome', async () => {
  const res = await processHtml(
    parseHtml(
      '<!doctype html><html><body><header>chrome</header><nav>links</nav><p>content</p><footer>chrome</footer></body></html>',
    ),
  );
  const html = renderToStaticMarkup((await fromAst({ tree: res.tree }).render()).body);

  expect(html).toContain('content');
  expect(html).not.toContain('<header');
  expect(html).not.toContain('<nav');
  expect(html).not.toContain('<footer');
});

test('processHtml does not mutate the input tree', async () => {
  const input = parseHtml('<h1 class="big">Title</h1><script>evil()</script>');
  const before = JSON.stringify(input);
  await processHtml(input);

  expect(JSON.stringify(input)).toBe(before);
});

test('generated slugs avoid pre-existing heading ids', async () => {
  const res = await processHtml(parseHtml('<h2>Setup</h2><h2 id="setup">Other</h2>'));

  expect(res.toc.map((item) => item.url)).toEqual(['#setup-1', '#setup']);
});

test('slugs ignore the markup dropped from a heading', async () => {
  const res = await processHtml(
    parseHtml('<h2><svg><title>Rocket icon</title></svg>Getting Started</h2>'),
  );

  expect(res.toc.map((item) => item.url)).toEqual(['#getting-started']);
  expect(res.structuredData.headings).toEqual([
    { id: 'getting-started', content: 'Getting Started' },
  ]);
});

test('an svg <title> never becomes the page title', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'local-html-svg-'));

  try {
    await fs.writeFile(
      path.join(dir, 'chart.html'),
      '<p>intro</p><svg><title>Chart label</title></svg>',
    );

    const source = await localHtml({ dir }).staticSource();
    const page = source.files.find((file) => file.type === 'page');
    if (page?.type !== 'page') throw new Error('expected a page');
    expect(page.data.title).toBe('chart');
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('an empty <title> falls back to the file name', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'local-html-title-'));

  try {
    await fs.writeFile(
      path.join(dir, 'untitled.html'),
      '<!doctype html><html><head><title>  </title></head><body><p>x</p></body></html>',
    );

    const source = await localHtml({ dir }).staticSource();
    const page = source.files.find((file) => file.type === 'page');
    if (page?.type !== 'page') throw new Error('expected a page');
    expect(page.data.title).toBe('untitled');
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
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

async function loadOnly(html: string, config?: Partial<Parameters<typeof localHtml>[0]>) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'local-html-code-'));

  try {
    await fs.writeFile(path.join(dir, 'a.html'), html);
    const source = await localHtml({ dir, ...config }).staticSource();
    const page = source.files.find((file) => file.type === 'page');
    if (page?.type !== 'page') throw new Error('expected a page');

    const renderer = await page.data.load();
    return {
      html: renderToStaticMarkup((await renderer.render()).body),
      structuredData: renderer.structuredData,
    };
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

test('code blocks are highlighted, and indexed as written', async () => {
  const { html, structuredData } = await loadOnly(
    '<pre><code class="language-ts">const answer: number = 42;</code></pre>',
  );

  expect(html).toContain('shiki');
  // the tokens are split up and coloured, rather than left as one text node
  expect(html).toContain('--shiki-light:');
  expect(structuredData.contents).toContainEqual({
    heading: undefined,
    content: 'const answer: number = 42;',
  });
});

test('code already highlighted by another tool is re-highlighted from its text', async () => {
  const { html } = await loadOnly(
    '<pre><code class="language-js"><span class="hljs-keyword">const</span> <span class="hljs-var">a</span> = 1;</code></pre>',
  );

  expect(html).not.toContain('hljs-keyword');
  expect(html).toContain('shiki');
  expect(html).toContain('const');
});

test('a code block without a language still renders', async () => {
  const { html } = await loadOnly('<pre><code>plain text</code></pre>');

  expect(html).toContain('plain text');
});

test('rehypeCodeOptions: false keeps the language hint and skips Shiki', async () => {
  const { html } = await loadOnly(
    '<pre><code class="language-ts">const answer = 42;</code></pre>',
    { rehypeCodeOptions: false },
  );

  expect(html).toContain('language-ts');
  expect(html).not.toContain('shiki');
});

test('a language written on the `<pre>` wrapper is carried down to the code', async () => {
  const { html } = await loadOnly('<pre class="language-js"><code>const a = 1;</code></pre>');

  expect(html).toContain('shiki');
  expect(html).toContain('--shiki-light:');
});
