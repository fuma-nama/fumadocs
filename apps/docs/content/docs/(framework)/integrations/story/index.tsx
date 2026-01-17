import { createFileSystemCache, defineStory } from '@fumadocs/story';
import { GraphView } from '@/components/graph-view';
import { buildGraph } from '@/lib/build-graph';

export const story = defineStory(import.meta.url, {
  Component: GraphView,
  // use only on Vercel
  cache:
    process.env.NODE_ENV === 'production'
      ? createFileSystemCache('.next/fumadocs-story')
      : undefined,
  args: {
    initial: async () => ({
      graph: await buildGraph(),
    }),
  },
});
