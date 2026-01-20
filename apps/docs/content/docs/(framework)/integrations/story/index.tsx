import { createFileSystemCache, defineStoryFactory } from '@fumadocs/story';
import { CalloutStory } from './client';

const { defineStory } = defineStoryFactory({
  // use only on Vercel
  cache:
    process.env.NODE_ENV === 'production'
      ? createFileSystemCache('.next/fumadocs-story')
      : undefined,
});

export const story = defineStory(import.meta.url, {
  displayName: 'Callout',
  Component: CalloutStory,
  args: [
    {
      variant: 'Default',
      initial: {
        title: 'This is a Callout',
      },
    },
    {
      variant: 'Warning',
      fixed: {
        type: 'warning',
      },
      initial: {
        title: 'This is a Callout',
      },
    },
  ],
});
