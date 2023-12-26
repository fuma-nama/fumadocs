import { load } from '@/source/load';
import { parseFilePath, parseFolderPath } from '@/source/path';
import { describe, expect, test } from 'vitest';

describe('Building File Graph', () => {
  test('Simple', async () => {
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
    });

    expect(result.storage).toEqual({
      type: 'root',
      children: [
        expect.objectContaining({
          type: 'page',
          file: parseFilePath('test.mdx'),
        }),
        expect.objectContaining({
          type: 'meta',
          file: parseFilePath('meta.json'),
        }),
      ],
    });
  });

  test('Nested Directories', async () => {
    const result = await load({
      getUrl(slugs, locale) {
        return '';
      },
      getSlugs(info) {
        return [];
      },
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

    expect(result.storage).toEqual({
      type: 'root',
      children: [
        expect.objectContaining({
          type: 'page',
          file: parseFilePath('test.mdx'),
        }),
        expect.objectContaining({
          type: 'meta',
          file: parseFilePath('meta.json'),
        }),
        expect.objectContaining({
          type: 'folder',
          file: parseFolderPath('nested'),
          children: [
            expect.objectContaining({
              type: 'page',
              file: parseFilePath('nested/test.mdx'),
            }),
          ],
        }),
      ],
    });
  });

  test('Complicated Directories', async () => {
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

    expect(result.storage).toEqual({
      type: 'root',
      children: [
        expect.objectContaining({
          type: 'page',
          file: parseFilePath('test.mdx'),
        }),
        expect.objectContaining({
          type: 'folder',
          file: parseFolderPath('nested'),
          children: [
            expect.objectContaining({
              type: 'page',
              file: parseFilePath('nested/test.mdx'),
            }),
            expect.objectContaining({
              type: 'folder',
              file: parseFolderPath('nested/nested'),
              children: [
                expect.objectContaining({
                  type: 'page',
                  file: parseFilePath('nested/nested/test.mdx'),
                }),
              ],
            }),
          ],
        }),
      ],
    });
  });
});
