import { describe, expect, test } from 'vitest';
import { loader } from '../src/source';
import type * as PageTree from '../src/server/page-tree';

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

    expect(result.pageTree).toEqual({
      name: '',
      children: [{ type: 'page', name: 'Hello', url: '/test' }],
    } satisfies PageTree.Root);
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

    expect(result.pageTree).toEqual({
      name: '',
      children: [
        { type: 'page', name: 'Hello', url: '/test' },
        {
          type: 'folder',
          name: 'Nested',
          children: [
            {
              type: 'page',
              name: 'Nested Page',
              url: '/nested/test',
            },
          ],
        },
      ],
    } satisfies PageTree.Root);
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

    expect(result.pageTree['cn']).toEqual({
      name: 'Docs Chinese',
      children: [
        { type: 'page', name: 'Hello Chinese', url: '/cn/test' },
        {
          type: 'folder',
          name: 'Nested Chinese',
          children: [
            {
              type: 'page',
              name: 'Nested Page Chinese',
              url: '/cn/nested/test',
            },
          ],
        },
      ],
    } satisfies PageTree.Root);
  });
});
