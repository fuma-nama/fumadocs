import { Source } from '@/source';

export const source: Source = {
  files: [
    {
      type: 'meta',
      path: 'meta.json',
      data: {
        pages: ['a'],
      },
    },
    {
      type: 'meta',
      path: 'a/b/meta.json',
      data: {
        pages: ['../', '...'],
      },
    },
    {
      type: 'page',
      path: 'a/page.mdx',
      data: {
        title: 'First Page',
      },
    },
    {
      type: 'page',
      path: 'a/b/page.mdx',
      data: {
        title: 'Second Page',
      },
    },
  ],
};
