import { createSourceAuto } from '@fumadocs/mdx-remote/github';
import { loader } from 'fumadocs-core/source';
import { cache } from 'react';

export const getDocs = cache(async () => {
  return loader({
    source: await createSourceAuto({
      directory: 'content/docs',
      github: {
        owner: 'fuma-nama',
        repo: 'fumadocs',
        directory: 'examples/remote-mdx/content',
        treeSha: 'dev',
        accessToken: process.env.GITHUB_TOKEN ?? '',
      },
    }),
    baseUrl: '/docs',
  });
});
