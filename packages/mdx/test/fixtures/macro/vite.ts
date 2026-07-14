import { defineCollections } from 'fumadocs-mdx/macro';

export const docs = defineCollections({
  type: 'doc',
  dir: 'test/fixtures/generate-index',
  postprocess: { extractLinkReferences: true },
});
