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

  expect(result.pageTree, 'Page Tree').toMatchInlineSnapshot(`
    {
      "children": [
        {
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
    icon: (v) => v as any,
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

  expect(result.pageTree, 'Page Tree').toMatchInlineSnapshot(`
    {
      "children": [
        {
          "name": "Hello",
          "type": "page",
          "url": "/test",
        },
        {
          "children": [
            {
              "name": "Route Group Page",
              "type": "page",
              "url": "/hello",
            },
          ],
          "name": "Nested",
          "type": "folder",
        },
        {
          "children": [
            {
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
      path: 'meta.json',
      data: {
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
      path: '/nested/test.mdx',
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

  expect(result.pageTree['en'], 'Page Tree').toMatchInlineSnapshot(`
    {
      "children": [
        {
          "$ref": {
            "file": "test.mdx",
          },
          "name": "Hello",
          "type": "page",
          "url": "/en/test",
        },
        {
          "$ref": {
            "metaFile": undefined,
          },
          "children": [
            {
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
      "name": "",
    }
  `);

  expect(result.pageTree['cn'], 'Page Tree').toMatchInlineSnapshot(`
    {
      "children": [
        {
          "$ref": {
            "file": "test.cn.mdx",
          },
          "name": "Hello Chinese",
          "type": "page",
          "url": "/cn/test",
        },
        {
          "$ref": {
            "metaFile": "nested/meta.cn.json",
          },
          "children": [
            {
              "$ref": {
                "file": "nested/test.cn.mdx",
              },
              "name": "Nested Page Chinese",
              "type": "page",
              "url": "/cn/nested/test",
            },
          ],
          "name": "Nested Chinese",
          "type": "folder",
        },
      ],
      "name": "Docs Chinese",
    }
  `);

  expect(result.getPages().length).toBe(2);
  expect(result.getPage(['test'])?.url).toBe('/en/test');
  expect(result.getPage(['test'], 'cn')?.url).toBe('/cn/test');
});

test('Internationalized Routing: Hide Prefix', () => {
  const result = loader({
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

  expect(result.pageTree['en'], 'Page Tree').toMatchInlineSnapshot(`
    {
      "children": [
        {
          "name": "Hello",
          "type": "page",
          "url": "/test",
        },
        {
          "children": [
            {
              "name": "Nested Page",
              "type": "page",
              "url": "/nested/test",
            },
          ],
          "name": "Nested",
          "type": "folder",
        },
      ],
      "name": "",
    }
  `);

  expect(result.pageTree['cn'], 'Page Tree').toMatchInlineSnapshot(`
    {
      "children": [
        {
          "name": "Hello Chinese",
          "type": "page",
          "url": "/cn/test",
        },
        {
          "children": [
            {
              "name": "Nested Page Chinese",
              "type": "page",
              "url": "/cn/nested/test",
            },
          ],
          "name": "Nested Chinese",
          "type": "folder",
        },
      ],
      "name": "Docs Chinese",
    }
  `);

  expect(result.getPages().length).toBe(2);
  expect(result.getPage(['test'])?.url).toBe('/en/test');
  expect(result.getPage(['test'], 'cn')?.url).toBe('/cn/test');
});
