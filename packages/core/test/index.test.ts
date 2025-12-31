import { joinPath, splitPath } from '@/source/path';
import { describe, expect, test } from 'vitest';
import type { Root } from '@/page-tree/definitions';
import { findNeighbour } from '@/page-tree/utils';
import { getBreadcrumbItems } from '@/breadcrumb';
import { DefaultFormatter } from '@/i18n/middleware';
import { NextURL } from 'next/dist/server/web/next-url';

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
  const tree: Root = {
    name: 'Hello World',
    children: [
      {
        type: 'page',
        name: 'Introduction',
        url: '/',
      },
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

  expect(getBreadcrumbItems('/docs/folder', tree, { includePage: true })).toStrictEqual([
    { name: 'World', url: '/docs/folder' },
  ]);

  expect(getBreadcrumbItems('/invalid', tree)).toMatchInlineSnapshot(`[]`);
});

test('I18n: Format URL', () => {
  expect(DefaultFormatter.get(new NextURL('https://fumadocs.dev/en'))).toBe('en');
  expect(DefaultFormatter.get(new NextURL('https://fumadocs.dev/en/test'))).toBe('en');
  expect(DefaultFormatter.get(new NextURL('https://fumadocs.dev'))).toBeUndefined();
  expect(
    DefaultFormatter.get(
      new NextURL('https://fumadocs.dev/docs', {
        nextConfig: {
          basePath: '/docs',
        },
      }),
    ),
  ).toBeUndefined();
  expect(
    DefaultFormatter.get(
      new NextURL('https://fumadocs.dev/docs/en/test', {
        nextConfig: {
          basePath: '/docs',
        },
      }),
    ),
  ).toBe('en');

  expect(DefaultFormatter.add(new NextURL('https://fumadocs.dev'), 'cn').href).toBe(
    'https://fumadocs.dev/cn/',
  );
  expect(
    DefaultFormatter.add(
      new NextURL('https://fumadocs.dev/docs', {
        nextConfig: {
          basePath: '/docs',
        },
      }),
      'cn',
    ).href,
  ).toBe('https://fumadocs.dev/docs/cn/');

  expect(DefaultFormatter.remove(new NextURL('https://fumadocs.dev/en')).href).toBe(
    'https://fumadocs.dev/',
  );
  expect(DefaultFormatter.remove(new NextURL('https://fumadocs.dev/en/test/hello')).href).toBe(
    'https://fumadocs.dev/test/hello',
  );
  expect(
    DefaultFormatter.remove(
      new NextURL('https://fumadocs.dev/docs/en', {
        nextConfig: {
          basePath: '/docs',
        },
      }),
    ).href,
  ).toBe('https://fumadocs.dev/docs/');
});
