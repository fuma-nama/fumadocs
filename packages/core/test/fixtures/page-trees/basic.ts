import { Source, SourceConfig } from '@/source';

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
      type: 'meta',
      path: 'meta.json',
      data: {
        pages: ['test'],
      },
    },
  ],
};
