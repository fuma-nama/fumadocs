import { createGithubWebhookAPI } from '@fumadocs/mdx-remote/github/next';

export const { POST } = createGithubWebhookAPI({
  ref: 'dev',
  secret: 'example_secret',
});
