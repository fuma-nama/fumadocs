import { createMDXSource } from 'fumadocs-mdx';
import { loader } from 'fumadocs-core/source';
import { i18n } from '@/i18n';
import { docs, meta } from '@/.source';

export const source = loader({
  baseUrl: '/',
  source: createMDXSource(docs, meta),
  i18n,
});
