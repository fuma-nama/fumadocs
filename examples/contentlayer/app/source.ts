import { allDocs, allMeta } from 'contentlayer/generated';
import { createContentlayerSource } from 'fumadocs-contentlayer';
import { loader } from '@maximai/fumadocs-core/source';

export const { pageTree, getPages, getPage } = loader({
  baseUrl: '/docs',
  rootDir: 'docs',
  source: createContentlayerSource(allMeta, allDocs),
});
