import { Storage } from '@/source/file-system';
import { parseFilePath, parseFolderPath } from '@/source/path';
import { describe, expect, test } from 'vitest';
import { VirtualFile, loadFiles } from '@/source/load-files';

describe('Virtual Storage', () => {
  const storage = new Storage();

  test('Writing', () => {
    storage.write('test.mdx', 'page', {});
    storage.write('meta.json', 'meta', {});

    expect(storage.list().length).toBe(2);
  });

  test('Reading', () => {
    expect(storage.read('test', 'page')).toBeDefined();
    expect(storage.read('meta', 'meta')).toBeDefined();
  });

  test('Nested Directories', () => {
    storage.write('dir1/dir2/meta.json', 'meta', {
      data: 'Hello',
    });

    expect(storage.readDir('dir1')).toBeDefined();
    expect(storage.readDir('dir1/dir2')).toBeDefined();
    expect(storage.read('dir1/dir2/meta', 'meta')).toBeDefined();
  });
});

const demoFiles: VirtualFile[] = [
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
];

test('Building File Graph', () => {
  const storage = loadFiles(demoFiles, {
    rootDir: '',
    getSlugs: () => [''],
    getUrl: () => '',
  });

  expect(storage.root().children).toEqual([
    expect.objectContaining({
      format: 'page',
      file: parseFilePath('test.mdx'),
    }),
    expect.objectContaining({
      file: parseFolderPath('nested'),
      children: [
        expect.objectContaining({
          format: 'page',
          file: parseFilePath('nested/test.mdx'),
        }),
        expect.objectContaining({
          file: parseFolderPath('nested/nested'),
          children: [
            expect.objectContaining({
              format: 'page',
              file: parseFilePath('nested/nested/test.mdx'),
            }),
          ],
        }),
      ],
    }),
  ]);
});

test('Building File Graph - with root directory', () => {
  const storage = loadFiles(demoFiles, {
    rootDir: 'nested',
    getSlugs: () => [''],
    getUrl: () => '',
  });

  expect(storage.root().children).toMatchInlineSnapshot(`
    [
      {
        "data": {
          "data": {
            "title": "Nested Page",
          },
          "slugs": [
            "",
          ],
          "url": "",
        },
        "file": {
          "dirname": "",
          "flattenedPath": "test",
          "locale": undefined,
          "name": "test",
          "path": "test.mdx",
        },
        "format": "page",
      },
      {
        "children": [
          {
            "data": {
              "data": {
                "title": "Nested Nested Page",
              },
              "slugs": [
                "",
              ],
              "url": "",
            },
            "file": {
              "dirname": "nested",
              "flattenedPath": "nested/test",
              "locale": undefined,
              "name": "test",
              "path": "nested/test.mdx",
            },
            "format": "page",
          },
        ],
        "file": {
          "dirname": "",
          "flattenedPath": "nested",
          "locale": undefined,
          "name": "nested",
          "path": "nested",
        },
      },
    ]
  `);
});
