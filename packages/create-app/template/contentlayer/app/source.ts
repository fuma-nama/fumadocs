import { allDocs, allMeta } from 'contentlayer/generated';
import { createContentlayerSource } from 'fumadocs-contentlayer';
import { loader } from 'fumadocs-core/source';

export const { getPage, pageTree, getPages } = loader({
  baseUrl: '/docs',
  rootDir: 'docs',
  source: createContentlayerSource(allMeta, allDocs),
});
