import type { Source, SourceConfig } from '@/source';

export const source: Source<SourceConfig> = {
  files: [
    {
      type: 'page',
      path: 'en/test.mdx',
      data: {
        title: 'Hello',
      },
    },
    {
      type: 'page',
      path: 'cn/test.mdx',
      data: {
        title: 'Hello Chinese',
      },
    },
    {
      type: 'meta',
      path: 'en/meta.json',
      data: {
        title: 'Docs English',
        pages: ['test', 'nested'],
      },
    },
    {
      type: 'meta',
      path: 'cn/meta.json',
      data: {
        title: 'Docs Chinese',
        pages: ['test', 'nested'],
      },
    },
    {
      type: 'page',
      path: 'en/nested/test.mdx',
      data: {
        title: 'Nested Page',
      },
    },
    {
      type: 'page',
      path: 'cn/nested/test.mdx',
      data: {
        title: 'Nested Page Chinese',
      },
    },
    {
      type: 'meta',
      path: 'cn/nested/meta.json',
      data: {
        title: 'Nested Chinese',
      },
    },
  ],
};
