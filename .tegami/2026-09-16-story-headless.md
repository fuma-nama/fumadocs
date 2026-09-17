---
subject: Headless stories
packages:
  npm:@fumadocs/story: minor
---

## Replace the UI of stories

The control panel is no longer fixed, `defineStoryFactory()` takes your own:

```tsx title="lib/story.tsx"
import { defineStoryFactory } from '@fumadocs/story/vite/client';
import { WithControl } from '@/components/story';

export const { defineStory } = defineStoryFactory({ WithControl });
```

Install the built-in one and edit it:

```npm
npx @fumadocs/cli add fumadocs/story/controls
```

Or build your own on `@fumadocs/story/headless`: `<StoryProvider />` holds the selected variant and the form engine, `useStory()` exposes the presets and `useStoryArgs()` the arguments of the rendered component.

See [Headless](https://fumadocs.dev/docs/integrations/story/headless).

## Fix the initial branch of union controls

The control of a union prop validated the field against the index of each branch, so it picked an arbitrary one. It now validates against the current value, falling back to the first branch.

`validate()` from `@fumadocs/story/type-tree` also rejected `null` for `null` nodes, it compared against the string `'null'`.
