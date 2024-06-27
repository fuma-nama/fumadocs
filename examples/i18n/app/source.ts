import { map } from '@/.map';
import { createMDXSource } from 'fumadocs-mdx';
import { loader } from 'fumadocs-core/source';
import { defaultLanguage, languages } from '@/i18n';

export const { getPage, getPages, getLanguages, pageTree } = loader({
  baseUrl: '/',
  rootDir: 'docs',
  languages,
  source: createMDXSource(map),
  defaultLanguage,
});
