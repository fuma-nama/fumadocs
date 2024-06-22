import type { GithubCache } from './types';
import type { FumadocsLoader } from './create';

const msg = `Did you forget to use the Next.js plugin from '@fumadocs/mdx-remote' in your 'next.config.js'?
See [TBD] to learn how to setup the Fumadocs Github integration.`;
throw new Error(msg);

declare const githubLoader: FumadocsLoader<true>;
declare const createGithubWebhookAPI: (
  ...args: Parameters<GithubCache['createGithubWebhookAPI']>
) => Promise<ReturnType<GithubCache['createGithubWebhookAPI']>>;
declare const compileMDX: GithubCache['compileMDX'];

export { createGithubWebhookAPI, compileMDX, githubLoader };
