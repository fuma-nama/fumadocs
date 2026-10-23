import { createHighlights } from 'fumadocs-core/highlight/highlights';
import githubLight from '@pierre/highlights/themes/github-light';
import vesper from '@pierre/highlights/themes/vesper';

export const highlighter = createHighlights();

/** for API pages and type tables */
export const apiHighlighter = createHighlights({
  themes: { light: githubLight, dark: vesper },
});
