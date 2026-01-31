import type { Awaitable } from '@/types';
import type { BundledTheme, CodeOptionsThemes, HighlighterCore } from 'shiki';

export interface ShikiConfig {
  createHighlighter: () => Awaitable<HighlighterCore>;
  defaultThemes: CodeOptionsThemes<BundledTheme>;
}

export type ResolvedShikiConfig = ShikiConfig;

export function defineShikiConfig(config: ShikiConfig): ResolvedShikiConfig {
  let created: Awaitable<HighlighterCore> | undefined;
  return {
    defaultThemes: config.defaultThemes,
    createHighlighter() {
      if (created) return created;

      created = config.createHighlighter();
      if ('then' in created) {
        created = created.then((v) => (created = v));
      }
      return created;
    },
  };
}
