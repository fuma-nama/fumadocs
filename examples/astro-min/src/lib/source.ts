import { getCollection } from 'astro:content';
import { loader } from 'fumadocs-core/source';
import { toFumadocsSource } from '@fumadocs/astro/source';

export const source = loader({
  source: toFumadocsSource(await getCollection('docs'), await getCollection('meta')),
  baseUrl: '/docs',
});

// the same for every page, serialize it once
export const pageTree = await source.serializePageTree(source.getPageTree());
