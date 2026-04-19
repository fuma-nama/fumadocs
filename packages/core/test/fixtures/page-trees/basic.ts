import type { StaticSource } from '@/source';

export const source: StaticSource = {
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
};

export const noMeta: StaticSource = {
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
      path: 'hello/index.mdx',
      data: {
        title: 'Hello',
      },
    },
  ],
};
