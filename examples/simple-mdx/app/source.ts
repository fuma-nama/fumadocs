import { map } from '@/_map';
import { fromMap } from 'next-docs-mdx/map';

export const { getPage, pages, tree } = fromMap(map, {
  baseUrl: '/docs',
  rootDir: 'docs',
});
