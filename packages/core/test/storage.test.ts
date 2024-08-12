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
    storage.write('meta.json', 'meta', {
      data: {},
    });

    expect(storage.list().length).toBe(2);
  });

  test('Reading', () => {
    expect(storage.read('test', 'page')).toBeDefined();
    expect(storage.read('meta', 'meta')).toBeDefined();
  });

  test('Nested Directories', () => {
    storage.write('dir1/dir2/meta.json', 'meta', {
      data: {},
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
                "title": "Nested Page",
              },
              "slugs": [
                "nested",
                "test",
              ],
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
                  "flattenedPath": "nested/nested/test",
                  "locale": undefined,
                  "name": "test",
                  "path": "nested/nested/test.mdx",
                },
                "format": "page",
              },
            ],
            "file": {
              "dirname": "nested",
              "flattenedPath": "nested/nested",
              "locale": undefined,
              "name": "nested",
              "path": "nested/nested",
            },
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

test('Building File Graph - with root directory', () => {
  const storage = loadFiles(demoFiles, {
    rootDir: 'nested',
    getSlugs,
  });

  expect(storage.root().children).toMatchInlineSnapshot(`
    [
      {
        "data": {
          "data": {
            "title": "Nested Page",
          },
          "slugs": [
            "test",
          ],
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
                "nested",
                "test",
              ],
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
