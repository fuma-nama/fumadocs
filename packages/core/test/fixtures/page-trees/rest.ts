import { Source } from '@/source';

export const source: Source = {
  files: [
    {
      type: 'meta',
      path: 'meta.json',
      data: {
        pages: ['z...a'],
      },
    },
    {
      type: 'page',
      path: '1-2.mdx',
      data: {
        title: '1.2',
      },
    },
    {
      type: 'page',
      path: '2-2.mdx',
      data: {
        title: '2.2',
      },
    },
  ],
};

// priority to determine the owner of a node (from top to low):
// 1. directly specified (e.g. path in `pages`).
// 2. extracted (e.g. `...dir`).
// 3. rest `...`.
export const withPriority: Source = {
  files: [
    {
      type: 'page',
      path: '/a/hello.mdx',
      data: {
        title: 'Page A',
      },
    },
    {
      type: 'meta',
      path: 'b/meta.json',
      data: {
        pages: ['test', '...'],
      },
    },
    {
      type: 'page',
      path: '/b/index.mdx',
      data: {
        title: 'Page B (Index)',
      },
    },
    {
      type: 'page',
      path: '/b/hello.mdx',
      data: {
        title: 'Page B (Hello)',
      },
    },
    {
      type: 'page',
      path: '/b/test.mdx',
      data: {
        title: 'Page B (Test)',
      },
    },
    {
      type: 'meta',
      path: 'c/meta.json',
      data: {
        pages: ['test', '...../b'],
      },
    },
    {
      type: 'page',
      path: '/c/test.mdx',
      data: {
        title: 'Page C',
      },
    },
  ],
};
