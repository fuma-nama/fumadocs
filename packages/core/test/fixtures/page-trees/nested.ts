import type { Source, SourceConfig } from '@/source';

export const source: Source<SourceConfig> = {
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
      path: 'hidden.mdx',
      data: {
        title: 'Hidden',
      },
    },
    {
      type: 'meta',
      path: 'meta.json',
      data: {
        pages: [
          '...',
          '!hidden',
          'nested',
          '[Text](https://google.com)',
          '[Icon][Text](https://google.com)',
        ],
      },
    },
    {
      type: 'page',
      path: '/hello/index.mdx',
      data: {
        title: 'Another hello page',
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
      path: '/(nested)/hello.mdx',
      data: {
        title: 'Route Group Page',
      },
    },
  ],
};
