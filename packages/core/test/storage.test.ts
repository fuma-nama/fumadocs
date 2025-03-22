import { Storage } from '@/source/file-system';
import { describe, expect, test } from 'vitest';
import { VirtualFile, loadFiles } from '@/source/load-files';
import { getSlugs } from '@/source/loader';

describe('Virtual Storage', () => {
  const storage = new Storage();

  test('Writing', () => {
    storage.write('test.mdx', 'page', {
      slugs: [],
      data: {
        title: 'Hello',
      },
    });
    storage.write('meta.json', 'meta', {});

    expect(storage.list().length).toBe(2);
  });

  test('Reading', () => {
    expect(storage.read('test', 'page')).toBeDefined();
    expect(storage.read('meta', 'meta')).toBeDefined();
  });

  test('Nested Directories', () => {
    storage.write('dir1/dir2/meta.json', 'meta', {});

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
    getSlugs,
  });

  expect(storage.root().children).toMatchInlineSnapshot(`
    [
      {
        "data": {
          "data": {
            "title": "Hello",
          },
          "slugs": [
            "test",
          ],
        },
        "file": {
          "dirname": "",
          "ext": ".mdx",
          "flattenedPath": "test",
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
                "title": "Nested Page",
              },
              "slugs": [
                "nested",
                "test",
              ],
            },
            "file": {
              "dirname": "nested",
              "ext": ".mdx",
              "flattenedPath": "nested/test",
              "name": "test",
              "path": "nested/test.mdx",
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
                    "nested",
                    "nested",
                    "test",
                  ],
                },
                "file": {
                  "dirname": "nested/nested",
                  "ext": ".mdx",
                  "flattenedPath": "nested/nested/test",
                  "name": "test",
                  "path": "nested/nested/test.mdx",
                },
                "format": "page",
              },
            ],
            "file": {
              "dirname": "nested",
              "name": "nested",
              "path": "nested/nested",
            },
          },
        ],
        "file": {
          "dirname": "",
          "name": "nested",
          "path": "nested",
        },
      },
    ]
  `);
});
