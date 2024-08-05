import { expect, test } from 'vitest';
import { createGetUrl, getSlugs, loader } from '@/source/loader';
import { parseFilePath } from '@/source';

test('Get Slugs', () => {
  expect(getSlugs(parseFilePath('path/to/file'))).toStrictEqual([
    'path',
    'to',
    'file',
  ]);
  expect(getSlugs(parseFilePath('path/(group)/file'))).toStrictEqual([
    'path',
    'file',
  ]);

  expect(getSlugs(parseFilePath(''))).toStrictEqual([]);
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

test('Page Tree: Simple', () => {
  const result = loader({
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

test('Page Tree: Nested Directories', async () => {
  const result = loader({
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
            pages: ['...', '!hidden', 'nested', '[Text](https://google.com)'],
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

test('Page Tree: Internationalized Routing', () => {
  const result = loader({
    languages: ['cn', 'en'],
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
    },
  });

  expect(result.pageTree['en'], 'Page Tree').toMatchInlineSnapshot(`
    {
      "children": [
        {
          "name": "Hello",
          "type": "page",
          "url": "/en/test",
        },
        {
          "children": [
            {
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
  expect(result.getPage(['test'])).toBeDefined();
  expect(result.getPage(['test'], 'cn')).toBeDefined();
});
