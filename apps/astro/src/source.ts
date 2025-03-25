import { loader } from 'fumadocs-core/source';
import path from 'node:path';
import { getCollection } from 'astro:content';

const posts = await getCollection('blog');

export const source = loader({
  baseUrl: '/blog',
  source: {
    files: posts.map((item) => ({
      type: 'page',
      path: path.relative('src/content/blog', item.filePath!),
      data: item.data,
    })),
  },
});
