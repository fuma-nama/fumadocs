import { loader } from '@/source';
import { parseFilePath, parseFolderPath } from '@/source/path';
import { describe, expect, test } from 'vitest';

describe('Building File Graph', () => {
  test('Simple', () => {
    loader({
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
      transformers: [
        ({ storage }) => {
          expect(storage.root().children).toEqual([
            expect.objectContaining({
              type: 'page',
              file: parseFilePath('test.mdx'),
            }),
            expect.objectContaining({
              type: 'meta',
              file: parseFilePath('meta.json'),
            }),
          ]);
        },
      ],
    });
  });

  test('Nested Directories', async () => {
    loader({
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
      transformers: [
        ({ storage }) => {
          expect(storage.root().children).toEqual([
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
          ]);
        },
      ],
    });
  });

  test('Complicated Directories', async () => {
    loader({
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
            path: '/nested/test.mdx',
            data: {
              title: 'Nested Page',
            },
          },
          {
            type: 'page',
            path: '/nested/nested/test.mdx',
            data: {
              title: 'Nested Nested Page',
            },
          },
        ],
      },
      transformers: [
        ({ storage }) => {
          expect(storage.root().children).toEqual([
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
          ]);
        },
      ],
    });
  });
});
