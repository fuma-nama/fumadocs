import { defineStory } from '@/lib/story';
import type { CalloutStory } from '.';

export const story = defineStory<typeof CalloutStory>('src/components/callout/story.tsx', {
  displayName: 'Callout',
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
