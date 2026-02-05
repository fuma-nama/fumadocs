import { configDefault } from 'fumadocs-core/highlight';
import type { ResolvedShikiConfig } from 'fumadocs-core/highlight/config';

export const shikiConfig: ResolvedShikiConfig = {
  ...configDefault,
  defaultThemes: {
    themes: {
      light: 'github-light',
      dark: 'vesper',
    },
  },
};
