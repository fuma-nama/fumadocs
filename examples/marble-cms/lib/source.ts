import {
  loader,
  type MetaData,
  type Source,
  type VirtualFile,
} from 'fumadocs-core/source';
import { getPosts } from '@/lib/query';
import type { Post } from '@/lib/types';
import type { StructuredData } from 'fumadocs-core/mdx-plugins';

const PageTag = 'page';
const RootCategory = 'docs';

export const source = loader({
  baseUrl: '/docs',
  source: await createMarbleSource(),
});

async function createMarbleSource(): Promise<
  Source<{
    metaData: MetaData;
    pageData: Post;
  }>
> {
  return {
    files: (await getPosts()).posts.flatMap((post) => {
      if (!post.tags.some((tag) => tag.slug === PageTag)) return [];

      const slugs = post.slug.split('/');
      const isIndex = slugs.at(-1) === 'index';
      const path: string[] = [];

      if (post.category.slug !== RootCategory) {
        path.push(post.category.slug);
      }

      path.push(isIndex ? 'index' : post.id);

      return {
        path: path.join('/'),
        slugs: isIndex ? slugs.slice(0, -1) : slugs,
        data: {
          ...post,
          get structuredData() {
            return getStructuredData(post);
          },
        },
        type: 'page',
      } satisfies VirtualFile;
    }),
  };
}

function getStructuredData(post: Post): StructuredData {
  // simplified implementation, it's up to you
  return {
    headings: [],
    contents: [
      {
        content: post.content,
        heading: undefined,
      },
    ],
  };
}
