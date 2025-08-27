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

test('Loader: Allow duplicate pages when explicitly referenced twice', () => {
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
            pages: ['page1', 'page1', 'page2'],
          },
        },
        {
          type: 'page',
          path: 'page1.mdx',
          data: {
            title: 'Page 1',
          },
        },
        {
          type: 'page',
          path: 'page2.mdx',
          data: {
            title: 'Page 2',
          },
        },
      ],
    },
  });

  const treeChildren = result.pageTree.children;
  expect(treeChildren.length).toBe(3);
  expect(treeChildren[0].$id).toBe('page1.mdx');
  expect(treeChildren[1].$id).toBe('page1.mdx');
  expect(treeChildren[2].$id).toBe('page2.mdx');
});

test('Loader: No duplicate pages when referencing subfolder items and folder', () => {
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
            pages: [
              'index',
              'subfolder/page1', // Reference specific page in subfolder
              'subfolder/page2', // Reference another specific page
              'other-page',
              'subfolder', // Reference the entire folder
            ],
          },
        },
        {
          type: 'page',
          path: 'index.mdx',
          data: {
            title: 'Home',
          },
        },
        {
          type: 'page',
          path: 'other-page.mdx',
          data: {
            title: 'Other Page',
          },
        },
        {
          type: 'page',
          path: 'subfolder/page1.mdx',
          data: {
            title: 'Subfolder Page 1',
          },
        },
        {
          type: 'page',
          path: 'subfolder/page2.mdx',
          data: {
            title: 'Subfolder Page 2',
          },
        },
        {
          type: 'page',
          path: 'subfolder/page3.mdx',
          data: {
            title: 'Subfolder Page 3',
          },
        },
      ],
    },
  });

  // Check that pages are not duplicated
  const pages = result.getPages();
  const pagePaths = pages.map((page) => page.slugs.join('/'));

  // Should have exactly 5 pages total
  expect(pages.length).toBe(5);

  // Check that each page appears only once
  const uniquePaths = new Set(pagePaths);
  expect(uniquePaths.size).toBe(pagePaths.length);

  // Verify all pages are present
  expect(pagePaths.sort()).toEqual([
    '', // index
    'other-page',
    'subfolder/page1',
    'subfolder/page2',
    'subfolder/page3',
  ]);

  // Check the page tree structure
  expect(removeUndefined(result.pageTree, true), 'Page Tree')
    .toMatchInlineSnapshot(`
      {
        "$id": "root",
        "children": [
          {
            "$id": "index.mdx",
            "name": "Home",
            "type": "page",
            "url": "/",
          },
          {
            "$id": "subfolder/page1.mdx",
            "name": "Subfolder Page 1",
            "type": "page",
            "url": "/subfolder/page1",
          },
          {
            "$id": "subfolder/page2.mdx",
            "name": "Subfolder Page 2",
            "type": "page",
            "url": "/subfolder/page2",
          },
          {
            "$id": "other-page.mdx",
            "name": "Other Page",
            "type": "page",
            "url": "/other-page",
          },
          {
            "$id": "subfolder",
            "children": [
              {
                "$id": "subfolder/page3.mdx",
                "name": "Subfolder Page 3",
                "type": "page",
                "url": "/subfolder/page3",
              },
            ],
            "name": "Subfolder",
            "type": "folder",
          },
        ],
        "name": "",
      }
    `);
});
