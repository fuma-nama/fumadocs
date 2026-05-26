import { defineStory } from '@/lib/story';
import { CalloutStory } from './callout';

export const story = defineStory({
  Component: CalloutStory,
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
