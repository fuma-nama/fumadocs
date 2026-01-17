import { createFileSystemCache, defineStory } from '@fumadocs/story';
import { CalloutStory } from './client';

export const story = defineStory(import.meta.url, {
  Component: CalloutStory,
  // use only on Vercel
  cache:
    process.env.NODE_ENV === 'production'
      ? createFileSystemCache('.next/fumadocs-story')
      : undefined,
  args: {
    initial: {
      title: 'This is a Callout',
    },
  },
});
