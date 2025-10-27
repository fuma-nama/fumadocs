import type { Source } from '@/source';

export const source: Source = {
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
