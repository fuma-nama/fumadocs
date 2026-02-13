import type { Awaitable } from '@/types';
import type { BundledTheme, CodeOptionsThemes, HighlighterCore } from 'shiki';

export interface ShikiConfig {
  createHighlighter: () => Awaitable<HighlighterCore>;
  defaultThemes: CodeOptionsThemes<BundledTheme>;
}

export interface ResolvedShikiConfig extends ShikiConfig {
  id: symbol;
  resolveThemes: (
    options?: CodeOptionsThemes<BundledTheme> | Record<never, never>,
  ) => CodeOptionsThemes<BundledTheme>;
}

/** define shared configurations for Shiki */
export function defineShikiConfig(config: ShikiConfig): ResolvedShikiConfig {
  let created: Awaitable<HighlighterCore> | undefined;

  return {
    id: Symbol(),
    defaultThemes: config.defaultThemes,
    resolveThemes(options = {}) {
      let out: CodeOptionsThemes<BundledTheme>;

      if (!('theme' in options) && !('themes' in options)) {
        out = config.defaultThemes;
      } else {
        out = options;
      }

      if ('themes' in out && out.defaultColor === undefined) return { ...out, defaultColor: false };
      return out;
    },
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
