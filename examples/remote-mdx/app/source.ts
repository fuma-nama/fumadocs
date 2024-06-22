// MUST USE "use server" DIRECTIVE OR PRODUCTION CHANGES WON'T WORK
'use server';

import { githubLoader, compileMDX } from '@fumadocs/mdx-remote/github/source';

export const { getPageTree, getPages, getPage, getSearchIndexes } =
  await githubLoader({
    /* pass your own options here */
  });

export { compileMDX };
