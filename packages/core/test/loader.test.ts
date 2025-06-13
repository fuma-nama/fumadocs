import { expect, test } from 'vitest';
import {
  createGetUrl,
  getSlugs,
  loader,
  type Source,
  type SourceConfig,
} from '@/source/loader';
import { parseFilePath } from '@/source';
import { PageTree } from '../dist/server';
import type { ReactElement } from 'react';
import { removeUndefined } from '@/utils/remove-undefined';

test('get slugs', () => {
  expect(getSlugs(parseFilePath('index.mdx'))).toStrictEqual([]);
  expect(getSlugs(parseFilePath('page.mdx'))).toStrictEqual(['page']);

  expect(getSlugs(parseFilePath('nested/index.mdx'))).toStrictEqual(['nested']);
  expect(getSlugs(parseFilePath('nested/page.mdx'))).toStrictEqual([
    'nested',
    'page',
  ]);
});

test('get slugs: folder groups', () => {
  expect(getSlugs(parseFilePath('(nested)/index.mdx'))).toStrictEqual([]);
  expect(getSlugs(parseFilePath('folder/(nested)/page.mdx'))).toStrictEqual([
    'folder',
    'page',
  ]);

  expect(getSlugs(parseFilePath('nested/(page).mdx'))).toStrictEqual([
    'nested',
    '(page)',
  ]);
});

test('Get URL: Empty', () => {
  const getUrl = createGetUrl('');
  expect(getUrl(['docs', 'hello'])).toBe('/docs/hello');
  expect(getUrl([''])).toBe('/');
  expect(getUrl([])).toBe('/');
});

test('Get URL: Base', () => {
  const getUrl = createGetUrl('/docs');
  expect(getUrl(['docs', 'hello'])).toBe('/docs/docs/hello');
  expect(getUrl([''])).toBe('/docs');
});

test('Loader: Simple', () => {
  const result = loader({
    baseUrl: '/',
    pageTree: {
      noRef: true,
    },
    source: {
      files: [
        {
          type: 'page',
          path: 'test.mdx',
          data: {
            title: 'Hello',
          },
        },
        {
          type: 'meta',
          path: 'meta.json',
          data: {
            pages: ['test'],
          },
        },
      ],
    },
  });

  expect(removeUndefined(result.pageTree, true), 'Page Tree')
    .toMatchInlineSnapshot(`
      {
        "$id": "root",
        "children": [
          {
            "$id": "test.mdx",
            "name": "Hello",
            "type": "page",
            "url": "/test",
          },
        ],
        "name": "",
      }
    `);

  expect(result.getPages().length).toBe(1);
  expect(result.getPage(['test'])).toBeDefined();
});

test('Nested Directories', async () => {
  const result = loader({
    baseUrl: '/',
    icon: (v) => v as unknown as ReactElement,
    pageTree: {
      noRef: true,
    },
    source: {
      files: [
        {
          type: 'page',
          path: 'test.mdx',
          data: {
            title: 'Hello',
          },
        },
        {
          type: 'page',
          path: 'hidden.mdx',
          data: {
            title: 'Hidden',
          },
        },
        {
          type: 'meta',
          path: 'meta.json',
          data: {
            pages: [
              '...',
              '!hidden',
              'nested',
              '[Text](https://google.com)',
              '[Icon][Text](https://google.com)',
            ],
          },
        },
        {
          type: 'page',
          path: '/nested/test.mdx',
          data: {
            title: 'Nested Page',
          },
        },
        {
          type: 'page',
          path: '/(nested)/hello.mdx',
          data: {
            title: 'Route Group Page',
          },
        },
      ],
    },
  });

  expect(removeUndefined(result.pageTree, true), 'Page Tree')
    .toMatchInlineSnapshot(`
      {
        "$id": "root",
        "children": [
          {
            "$id": "test.mdx",
            "name": "Hello",
            "type": "page",
            "url": "/test",
          },
          {
            "$id": "(nested)",
            "children": [
              {
                "$id": "(nested)/hello.mdx",
                "name": "Route Group Page",
                "type": "page",
                "url": "/hello",
              },
            ],
            "name": "Nested",
            "type": "folder",
          },
          {
            "$id": "nested",
            "children": [
              {
                "$id": "nested/test.mdx",
                "name": "Nested Page",
                "type": "page",
                "url": "/nested/test",
              },
            ],
            "name": "Nested",
            "type": "folder",
          },
          {
            "external": true,
            "name": "Text",
            "type": "page",
            "url": "https://google.com",
          },
          {
            "external": true,
            "icon": "Icon",
            "name": "Text",
            "type": "page",
            "url": "https://google.com",
          },
        ],
        "name": "",
      }
    `);
  expect(result.getPages().length).toBe(4);
  // page in folder
  expect(result.getPage(['nested', 'test'])).toBeDefined();

  // page in folder group
  expect(result.getPage(['hello'])).toBeDefined();
});

const i18nSource: Source<SourceConfig> = {
  files: [
    {
      type: 'page',
      path: 'test.mdx',
      data: {
        title: 'Hello',
      },
    },
    {
      type: 'page',
      path: 'test.cn.mdx',
      data: {
        title: 'Hello Chinese',
      },
    },
    {
      type: 'meta',
      path: 'meta.en.json',
      data: {
        title: 'Docs English',
        pages: ['test', 'nested'],
      },
    },
    {
      type: 'meta',
      path: 'meta.cn.json',
      data: {
        title: 'Docs Chinese',
        pages: ['test', 'nested'],
      },
    },
    {
      type: 'page',
      path: '/nested/test.en.mdx',
      data: {
        title: 'Nested Page',
      },
    },
    {
      type: 'page',
      path: '/nested/test.cn.mdx',
      data: {
        title: 'Nested Page Chinese',
      },
    },
    {
      type: 'meta',
      path: '/nested/meta.cn.json',
      data: {
        title: 'Nested Chinese',
      },
    },
  ],
};

test('Internationalized Routing', () => {
  const result = loader({
    baseUrl: '/',
    i18n: {
      languages: ['cn', 'en'],
      defaultLanguage: 'en',
    },
    source: i18nSource,
  });

  expect(
    result.getNodePage(result.pageTree['en'].children[0] as PageTree.Item),
  ).toEqual(
    expect.objectContaining({
      data: {
        title: 'Hello',
      },
    }),
  );
  expect(
    result.getNodePage(
      result.pageTree['en'].children[0] as PageTree.Item,
      'cn',
    ),
  ).toEqual(
    expect.objectContaining({
      data: {
        title: 'Hello Chinese',
      },
    }),
  );

  expect(removeUndefined(result.pageTree['en'], true), 'Page Tree')
    .toMatchInlineSnapshot(`
      {
        "$id": "en",
        "children": [
          {
            "$id": "test.mdx",
            "$ref": {
              "file": "test.mdx",
            },
            "name": "Hello",
            "type": "page",
            "url": "/en/test",
          },
          {
            "$id": "nested",
            "children": [
              {
                "$id": "nested/test.mdx",
                "$ref": {
                  "file": "nested/test.mdx",
                },
                "name": "Nested Page",
                "type": "page",
                "url": "/en/nested/test",
              },
            ],
            "name": "Nested",
            "type": "folder",
          },
        ],
        "name": "Docs English",
      }
    `);

  expect(removeUndefined(result.pageTree['cn'], true), 'Page Tree')
    .toMatchInlineSnapshot(`
      {
        "$id": "cn",
        "children": [
          {
            "$id": "test.mdx",
            "$ref": {
              "file": "test.mdx",
            },
            "name": "Hello Chinese",
            "type": "page",
            "url": "/cn/test",
          },
          {
            "$id": "nested",
            "children": [
              {
                "$id": "nested/test.mdx",
                "$ref": {
                  "file": "nested/test.mdx",
                },
                "name": "Nested Page Chinese",
                "type": "page",
                "url": "/cn/nested/test",
              },
            ],
            "name": "Nested",
            "type": "folder",
          },
        ],
        "name": "Docs Chinese",
      }
    `);

  expect(result.getLanguages()).toMatchInlineSnapshot(`
    [
      {
        "language": "cn",
        "pages": [
          {
            "absolutePath": "",
            "data": {
              "title": "Hello Chinese",
            },
            "file": {
              "dirname": "",
              "ext": ".mdx",
              "flattenedPath": "test",
              "name": "test",
              "path": "test.mdx",
            },
            "locale": "cn",
            "path": "test.mdx",
            "slugs": [
              "test",
            ],
            "url": "/cn/test",
          },
          {
            "absolutePath": "",
            "data": {
              "title": "Nested Page Chinese",
            },
            "file": {
              "dirname": "nested",
              "ext": ".mdx",
              "flattenedPath": "nested/test",
              "name": "test",
              "path": "nested/test.mdx",
            },
            "locale": "cn",
            "path": "nested/test.mdx",
            "slugs": [
              "nested",
              "test",
            ],
            "url": "/cn/nested/test",
          },
        ],
      },
      {
        "language": "en",
        "pages": [
          {
            "absolutePath": "",
            "data": {
              "title": "Hello",
            },
            "file": {
              "dirname": "",
              "ext": ".mdx",
              "flattenedPath": "test",
              "name": "test",
              "path": "test.mdx",
            },
            "locale": "en",
            "path": "test.mdx",
            "slugs": [
              "test",
            ],
            "url": "/en/test",
          },
          {
            "absolutePath": "",
            "data": {
              "title": "Nested Page",
            },
            "file": {
              "dirname": "nested",
              "ext": ".mdx",
              "flattenedPath": "nested/test",
              "name": "test",
              "path": "nested/test.mdx",
            },
            "locale": "en",
            "path": "nested/test.mdx",
            "slugs": [
              "nested",
              "test",
            ],
            "url": "/en/nested/test",
          },
        ],
      },
    ]
  `);
});

test('Internationalized Routing: Hide Prefix', () => {
  const result = loader({
    baseUrl: '/',
    i18n: {
      languages: ['cn', 'en'],
      defaultLanguage: 'en',
      hideLocale: 'default-locale',
    },
    pageTree: {
      noRef: true,
    },
    source: i18nSource,
  });

  expect(removeUndefined(result.pageTree['en'], true), 'Page Tree')
    .toMatchInlineSnapshot(`
      {
        "$id": "en",
        "children": [
          {
            "$id": "test.mdx",
            "name": "Hello",
            "type": "page",
            "url": "/test",
          },
          {
            "$id": "nested",
            "children": [
              {
                "$id": "nested/test.mdx",
                "name": "Nested Page",
                "type": "page",
                "url": "/nested/test",
              },
            ],
            "name": "Nested",
            "type": "folder",
          },
        ],
        "name": "Docs English",
      }
    `);

  expect(removeUndefined(result.pageTree['cn'], true), 'Page Tree')
    .toMatchInlineSnapshot(`
      {
        "$id": "cn",
        "children": [
          {
            "$id": "test.mdx",
            "name": "Hello Chinese",
            "type": "page",
            "url": "/cn/test",
          },
          {
            "$id": "nested",
            "children": [
              {
                "$id": "nested/test.mdx",
                "name": "Nested Page Chinese",
                "type": "page",
                "url": "/cn/nested/test",
              },
            ],
            "name": "Nested",
            "type": "folder",
          },
        ],
        "name": "Docs Chinese",
      }
    `);

  expect(result.getPages().length).toBe(2);
  expect(result.getPage(['test'])?.url).toBe('/test');
  expect(result.getPage(['test'], 'cn')?.url).toBe('/cn/test');
});

test('Loader: Without meta.json', () => {
  const result = loader({
    baseUrl: '/',
    pageTree: {
      noRef: true,
    },
    source: {
      files: [
        {
          type: 'page',
          path: 'test.mdx',
          data: {
            title: 'Hello',
          },
        },
        {
          type: 'page',
          path: 'hello/index.mdx',
          data: {
            title: 'Hello',
          },
        },
      ],
    },
  });

  expect(removeUndefined(result.pageTree, true), 'Page Tree')
    .toMatchInlineSnapshot(`
      {
        "$id": "root",
        "children": [
          {
            "$id": "test.mdx",
            "name": "Hello",
            "type": "page",
            "url": "/test",
          },
          {
            "$id": "hello",
            "children": [],
            "index": {
              "$id": "hello/index.mdx",
              "name": "Hello",
              "type": "page",
              "url": "/hello",
            },
            "name": "Hello",
            "type": "folder",
          },
        ],
        "name": "",
      }
    `);
});

test('Loader: Rest operator', () => {
  const result = loader({
    baseUrl: '/',
    pageTree: {
      noRef: true,
    },
    source: {
      files: [
        {
          type: 'meta',
          path: 'meta.json',
          data: {
            pages: ['z...a'],
          },
        },
        {
          type: 'page',
          path: '1-2.mdx',
          data: {
            title: '1.2',
          },
        },
        {
          type: 'page',
          path: '2-2.mdx',
          data: {
            title: '2.2',
          },
        },
      ],
    },
  });

  expect(removeUndefined(result.pageTree, true), 'Page Tree')
    .toMatchInlineSnapshot(`
      {
        "$id": "root",
        "children": [
          {
            "$id": "2-2.mdx",
            "name": "2.2",
            "type": "page",
            "url": "/2-2",
          },
          {
            "$id": "1-2.mdx",
            "name": "1.2",
            "type": "page",
            "url": "/1-2",
          },
        ],
        "name": "",
      }
    `);
});

const i18nSource2: Source<SourceConfig> = {
  files: [
    {
      type: 'page',
      path: 'en/test.mdx',
      data: {
        title: 'Hello',
      },
    },
    {
      type: 'page',
      path: 'cn/test.mdx',
      data: {
        title: 'Hello Chinese',
      },
    },
    {
      type: 'meta',
      path: 'en/meta.json',
      data: {
        title: 'Docs English',
        pages: ['test', 'nested'],
      },
    },
    {
      type: 'meta',
      path: 'cn/meta.json',
      data: {
        title: 'Docs Chinese',
        pages: ['test', 'nested'],
      },
    },
    {
      type: 'page',
      path: 'en/nested/test.mdx',
      data: {
        title: 'Nested Page',
      },
    },
    {
      type: 'page',
      path: 'cn/nested/test.mdx',
      data: {
        title: 'Nested Page Chinese',
      },
    },
    {
      type: 'meta',
      path: 'cn/nested/meta.json',
      data: {
        title: 'Nested Chinese',
      },
    },
  ],
};
test('Internationalized Routing: dir', () => {
  const result = loader({
    baseUrl: '/',
    i18n: {
      parser: 'dir',
      languages: ['cn', 'en'],
      defaultLanguage: 'en',
    },
    source: i18nSource2,
  });

  expect(removeUndefined(result.pageTree['en'], true), 'Page Tree')
    .toMatchInlineSnapshot(`
      {
        "$id": "en",
        "children": [
          {
            "$id": "test.mdx",
            "$ref": {
              "file": "test.mdx",
            },
            "name": "Hello",
            "type": "page",
            "url": "/en/test",
          },
          {
            "$id": "nested",
            "children": [
              {
                "$id": "nested/test.mdx",
                "$ref": {
                  "file": "nested/test.mdx",
                },
                "name": "Nested Page",
                "type": "page",
                "url": "/en/nested/test",
              },
            ],
            "name": "Nested",
            "type": "folder",
          },
        ],
        "name": "Docs English",
      }
    `);

  expect(removeUndefined(result.pageTree['cn'], true), 'Page Tree')
    .toMatchInlineSnapshot(`
      {
        "$id": "cn",
        "children": [
          {
            "$id": "test.mdx",
            "$ref": {
              "file": "test.mdx",
            },
            "name": "Hello Chinese",
            "type": "page",
            "url": "/cn/test",
          },
          {
            "$id": "nested",
            "children": [
              {
                "$id": "nested/test.mdx",
                "$ref": {
                  "file": "nested/test.mdx",
                },
                "name": "Nested Page Chinese",
                "type": "page",
                "url": "/cn/nested/test",
              },
            ],
            "name": "Nested",
            "type": "folder",
          },
        ],
        "name": "Docs Chinese",
      }
    `);
});
