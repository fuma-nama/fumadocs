import { getCollection } from 'astro:content';
import { loader } from 'fumadocs-core/source';
import { toFumadocsSource } from '@fumadocs/astro/source';
import { i18n } from './i18n';

export const source = loader({
  source: toFumadocsSource(await getCollection('docs'), await getCollection('meta')),
  baseUrl: '/docs',
  i18n,
});
