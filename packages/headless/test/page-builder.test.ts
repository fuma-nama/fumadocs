import { describe, expect, test } from 'vitest';
import { type Transformer, createPageTreeBuilder } from '@/source';
import type { PageTree } from '@/server/types';
import { load } from '@/source/load';

const pageTreeTransformer: Transformer = (ctx) => {
  ctx.data.pageTree = createPageTreeBuilder({
    storage: ctx.storage,
  }).build();
};

describe('Page Tree Builder', () => {
  test('Simple', () => {
    const result = load({
      files: [
        {
          type: 'page',
          path: 'test.mdx',
          data: {
            title: 'Hello',
            url: '/hello',
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
      transformers: [pageTreeTransformer],
    });

    expect(result.data.pageTree).toEqual({
      name: 'Docs',
      children: [{ type: 'page', name: 'Hello', url: '/hello' }],
    } satisfies PageTree);
  });

  test('Nested Directories', async () => {
    const result = load({
      files: [
        {
          type: 'page',
          path: 'test.mdx',
          data: {
            title: 'Hello',
            url: '/hello',
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
            url: '/nested/test',
          },
        },
      ],
      transformers: [pageTreeTransformer],
    });

    expect(result.data.pageTree).toEqual({
      name: 'Docs',
      children: [
        { type: 'page', name: 'Hello', url: '/hello' },
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
    } satisfies PageTree);
  });

  test('Internationalized Routing', () => {
    const result = load({
      files: [
        {
          type: 'page',
          path: 'test.mdx',
          data: {
            title: 'Hello',
            url: '/hello',
          },
        },
        {
          type: 'page',
          path: 'test.cn.mdx',
          data: {
            title: 'Hello Chinese',
            url: '/hello',
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
            url: '/nested/test',
          },
        },
        {
          type: 'page',
          path: '/nested/test.cn.mdx',
          data: {
            title: 'Nested Page Chinese',
            url: '/nested/test',
          },
        },
        {
          type: 'meta',
          path: '/nested/meta.cn.json',
          data: {
            title: 'Nested Chinese',
            pages: ['...'],
          },
        },
      ],
      transformers: [
        (ctx) => {
          ctx.data.pageTree = createPageTreeBuilder({
            storage: ctx.storage,
          }).buildI18n({ languages: ['cn'] })['cn'];
        },
      ],
    });

    expect(result.data.pageTree).toEqual({
      name: 'Docs Chinese',
      children: [
        { type: 'page', name: 'Hello Chinese', url: '/hello' },
        {
          type: 'folder',
          name: 'Nested Chinese',
          children: [
            {
              type: 'page',
              name: 'Nested Page Chinese',
              url: '/nested/test',
            },
          ],
        },
      ],
    } satisfies PageTree);
  });
});
