import { parseFilePath, parseFolderPath } from '@/source/path';
import { describe, expect, test } from 'vitest';
import type { Root } from '@/server/page-tree';
import { findNeighbour } from '@/server/page-tree-utils';
import { PageTree } from '../dist/server';
import { getBreadcrumbItems } from '@/breadcrumb';
import { resolvePath, splitPath } from '@/utils/path';

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
    expect(parseFilePath('test.mdx')).toEqual({
      dirname: '',
      name: 'test',
      flattenedPath: 'test',
      locale: undefined,
      path: 'test.mdx',
    });

    expect(parseFilePath('nested/test.mdx')).toEqual({
      dirname: 'nested',
      name: 'test',
      flattenedPath: 'nested/test',
      locale: undefined,
      path: 'nested/test.mdx',
    });

    expect(parseFilePath('nested/test.cn.mdx')).toEqual({
      dirname: 'nested',
      name: 'test',
      flattenedPath: 'nested/test.cn',
      locale: 'cn',
      path: 'nested/test.cn.mdx',
    });

    expect(parseFilePath('nested/test.01.mdx')).toEqual({
      dirname: 'nested',
      name: 'test.01',
      flattenedPath: 'nested/test.01',
      path: 'nested/test.01.mdx',
    });

    expect(parseFilePath('nested\\test.cn.mdx')).toEqual(
      parseFilePath('nested/test.cn.mdx'),
    );
  });

  test('parse folder path', () => {
    expect(parseFolderPath('nested')).toEqual({
      dirname: '',
      name: 'nested',
      flattenedPath: 'nested',
      locale: undefined,
      path: 'nested',
    });

    expect(parseFolderPath('nested/nested')).toEqual({
      dirname: 'nested',
      name: 'nested',
      flattenedPath: 'nested/nested',
      locale: undefined,
      path: 'nested/nested',
    });

    expect(parseFolderPath('nested\\nested')).toEqual(
      parseFolderPath('nested/nested'),
    );
  });

  test('resolve paths', () => {
    expect(resolvePath('a', 'b')).toBe('a/b');
    expect(resolvePath('/a', '')).toBe('a');
    expect(resolvePath('a/', '/b')).toBe('a/b');

    expect(resolvePath('a/', '../b/c')).toBe('b/c');
    expect(resolvePath('a/', './b/c')).toBe('a/b/c');
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
