import { createSourceAuto } from '@fumadocs/mdx-remote/github';
import { loader } from 'fumadocs-core/source';
import { cache } from 'react';

const token = process.env.GITHUB_TOKEN;

if (!token) throw new Error('`GITHUB_TOKEN` is missing');

export const getDocs = cache(async () => {
  return loader({
    source: await createSourceAuto({
      github: {
        owner: 'fuma-nama',
        repo: 'fumadocs',
        directory: 'examples/remote-mdx/content',
        treeSha: 'dev',
        accessToken: token,
      },
    }),
    rootDir: 'docs',
    baseUrl: '/docs',
  });
});
