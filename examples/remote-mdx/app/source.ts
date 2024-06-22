import { githubLoader, compileMDX } from '@fumadocs/mdx-remote/github/source';

export const { pageTree, getPages, getPage, getSearchIndexes } =
  await githubLoader({
    /* pass your own options here */
  });

export { compileMDX };
