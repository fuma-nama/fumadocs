import { createI18nSearchAPI, createSearchAPI, type ExportedData } from '@/search/server';
import { expect, test, vi } from 'vitest';
import type { Meilisearch, SearchParams } from 'meilisearch';
import { structure } from '@/mdx-plugins';
import { buildDocuments } from '@/search/server/build-doc';
import { loader } from '@/source';
import { sync, toDocuments } from '@/search/meilisearch';
import { meilisearchClient } from '@/search/client/meilisearch';
import type Mixedbread from '@mixedbread/sdk';
import { createMixedbreadSearchAPI, sync as syncMixedbread } from '@/search/mixedbread';

test('Search API', async () => {
  const api = createSearchAPI('simple', {
    indexes: [
      {
        title: 'Hello World',
        content: 'Hello World',
        url: '/hello-world',
      },
      {
        title: 'Nothing',
        content: 'Nothing',
        url: '/nothing',
      },
    ],
  });

  expect(await api.search('Hello')).toHaveLength(1);
  expect(await api.search('pterodactyl')).toHaveLength(0);
});

test('Search API Advanced', async () => {
  const api = createSearchAPI('advanced', {
    indexes: [
      {
        id: '1',
        title: 'Index',
        structuredData: structure(
          `## Hello World

something`,
        ),
        url: '/',
        tag: 'my-tag',
      },
      {
        id: '2',
        title: 'Page',
        structuredData: structure(
          `## My Page

something`,
        ),
        url: '/page',
        tag: 'test',
      },
    ],
  });

  expect(await api.search('Page')).toHaveLength(2);
  expect(await api.search('something')).toHaveLength(4);
  expect(await api.search('', { tag: 'my-tag' })).toHaveLength(3);

  expect(await api.search('Hello')).toMatchInlineSnapshot(`
    [
      {
        "breadcrumbs": undefined,
        "content": "Index",
        "id": "1",
        "type": "page",
        "url": "/",
      },
      {
        "breadcrumbs": undefined,
        "content": "Hello World",
        "id": "1-0",
        "table": undefined,
        "type": "heading",
        "url": "/#hello-world",
      },
    ]
  `);
});

test('Search API Advanced: table ids are metadata', async () => {
  const api = createSearchAPI('advanced', {
    indexes: [
      {
        id: '1',
        title: 'Index',
        structuredData: structure('| Prop | Type |\n| --- | --- |\n| `id` | string |'),
        url: '/',
      },
    ],
  });

  expect(await api.search('string')).toContainEqual(expect.objectContaining({ table: 'table-0' }));
  expect(await api.search('table')).toHaveLength(0);
});

test('buildDocuments: page description duplicated in contents is indexed once', () => {
  // OpenAPI single-operation pages emit the operation description as both the page
  // description and a `contents` entry (#3509) — only the anchored record must survive
  const docs = buildDocuments([
    {
      id: '1',
      title: 'Past',
      description: 'Get the carbon intensity for a zone.',
      url: '/docs/past',
      structuredData: {
        headings: [{ id: 'past', content: 'Past' }],
        contents: [{ heading: 'past', content: 'Get the carbon intensity for a zone.' }],
      },
    },
  ]);

  const texts = docs.filter((doc) => doc.type === 'text');
  expect(texts).toHaveLength(1);
  expect(texts[0].url).toBe('/docs/past#past');

  // a description distinct from the body keeps its own record
  const distinct = buildDocuments([
    {
      id: '1',
      title: 'Page',
      description: 'A frontmatter description.',
      url: '/docs/page',
      structuredData: {
        headings: [],
        contents: [{ heading: undefined, content: 'The body text.' }],
      },
    },
  ]);
  expect(distinct.filter((doc) => doc.type === 'text')).toHaveLength(2);
});

test('Search API I18n', async () => {
  const api = createI18nSearchAPI('simple', {
    i18n: {
      languages: ['italian', 'en'],
      defaultLanguage: 'en',
    },
    indexes: [
      {
        title: 'ciao mondo amico italian',
        content: 'ciao mondo amico',
        url: '/hello-world',
        locale: 'italian',
      },
      {
        title: 'Hello World English',
        content: 'Hello World',
        url: '/hello-world',
        locale: 'en',
      },
    ],
  });

  expect(await api.search('English', { locale: 'en' })).toHaveLength(1);
  expect(await api.search('amico', { locale: 'italian' })).toHaveLength(1);
  expect(await api.search('italian', { locale: 'en' })).toHaveLength(0);
  const exported = (await api.export()) as ExportedData;
  // zero-config i18n: a single multilingual database shared by all locales
  expect(exported.type).toBe('simple');
  if (exported.type !== 'i18n') expect(exported.i18n).toBe(true);
});

test('Search API I18n: zero-config languages', async () => {
  const api = createI18nSearchAPI('simple', {
    i18n: {
      languages: ['cn', 'ru'],
      defaultLanguage: 'cn',
    },
    indexes: [
      {
        title: '快速開始使用框架',
        content: '快速開始使用框架',
        url: '/cn/hello-world',
        locale: 'cn',
      },
      {
        title: 'Начало работы, ёлка',
        content: 'Начало работы, ёлка',
        url: '/ru/hello-world',
        locale: 'ru',
      },
    ],
  });

  expect(await api.search('框架', { locale: 'cn' })).toHaveLength(1);
  // diacritics folding: `елка` matches `ёлка`
  expect(await api.search('елка', { locale: 'ru' })).toHaveLength(1);
  expect(await api.search('框架', { locale: 'ru' })).toHaveLength(0);
});

// a stemmer that folds every form of "record" onto a marker unrelated to the indexed text,
// so a hit can only come from the custom tokenizer being applied on both index and query.
const stemmer = (word: string) => (word.startsWith('record') ? 'pterodactyl' : word);
const tokenizer = { language: 'multilingual', stemming: true, stemmer } as const;

const indexes = [
  {
    title: 'Recording',
    content: 'Start a recording session.',
    url: '/help/recording',
  },
];

test('Search API: custom tokenizer', async () => {
  expect(await createSearchAPI('simple', { indexes }).search('pterodactyl')).toHaveLength(0);
  expect(
    await createSearchAPI('simple', { indexes, tokenizer }).search('pterodactyl'),
  ).toHaveLength(1);

  // `components.tokenizer` routes into the same code path
  expect(
    await createSearchAPI('simple', { indexes, components: { tokenizer } }).search('pterodactyl'),
  ).toHaveLength(1);
});

test('Search API I18n: custom tokenizer', async () => {
  const api = createI18nSearchAPI('simple', {
    i18n: {
      languages: ['en'],
      defaultLanguage: 'en',
    },
    tokenizer,
    indexes: indexes.map((index) => ({ ...index, locale: 'en' })),
  });

  expect(await api.search('pterodactyl', { locale: 'en' })).toHaveLength(1);
});

test('Search API: language is forwarded to the engine', async () => {
  // an unsupported language is rejected by the engine, which proves the value reaches it
  await expect(
    createSearchAPI('simple', { indexes, language: 'klingon' }).search('recording'),
  ).rejects.toThrow(/not supported/);

  // ...and is dropped once a tokenizer takes over, which defines its own language
  await expect(
    createSearchAPI('simple', { indexes, language: 'klingon', tokenizer }).search('pterodactyl'),
  ).resolves.toHaveLength(1);

  // i18n servers must not clobber it either
  await expect(
    createI18nSearchAPI('simple', {
      i18n: { languages: ['en'], defaultLanguage: 'en' },
      indexes: indexes.map((index) => ({ ...index, locale: 'en' })),
      language: 'klingon',
    } as never).search('recording'),
  ).rejects.toThrow(/not supported/);
});

test('Search API I18n: legacy locale map', async () => {
  const api = createI18nSearchAPI('simple', {
    i18n: {
      languages: ['italian', 'en'],
      defaultLanguage: 'en',
    },
    localeMap: {
      italian: 'italian',
      en: 'english',
    },
    indexes: [
      {
        title: 'ciao mondo amico italian',
        content: 'ciao mondo amico',
        url: '/hello-world',
        locale: 'italian',
      },
      {
        title: 'Hello World English',
        content: 'Hello World',
        url: '/hello-world',
        locale: 'en',
      },
    ],
  });

  expect(await api.search('English', { locale: 'en' })).toHaveLength(1);
  expect(await api.search('amico', { locale: 'italian' })).toHaveLength(1);
  expect(await api.search('italian', { locale: 'en' })).toHaveLength(0);
  const exported = (await api.export()) as ExportedData;
  expect(exported.type).toBe('i18n');

  if (exported.type === 'i18n')
    expect(Object.keys(exported.data)).toMatchInlineSnapshot(`
    [
      "italian",
      "en",
    ]
  `);
});

test('Meilisearch: sync', async () => {
  const source = loader({
    baseUrl: '/docs',
    source: {
      files: [
        {
          type: 'page',
          path: 'guide/install.mdx',
          data: {
            title: 'Installation',
            description: 'Install the package.',
            structuredData: structure('## Using npm\n\nRun `npm install`.'),
          },
        },
      ],
    },
  });
  const calls: unknown[] = [];
  const task = (...args: unknown[]) => {
    calls.push(args);
    return { waitTask: async () => ({ status: 'succeeded', error: null }) };
  };
  const client = {
    index: () => ({ updateSettings: task, addDocuments: task, deleteDocuments: task }),
  } as unknown as Meilisearch;

  const documents = await toDocuments(source, { tag: (page) => page.slugs[0] });
  await sync(client, { indexName: 'docs', documents });
  expect(calls).toMatchInlineSnapshot(`
    [
      [
        {
          "filterableAttributes": [
            "id",
            "tag",
            "locale",
          ],
          "searchableAttributes": [
            "content",
          ],
        },
      ],
      [
        [
          {
            "breadcrumbs": [
              "Docs",
              "Guide",
            ],
            "content": "Installation",
            "heading": undefined,
            "id": 0,
            "locale": undefined,
            "tag": "guide",
            "title": "Installation",
            "type": "page",
            "url": "/docs/guide/install",
          },
          {
            "breadcrumbs": [
              "Docs",
              "Guide",
            ],
            "content": "Install the package.",
            "heading": undefined,
            "id": 1,
            "locale": undefined,
            "tag": "guide",
            "title": "Installation",
            "type": "text",
            "url": "/docs/guide/install",
          },
          {
            "breadcrumbs": [
              "Docs",
              "Guide",
            ],
            "content": "Using npm",
            "heading": "using-npm",
            "id": 2,
            "locale": undefined,
            "tag": "guide",
            "title": "Installation",
            "type": "heading",
            "url": "/docs/guide/install",
          },
          {
            "breadcrumbs": [
              "Docs",
              "Guide",
            ],
            "content": "Run \`npm install\`.",
            "heading": "using-npm",
            "id": 3,
            "locale": undefined,
            "tag": "guide",
            "title": "Installation",
            "type": "text",
            "url": "/docs/guide/install",
          },
        ],
        {
          "primaryKey": "id",
        },
      ],
      [
        {
          "filter": "id >= 4",
        },
      ],
    ]
  `);
});

test('Meilisearch: search client', async () => {
  let params: SearchParams | undefined;
  const page = { title: 'Page A', url: '/a' };
  const hits = [
    { ...page, id: 2, type: 'text', heading: 'x', content: 'hello x' },
    { id: 5, type: 'page', title: 'Page B', url: '/b', content: 'Page B' },
    { ...page, id: 0, type: 'page', content: 'Page A' },
    { ...page, id: 3, type: 'heading', heading: 'y', content: 'hello y' },
  ];
  const client = {
    index: () => ({
      async search(_query: string, options: SearchParams) {
        params = options;
        return { hits };
      },
    }),
  } as unknown as Meilisearch;

  const results = await meilisearchClient({
    client,
    indexName: 'docs',
    tag: 'guide',
    locale: 'en',
  }).search('hello');

  expect(params?.filter).toEqual(['locale = "en"', 'tag = "guide"']);
  expect(results).toMatchInlineSnapshot(`
    [
      {
        "breadcrumbs": undefined,
        "content": "Page A",
        "id": "/a",
        "type": "page",
        "url": "/a",
      },
      {
        "content": "hello x",
        "id": "2",
        "table": undefined,
        "type": "text",
        "url": "/a#x",
      },
      {
        "content": "hello y",
        "id": "3",
        "table": undefined,
        "type": "heading",
        "url": "/a#y",
      },
      {
        "breadcrumbs": undefined,
        "content": "Page B",
        "id": "/b",
        "type": "page",
        "url": "/b",
      },
    ]
  `);
});

test('Search API Advanced: results are limited', async () => {
  const api = createSearchAPI('advanced', {
    indexes: Array.from({ length: 40 }, (_, i) => ({
      id: String(i),
      title: `Page ${i}`,
      url: `/${i}`,
      structuredData: structure('## Hello\n\nsomething'),
    })),
  });

  expect(await api.search('something')).toHaveLength(60);
  expect(await api.search('something', { limit: 10 })).toHaveLength(10);
});

test('Mixedbread: records grouped by page', async () => {
  const chunk = (chunk_index: number, text: string, generated_metadata: object) => ({
    type: 'text',
    file_id: 'file-a',
    chunk_index,
    text,
    metadata: { title: 'Page A', url: '/a', breadcrumbs: ['Docs'], tags: ['ui'], hash: '' },
    generated_metadata,
  });
  const search = vi.fn(async () => ({
    data: [
      chunk(3, '| `hotKey?` | `array` |\n| --- | --- |', {
        kind: 'text',
        heading: 'props',
        table: 'table-0',
      }),
      chunk(0, 'Page A', { kind: 'page' }),
      chunk(1, 'Props', { kind: 'heading', heading: 'props' }),
    ],
  }));
  const api = createMixedbreadSearchAPI({
    client: { stores: { search } } as unknown as Mixedbread,
    storeIdentifier: 'docs',
  });

  expect(await api.search('hot key', { tag: ['ui'], locale: 'en', limit: 100 }))
    .toMatchInlineSnapshot(`
    [
      {
        "breadcrumbs": [
          "Docs",
        ],
        "content": "Page A",
        "id": "file-a",
        "type": "page",
        "url": "/a",
      },
      {
        "content": "| \`hotKey?\` | \`array\` |
    | --- | --- |",
        "id": "file-a-3",
        "table": "table-0",
        "type": "text",
        "url": "/a#props",
      },
      {
        "content": "Props",
        "id": "file-a-1",
        "table": undefined,
        "type": "heading",
        "url": "/a#props",
      },
    ]
  `);
  expect(search).toHaveBeenCalledWith(
    expect.objectContaining({
      // requests can't raise `topK`
      top_k: 10,
      filters: {
        all: [
          { key: 'locale', operator: 'eq', value: 'en' },
          { key: 'tags', operator: 'contains', value: 'ui' },
        ],
      },
    }),
  );
});

test('Mixedbread: sync', async () => {
  // files of the store by ID
  const files = new Map<string, { external_id: string; metadata: object }>([
    ['old-a', { external_id: '/a', metadata: { hash: 'outdated' } }],
    ['removed', { external_id: '/removed', metadata: {} }],
  ]);
  const uploads: { chunks: unknown; body: { external_id: string } }[] = [];
  const client = {
    stores: {
      files: {
        list: async () => ({
          data: Array.from(files, ([id, file]) => ({ id, ...file })),
          pagination: { has_more: false },
        }),
        upload: async (_: string, file: File, body: { external_id: string; metadata: object }) => {
          uploads.push({ chunks: JSON.parse(await file.text()), body });
          files.set(`file-${uploads.length}`, body);
        },
      },
    },
    files: { delete: async (id: string) => files.delete(id) },
  } as unknown as Mixedbread;
  const options = {
    storeIdentifier: 'docs',
    documents: [
      {
        title: 'Page A',
        description: 'About A',
        url: '/a',
        tag: 'ui',
        structured: structure('## Props\n\n| Prop | Type |\n| --- | --- |\n| `a` | `string` |'),
      },
      // a locale sharing the URL
      { title: 'Page A', url: '/a', locale: 'fr', structured: structure('Bonjour') },
    ],
  };

  await syncMixedbread(client, options);
  expect(uploads[0].chunks).toMatchInlineSnapshot(`
    [
      {
        "generated_metadata": {
          "kind": "page",
        },
        "text": "Page A",
        "type": "text",
      },
      {
        "generated_metadata": {
          "kind": "text",
        },
        "text": "About A",
        "type": "text",
      },
      {
        "generated_metadata": {
          "heading": "props",
          "kind": "heading",
        },
        "text": "Props",
        "type": "text",
      },
      {
        "generated_metadata": {
          "heading": "props",
          "kind": "text",
          "table": "table-0",
        },
        "text": "| Prop | Type |
    | --- | --- |
    | \`a\` | \`string\` |",
        "type": "text",
      },
    ]
  `);
  expect(uploads.map((item) => item.body.external_id)).toEqual(['/a', 'fr:/a']);
  expect([...files.keys()]).toEqual(['file-1', 'file-2']);

  // unchanged pages are skipped
  await syncMixedbread(client, options);
  expect(uploads).toHaveLength(2);

  // metadata changes are uploaded
  options.documents[0].tag = 'core';
  await syncMixedbread(client, options);
  expect(uploads).toHaveLength(3);
});
