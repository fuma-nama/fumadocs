import { describe, expect, test } from 'vitest';
import { loader } from '../src/source';

describe('Page Tree Builder', () => {
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

    expect(result.pageTree).toMatchInlineSnapshot(`
      {
        "children": [
          {
            "icon": undefined,
            "name": "Hello",
            "type": "page",
            "url": "/test",
          },
        ],
        "name": "",
      }
    `);
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
        ],
      },
    });

    expect(result.pageTree).toMatchInlineSnapshot(`
      {
        "children": [
          {
            "icon": undefined,
            "name": "Hello",
            "type": "page",
            "url": "/test",
          },
          {
            "children": [
              {
                "icon": undefined,
                "name": "Nested Page",
                "type": "page",
                "url": "/nested/test",
              },
            ],
            "defaultOpen": undefined,
            "icon": undefined,
            "index": undefined,
            "name": "Nested",
            "root": undefined,
            "type": "folder",
          },
        ],
        "name": "",
      }
    `);
  });

  test('Internationalized Routing', () => {
    const result = loader({
      languages: ['cn'],
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

    expect(result.pageTree['cn']).toMatchInlineSnapshot(`
      {
        "children": [
          {
            "icon": undefined,
            "name": "Hello Chinese",
            "type": "page",
            "url": "/cn/test",
          },
          {
            "children": [
              {
                "icon": undefined,
                "name": "Nested Page Chinese",
                "type": "page",
                "url": "/cn/nested/test",
              },
            ],
            "defaultOpen": undefined,
            "icon": undefined,
            "index": undefined,
            "name": "Nested Chinese",
            "root": undefined,
            "type": "folder",
          },
        ],
        "name": "Docs Chinese",
      }
    `);
  });
});
