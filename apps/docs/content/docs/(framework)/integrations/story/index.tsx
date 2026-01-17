import { createFileSystemCache, defineStory } from '@fumadocs/story';
import { GraphView } from '@/components/graph-view';

export const story = await defineStory(import.meta.url, {
  Component: GraphView,
  // use only on Vercel
  cache:
    process.env.NODE_ENV === 'production'
      ? createFileSystemCache('.next/fumadocs-story')
      : undefined,
});
