import { loader } from '../src/source';
import { Storage } from '../src/source/file-system';
import { parseFilePath, parseFolderPath } from '../src/source/path';
import { describe, expect, test } from 'vitest';

describe('Virtual Storage', () => {
  const storage = new Storage();

  test('Writing', () => {
    storage.write('test.mdx', {
      type: 'page',
      data: { title: 'Hello' },
      slugs: ['test'],
      url: '/test',
    });
    storage.write('meta.json', { type: 'meta', data: { pages: ['test'] } });

    expect(storage.list().length).toBe(2);
  });

  test('Reading', () => {
    expect(storage.read('test')).toBeDefined();
    expect(storage.read('meta')).toBeDefined();
  });

  test('Nested Directories', () => {
    storage.write('dir1/dir2/meta.json', {
      type: 'meta',
      data: { pages: ['test'] },
    });

    expect(storage.readDir('dir1')).toBeDefined();
    expect(storage.readDir('dir1/dir2')).toBeDefined();
    expect(storage.read('dir1/dir2/meta')).toBeDefined();
  });
});

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
