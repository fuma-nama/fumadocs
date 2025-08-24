import { parseFilePath, parseFolderPath } from '@/source/path';
import { describe, expect, test } from 'vitest';
import type { Root } from '@/source/page-tree/definitions';
import { findNeighbour } from '@/utils/page-tree';
import { PageTree } from '../dist/server';
import { getBreadcrumbItems } from '@/breadcrumb';
import { joinPath, splitPath } from '@/utils/path';

test('Find Neighbours', () => {
  const tree: Root = {
    name: 'Docs',
    children: [
      {
        type: 'folder',
        name: 'Custom',
        children: [{ type: 'page', name: 'hello', url: '/hello' }],
      },
      { type: 'page', name: 'world', url: '/world' },
      { type: 'page', name: 'user', url: '/user' },
    ],
  };

  expect(findNeighbour(tree, '/hello')).toStrictEqual({
    previous: undefined,
    next: { type: 'page', name: 'world', url: '/world' },
  });

  expect(findNeighbour(tree, '/world')).toStrictEqual({
    previous: { type: 'page', name: 'hello', url: '/hello' },
    next: { type: 'page', name: 'user', url: '/user' },
  });

  expect(findNeighbour(tree, '/user')).toStrictEqual({
    previous: { type: 'page', name: 'world', url: '/world' },
    next: undefined,
  });
});

describe('Path utilities', () => {
  test('parse file path', () => {
    expect(parseFilePath('test.mdx')).toMatchInlineSnapshot(`
      {
        "dirname": "",
        "ext": ".mdx",
        "flattenedPath": "test",
        "name": "test",
        "path": "test.mdx",
      }
    `);

    expect(parseFilePath('nested/test.mdx')).toMatchInlineSnapshot(`
      {
        "dirname": "nested",
        "ext": ".mdx",
        "flattenedPath": "nested/test",
        "name": "test",
        "path": "nested/test.mdx",
      }
    `);

    expect(parseFilePath('nested/test.cn.mdx')).toMatchInlineSnapshot(`
      {
        "dirname": "nested",
        "ext": ".mdx",
        "flattenedPath": "nested/test.cn",
        "name": "test.cn",
        "path": "nested/test.cn.mdx",
      }
    `);

    expect(parseFilePath('nested/test.01.mdx')).toMatchInlineSnapshot(`
      {
        "dirname": "nested",
        "ext": ".mdx",
        "flattenedPath": "nested/test.01",
        "name": "test.01",
        "path": "nested/test.01.mdx",
      }
    `);
  });

  test('parse folder path', () => {
    expect(parseFolderPath('')).toMatchInlineSnapshot(`
      {
        "dirname": "",
        "name": "",
        "path": "",
      }
    `);

    expect(parseFolderPath('nested/nested')).toMatchInlineSnapshot(`
      {
        "dirname": "nested",
        "name": "nested",
        "path": "nested/nested",
      }
    `);
  });

  test('resolve paths', () => {
    expect(joinPath('a', 'b')).toBe('a/b');
    expect(joinPath('/a', '')).toBe('a');
    expect(joinPath('a/', '/b')).toBe('a/b');

    expect(joinPath('a/', '../b/c')).toBe('b/c');
    expect(joinPath('a/', './b/c')).toBe('a/b/c');
  });

  test('split paths', () => {
    expect(splitPath('a/b/c')).toEqual(['a', 'b', 'c']);
    expect(splitPath('a//c')).toEqual(['a', 'c']);
    expect(splitPath('/a/c')).toEqual(['a', 'c']);
  });
});

test('Breadcrumbs', () => {
  const tree: PageTree.Root = {
    name: 'Hello World',
    children: [
      {
        type: 'page',
        name: 'Hello World',
        url: '/docs',
      },
      {
        type: 'page',
        name: 'Hello World',
        url: '/docs/test',
      },
      {
        type: 'page',
        name: 'Fumadocs',
        url: '/docs/test2',
      },
      {
        type: 'folder',
        name: 'Hello World',
        index: {
          type: 'page',
          name: 'World',
          url: '/docs/folder',
        },
        children: [],
      },
    ],
  };

  expect(getBreadcrumbItems('/docs/folder', tree)).toStrictEqual([
    { name: 'World', url: '/docs/folder' },
  ]);
});
