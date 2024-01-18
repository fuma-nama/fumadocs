import { map } from '@/.map';
import { createMDXSource } from '@fuma-docs/mdx';
import { loader } from '@fuma-docs/core/source';

export const { getPage, getPages, pageTree } = loader({
  baseUrl: '/docs',
  rootDir: 'docs',
  languages,
  source: createMDXSource(map),
});
