import type { GithubCache } from './types';

const msg = `Did you forget to use the Next.js plugin from '@fumadocs/mdx-remote' in your 'next.config.js'?
See [TBD] to learn how to setup the Fumadocs Github integration.`;

export const compileMDX: GithubCache['compileMDX'] = () => {
  console.error(msg);
  throw new Error(msg);
};

export const githubLoader: GithubCache['fumadocsLoader'] = () => {
  console.error(msg);
  throw new Error(msg);
};
