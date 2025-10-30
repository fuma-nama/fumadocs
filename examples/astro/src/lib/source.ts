import type { MetaData, Source } from 'fumadocs-core/source';
import { loader } from 'fumadocs-core/source';
import { type CollectionEntry, getCollection } from 'astro:content';
import * as path from 'node:path';

export const source = loader({
  source: await createMySource(),
  baseUrl: '/',
});

async function createMySource(): Promise<
  Source<{
    metaData: MetaData;
    pageData: CollectionEntry<'docs'>['data'] & {
      _raw: CollectionEntry<'docs'>;
    };
  }>
> {
  const pages = await getCollection('docs');

  return {
    files: pages.map((page) => {
      const virtualPath = path.relative('content/docs', page.filePath!);
      return {
        type: 'page',
        path: virtualPath,
        data: {
          ...page.data,
          _raw: page,
        },
      };
    }),
  };
}
