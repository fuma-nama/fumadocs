import { load } from '@/source/load';
import { describe, expect, test } from 'vitest';

describe('Building File Graph', () => {
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
    });

    expect(result.graph).toEqual({
      type: 'root',
      children: [
        {
          type: 'page',
          page: result.pages.find((page) => page.file.path === 'test.mdx'),
        },
        {
          type: 'meta',
          meta: result.metas.find((meta) => meta.file.path === 'meta.json'),
        },
      ],
    });
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
    });

    expect(result.graph).toEqual({
      type: 'root',
      children: [
        {
          type: 'page',
          page: result.pages.find((page) => page.file.path === 'test.mdx'),
        },
        {
          type: 'meta',
          meta: result.metas.find((meta) => meta.file.path === 'meta.json'),
        },
        {
          type: 'folder',
          name: 'nested',
          children: [
            {
              type: 'page',
              page: result.pages.find(
                (page) => page.file.path === 'nested/test.mdx',
              ),
            },
          ],
        },
      ],
    });
  });

  test('Complicated Directories', async () => {
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
          type: 'page',
          path: '/nested/test.mdx',
          data: {
            title: 'Nested Page',
            url: '/nested/test',
          },
        },
        {
          type: 'page',
          path: '/nested/nested/test.mdx',
          data: {
            title: 'Nested Nested Page',
            url: '/nested/nested/test',
          },
        },
      ],
    });

    expect(result.graph).toEqual({
      type: 'root',
      children: [
        {
          type: 'page',
          page: result.pages.find((page) => page.file.path === 'test.mdx'),
        },
        {
          type: 'folder',
          name: 'nested',
          children: [
            {
              type: 'page',
              page: result.pages.find(
                (page) => page.file.path === 'nested/test.mdx',
              ),
            },
            {
              type: 'folder',
              name: 'nested',
              children: [
                {
                  type: 'page',
                  page: result.pages.find(
                    (page) => page.file.path === 'nested/nested/test.mdx',
                  ),
                },
              ],
            },
          ],
        },
      ],
    });
  });
});
