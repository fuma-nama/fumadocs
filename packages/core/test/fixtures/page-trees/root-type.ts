import type { StaticSource } from '@/source';

export const source: StaticSource = {
  files: [
    {
      type: 'meta',
      path: 'v1/meta.json',
      data: {
        title: '1.0.0',
        root: 'version',
        pages: ['index', 'guide'],
      },
    },
    {
      type: 'page',
      path: 'v1/index.mdx',
      data: {
        title: 'Introduction',
      },
    },
    {
      type: 'page',
      path: 'v1/guide.mdx',
      data: {
        title: 'Guide',
      },
    },
    {
      type: 'meta',
      path: 'v2/meta.json',
      data: {
        title: '2.0.0',
        root: 'version',
        pages: ['index', 'guide'],
      },
    },
    {
      type: 'page',
      path: 'v2/index.mdx',
      data: {
        title: 'Introduction',
      },
    },
    {
      type: 'page',
      path: 'v2/guide.mdx',
      data: {
        title: 'Guide',
      },
    },
  ],
};
