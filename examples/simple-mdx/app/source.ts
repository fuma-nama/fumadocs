import { map } from '@/_map';
import { createMDXSource } from 'next-docs-mdx';
import { loader } from 'next-docs-zeta/source';

export const {
  getPage,
  getPages,
  pageTree: tree,
} = loader({
  baseUrl: '/docs',
  rootDir: 'docs',
  source: createMDXSource(map),
});
