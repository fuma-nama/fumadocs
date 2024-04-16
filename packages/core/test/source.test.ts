import { expect, test } from 'vitest';
import { loader } from '@/source/loader';

test('Simple', () => {
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

test('Nested Directories', async () => {
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
            pages: ['test', 'nested', '[Text](https://google.com)'],
          },
        },
        {
          type: 'page',
          path: '/nested/test.mdx',
          data: {
            title: 'Nested Page',
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
  expect(result.getPages().length).toBe(2);
  expect(result.getPage(['nested', 'test'])).toBeDefined();
});

test('Internationalized Routing', () => {
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
          path: '/nested/meta.json',
          data: {
            title: 'Nested',
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
          "url": "/test",
        },
        {
          "children": [
            {
              "name": "Nested",
              "type": "page",
            },
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
              "name": "Nested Chinese",
              "type": "page",
            },
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
