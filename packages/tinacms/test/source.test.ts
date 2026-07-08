import { createElement } from 'react';
import { describe, expect, test } from 'vitest';
import { createTinaCMSSource, type DocToPage, type BaseDoc } from '@/index';
import { createHeadingComponents } from '@/client';

function richText(children: object[]) {
  return { type: 'root', children };
}

const sys = (relativePath: string) => {
  const breadcrumbs = relativePath.replace(/\.mdx?$/, '').split('/');
  const filename = breadcrumbs.at(-1)!;

  return {
    filename,
    basename: `${filename}.mdx`,
    extension: '.mdx',
    path: `content/docs/${relativePath}`,
    relativePath,
    breadcrumbs,
  };
};

const docs = [
  {
    id: 'content/docs/index.mdx',
    _sys: sys('index.mdx'),
    _values: {
      title: 'Hello World',
      description: 'The index page',
      body: richText([
        {
          type: 'h1',
          children: [{ type: 'text', text: 'Introduction' }],
        },
        { type: 'p', children: [{ type: 'text', text: 'Some content here.' }] },
        {
          type: 'h2',
          children: [
            { type: 'text', text: 'Get ' },
            { type: 'text', text: 'Started', bold: true },
          ],
        },
        { type: 'p', children: [{ type: 'text', text: 'More content.' }] },
      ]),
    },
  },
  {
    id: 'content/docs/guide/setup.mdx',
    _sys: sys('guide/setup.mdx'),
    _values: {
      title: 'Setup',
      description: null,
      body: richText([]),
    },
  },
];

function mockTinaFetch(pageSize = 50) {
  return async <R>(query: string, variables?: Record<string, unknown>): Promise<R> => {
    if (query.includes('FumadocsListDocs')) {
      expect(variables?.collection).toBe('docs');
      const start = docs.findIndex((doc) => doc.id === variables?.after) + 1;
      const page = docs.slice(start, start + pageSize);

      return {
        collection: {
          documents: {
            pageInfo: {
              hasNextPage: start + pageSize < docs.length,
              endCursor: page.at(-1)?.id ?? '',
            },
            // include a non-document node (e.g. folder) to ensure it is skipped
            edges: [...page.map((node) => ({ node })), { node: {} }],
          },
        },
      } as R;
    }

    return {
      document: docs.find((doc) => doc._sys.relativePath === variables?.relativePath),
    } as R;
  };
}

describe('createTinaCMSSource', () => {
  test('list documents & map to virtual files', async () => {
    const source = createTinaCMSSource({
      tinaFetch: mockTinaFetch(),
      collection: 'docs',
    });

    const files = await source.files();
    expect(files.map((file) => file.path)).toEqual(['index.mdx', 'guide/setup.mdx']);

    const page = files[0].data as DocToPage<BaseDoc>;
    expect(page.title).toBe('Hello World');
    expect(page.description).toBe('The index page');
    // body should be excluded from page data
    expect('body' in page).toBe(false);

    expect(await page.structuredData()).toEqual({
      headings: [
        { id: 'introduction', content: 'Introduction' },
        { id: 'get-started', content: 'Get Started' },
      ],
      contents: [
        { heading: 'introduction', content: 'Some content here.' },
        { heading: 'get-started', content: 'More content.' },
      ],
    });
  });

  test('paginate list query', async () => {
    const source = createTinaCMSSource({
      tinaFetch: mockTinaFetch(1),
      collection: 'docs',
    });

    const files = await source.files();
    expect(files.map((file) => file.path)).toEqual(['index.mdx', 'guide/setup.mdx']);
  });

  test('load document & render TOC', async () => {
    const source = createTinaCMSSource({
      tinaFetch: mockTinaFetch(),
      collection: 'docs',
    });

    const files = await source.files();
    const page = files[0].data as DocToPage<BaseDoc>;
    const loaded = await page.load();

    expect(loaded.title).toBe('Hello World');
    expect(loaded._toc).toHaveLength(2);

    const toc = loaded.renderToc({ render: (node) => JSON.stringify(node) });
    expect(toc).toEqual([
      {
        depth: 1,
        url: '#introduction',
        title: expect.stringContaining('Introduction'),
      },
      {
        depth: 2,
        url: '#get-started',
        title: expect.stringContaining('Started'),
      },
    ]);
  });

  test('generatePath & baseDir', async () => {
    const source = createTinaCMSSource({
      tinaFetch: mockTinaFetch(),
      collection: 'docs',
      baseDir: 'docs',
      generatePath: (doc) => `${doc._sys.breadcrumbs.join('/')}.mdx`,
    });

    const files = await source.files();
    expect(files.map((file) => file.path)).toEqual(['docs/index.mdx', 'docs/guide/setup.mdx']);
  });
});

describe('createHeadingComponents', () => {
  test('generate ids aligned with renderToc', () => {
    const components = createHeadingComponents();

    const h1 = components.h1({ children: 'Introduction' });
    expect(h1.props).toMatchObject({ id: 'introduction' });

    // duplicated titles receive unique ids
    const h2 = components.h2({ children: 'Introduction' });
    expect(h2.props).toMatchObject({ id: 'introduction-1' });
  });

  test('extract text from lazily rendered children of <TinaMarkdown />', () => {
    const components = createHeadingComponents();
    const Lazy = () => null;

    // mirrors the `<TinaMarkdown content={children} />` element passed to custom components
    const h2 = components.h2({
      children: createElement(Lazy, {
        content: [
          { type: 'text', text: 'Get ' },
          { type: 'text', text: 'Started', bold: true },
        ],
      }),
    });
    expect(h2.props).toMatchObject({ id: 'get-started' });

    // mirrors the `<MemoNode child={...} />` elements of the node renderer
    const h3 = components.h3({
      children: [createElement(Lazy, { child: { type: 'text', text: 'Usage' } })],
    });
    expect(h3.props).toMatchObject({ id: 'usage' });
  });
});
