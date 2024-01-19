import { allDocs, allMeta } from 'contentlayer/generated';
import { createContentlayerSource } from 'fumadocs-core/contentlayer';
import { loader } from 'fumadocs-core/source';

export const { pageTree, getPages, getPage } = loader({
  baseUrl: '/docs',
  rootDir: 'docs',
  source: createContentlayerSource(allMeta, allDocs),
});
