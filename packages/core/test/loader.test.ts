import { expect, test } from 'vitest';
import { createGetUrl, getSlugs, loader } from '@/source/loader';
import { parseFilePath } from '@/source';
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

  expect(() => getSlugs(parseFilePath('nested/(page).mdx'))).toThrowError();
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

test('Loader: Simple', async () => {
  const result = loader({
    baseUrl: '/',
    pageTree: {
      noRef: true,
    },
    source: (await import('./fixtures/page-trees/basic')).source,
  });

  await expect(removeUndefined(result.pageTree, true)).toMatchFileSnapshot(
    './fixtures/page-trees/basic.tree.json',
  );

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
    source: (await import('./fixtures/page-trees/nested')).source,
  });

  await expect(removeUndefined(result.pageTree, true)).toMatchFileSnapshot(
    './fixtures/page-trees/nested.tree.json',
  );

  expect(result.getPages().map((page) => page.slugs.join('/')))
    .toMatchInlineSnapshot(`
      [
        "test",
        "hidden",
        "hello/index",
        "nested/test",
        "hello",
      ]
    `);
  // page in folder
  expect(result.getPage(['nested', 'test'])).toBeDefined();

  // page in folder group
  expect(result.getPage(['hello'])).toBeDefined();
});

test('Internationalized Routing', async () => {
  const result = loader({
    baseUrl: '/',
    i18n: {
      languages: ['cn', 'en'],
      defaultLanguage: 'en',
    },
    source: (await import('./fixtures/page-trees/i18n')).source,
  });

  await expect(removeUndefined(result.pageTree, true)).toMatchFileSnapshot(
    './fixtures/page-trees/i18n.tree.json',
  );
  await expect(
    removeUndefined(result.getLanguages(), true),
  ).toMatchFileSnapshot('./fixtures/page-trees/i18n.entries.json');
});

test('Internationalized Routing: Hide Prefix', async () => {
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
    source: (await import('./fixtures/page-trees/i18n')).source,
  });

  await expect(removeUndefined(result.pageTree, true)).toMatchFileSnapshot(
    './fixtures/page-trees/i18n-no-prefix.tree.json',
  );
  expect(result.getPages().length).toBe(2);
  expect(result.getPage(['test'])?.url).toBe('/test');
  expect(result.getPage(['test'], 'cn')?.url).toBe('/cn/test');
});

test('Internationalized Routing: dir', async () => {
  const result = loader({
    baseUrl: '/',
    i18n: {
      parser: 'dir',
      languages: ['cn', 'en'],
      defaultLanguage: 'en',
    },
    source: (await import('./fixtures/page-trees/i18n-dir')).source,
  });

  await expect(removeUndefined(result.pageTree, true)).toMatchFileSnapshot(
    './fixtures/page-trees/i18n-dir.tree.json',
  );
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
