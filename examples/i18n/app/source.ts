import { map } from '@/.map';
import { createMDXSource } from 'fumadocs-mdx';
import { loader } from 'fumadocs-core/source';
import { i18n } from '@/i18n';

export const { getPage, getPages, getLanguages, pageTree } = loader({
  baseUrl: '/',
  rootDir: 'docs',
  source: createMDXSource(map),
  i18n,
});
