import { getCollection } from 'astro:content';
import { loader } from 'fumadocs-core/source';
import type { SerializedPageTree } from 'fumadocs-core/source/client';
import { toFumadocsSource } from '@fumadocs/astro/source';
import { i18n } from './i18n';

export const source = loader({
  source: toFumadocsSource(await getCollection('docs'), await getCollection('meta')),
  baseUrl: '/docs',
  i18n,
});

// the same for every page of a language, serialize them once
export const pageTrees: Record<string, SerializedPageTree> = {};
for (const lang of i18n.languages)
  pageTrees[lang] = await source.serializePageTree(source.getPageTree(lang));
