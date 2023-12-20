import { describe, expect, test } from 'vitest';
import { type Transformer, createPageTreeBuilder } from '@/source';
import type { PageTree } from '@/server/types';
import { load } from '@/source/load';

const pageTreeTransformer: Transformer = (ctx) => {
  ctx.data.pageTree = createPageTreeBuilder({
    metas: ctx.metas,
    pages: ctx.pages,
  }).build();
};

describe('Page Tree Builder', () => {
  test('Simple', async () => {
    const result = await load({
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
    const result = await load({
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
});
