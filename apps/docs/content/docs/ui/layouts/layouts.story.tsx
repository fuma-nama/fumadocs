import { defineStory } from '@/lib/story';
import { DocsLayoutPreview } from '@/components/layout-preview/docs';
import { NotebookLayoutPreview } from '@/components/layout-preview/notebook';
import { SpaciousLayoutPreview } from '@/components/layout-preview/spacious';
import { FluxLayoutPreview } from '@/components/layout-preview/flux';
import { GlassLayoutPreview } from '@/components/layout-preview/glass';
import { HomeLayoutPreview } from '@/components/layout-preview/home';
import { StoryWindow } from '@/components/layout-preview/window';

const base = {
  nav: { title: 'My Docs' },
  themeSwitch: { enabled: true, mode: 'light-dark' },
  searchToggle: { enabled: true },
} as const;

function frame(name: string) {
  return { src: `/story/${name}`, Container: StoryWindow };
}

export const docs = defineStory({
  displayName: 'Docs Layout',
  Component: DocsLayoutPreview,
  frame: frame('docs'),
  args: {
    initial: { ...base, tabMode: 'auto', sidebar: { collapsible: true } },
  },
});

export const notebook = defineStory({
  displayName: 'Notebook Layout',
  Component: NotebookLayoutPreview,
  frame: frame('notebook'),
  args: {
    initial: {
      ...base,
      nav: { ...base.nav, mode: 'auto' },
      tabMode: 'sidebar',
      sidebar: { collapsible: true },
    },
  },
});

export const spacious = defineStory({
  displayName: 'Spacious Layout',
  Component: SpaciousLayoutPreview,
  frame: frame('spacious'),
  args: {
    initial: base,
  },
});

export const flux = defineStory({
  displayName: 'Flux Layout',
  Component: FluxLayoutPreview,
  frame: frame('flux'),
  args: {
    initial: base,
  },
});

export const glass = defineStory({
  displayName: 'Glass Layout',
  Component: GlassLayoutPreview,
  frame: frame('glass'),
  args: {
    initial: { ...base, sidebar: { collapsible: true } },
  },
});

export const home = defineStory({
  displayName: 'Home Layout',
  Component: HomeLayoutPreview,
  frame: frame('home'),
  args: {
    initial: { ...base, nav: { ...base.nav, transparentMode: 'top' } },
  },
});
