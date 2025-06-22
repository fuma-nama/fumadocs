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
      path: 'test.cn.mdx',
      data: {
        title: 'Hello Chinese',
      },
    },
    {
      type: 'meta',
      path: 'meta.en.json',
      data: {
        title: 'Docs English',
        pages: ['test', 'nested'],
      },
    },
    {
      type: 'meta',
      path: 'meta.cn.json',
      data: {
        title: 'Docs Chinese',
        pages: ['test', 'nested'],
      },
    },
    {
      type: 'page',
      path: '/nested/test.en.mdx',
      data: {
        title: 'Nested Page',
      },
    },
    {
      type: 'page',
      path: '/nested/test.cn.mdx',
      data: {
        title: 'Nested Page Chinese',
      },
    },
    {
      type: 'meta',
      path: '/nested/meta.cn.json',
      data: {
        title: 'Nested Chinese',
      },
    },
  ],
};
