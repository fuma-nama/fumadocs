import { Storage } from '@/source/file-system';
import { parseFilePath, parseFolderPath } from '@/source/path';
import { describe, expect, test } from 'vitest';
import { load } from '@/source/load';

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
    expect(storage.readPage('test')).toBeDefined();
    expect(storage.readMeta('meta')).toBeDefined();
  });

  test('Nested Directories', () => {
    storage.write('dir1/dir2/meta.json', {
      type: 'meta',
      data: { pages: ['test'] },
    });

    expect(storage.readDir('dir1')).toBeDefined();
    expect(storage.readDir('dir1/dir2')).toBeDefined();
    expect(storage.readMeta('dir1/dir2/meta')).toBeDefined();
  });
});

test('Building File Graph', () => {
  const result = load({
    rootDir: '',
    getSlugs: () => [''],
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
    getUrl: () => '',
  });

  expect(result.storage.root().children).toEqual([
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
});
