import { Marble } from '@usemarble/sdk';
import type { Post } from '@usemarble/sdk/models';

export async function getPosts(): Promise<Post[]> {
  const apiKey = process.env.MARBLE_API_KEY;
  if (!apiKey) {
    throw new Error(
      'MARBLE_API_KEY is required. Copy .env.example to .env.local and set your public API key.',
    );
  }

  const marble = new Marble({ apiKey });
  const pages = await marble.posts.list({ limit: 100 });
  const posts: Post[] = [];

  for await (const page of pages) {
    posts.push(...page.result.posts);
  }

  return posts;
}
