import { structure } from '@/mdx-plugins';
import { getTableOfContents, findNeighbour } from '@/server';

import type { Root } from '@/server/page-tree';
import { expect, test } from 'vitest';

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

test('Get TOC', async () => {
  const content = `# Heading 1

Some text here

## Heading 2

Some text here

### Heading 3`;

  expect(await getTableOfContents(content)).toStrictEqual([
    expect.objectContaining({ title: 'Heading 1', url: '#heading-1' }),
    expect.objectContaining({ title: 'Heading 2', url: '#heading-2' }),
    expect.objectContaining({ title: 'Heading 3', url: '#heading-3' }),
  ]);
});

test('Structure', async () => {
  const content = `# Heading 1

Some text here

## Heading 2

Some text here

### Heading 3`;

  expect(structure(content)).toMatchInlineSnapshot(`
    {
      "contents": [
        {
          "content": "Some text here",
          "heading": "heading-1",
        },
        {
          "content": "Some text here",
          "heading": "heading-2",
        },
      ],
      "headings": [
        {
          "content": "Heading 1",
          "id": "heading-1",
        },
        {
          "content": "Heading 2",
          "id": "heading-2",
        },
        {
          "content": "Heading 3",
          "id": "heading-3",
        },
      ],
    }
  `);
});
