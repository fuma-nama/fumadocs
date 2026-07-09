import type { StaticSource } from 'fumadocs-core/source';
import { loader } from 'fumadocs-core/source';
import { type CollectionEntry, getCollection } from 'astro:content';
import * as path from 'node:path';
import { structure, type StructuredData } from 'fumadocs-core/mdx-plugins';

export const source = loader({
  source: await createMySource(),
  baseUrl: '/',
});

export function getStructuredData(entry: CollectionEntry<'docs'>): StructuredData {
  return structure(entry.body);
}

export function getPageImage(slugs: string[]) {
  const segments = [...slugs, 'image.webp'];

  return {
    segments,
    url: `/og/docs/${segments.join('/')}`,
  };
}

async function createMySource() {
  const out: StaticSource<{
    metaData: CollectionEntry<'meta'>['data'];
    pageData: CollectionEntry<'docs'>['data'] & {
      _raw: CollectionEntry<'docs'>;
    };
  }> = {
    files: [],
  };

  for (const page of await getCollection('docs')) {
    const virtualPath = path.relative('content/docs', page.filePath!);

    out.files.push({
      type: 'page',
      path: virtualPath,
      data: {
        ...page.data,
        _raw: page,
      },
    });
  }

  for (const meta of await getCollection('meta')) {
    const virtualPath = path.relative('content/docs', meta.filePath!);

    out.files.push({
      type: 'meta',
      path: virtualPath,
      data: meta.data,
    });
  }

  return out;
}
