import { map } from '@/.map';
import { createMDXSource } from 'next-docs-mdx';
import { loader } from 'next-docs-zeta/source';

export const { getPage, getPages, pageTree } = loader({
  baseUrl: '/docs',
  rootDir: 'docs',
  source: createMDXSource(map),
});
