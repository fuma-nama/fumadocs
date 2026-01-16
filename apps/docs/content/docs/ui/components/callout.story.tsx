import { defineStory } from '@fumadocs/story';
import { Callout } from './callout.client';

export const story = await defineStory(import.meta.url, {
  Component: Callout,
});
