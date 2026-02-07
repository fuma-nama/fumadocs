import { createStoryClient } from '@fumadocs/story/client';
import { CalloutStory } from '.';
import type { story } from './story';

export const storyClient = createStoryClient<typeof story>({
  Component: CalloutStory,
});
