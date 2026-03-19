import type { Root } from 'hast';
import type {
  BundledLanguage,
  BundledTheme,
  CodeOptionsMeta,
  CodeOptionsThemes,
  CodeToHastOptionsCommon,
  HighlighterCore,
} from 'shiki';
import { loadMissingTheme, getRequiredThemes } from '../utils';
import type { Awaitable } from '@/types';

interface InitOptions {
  langAlias?: Record<string, string>;
}

/**
 * A factory for Fumadocs to manage Shiki instances.
 */
export interface ShikiFactory {
  init: (options?: InitOptions) => Awaitable<HighlighterCore>;
  getOrInit: () => Awaitable<HighlighterCore>;
}

export function createShikiFactory(config: Pick<ShikiFactory, 'init'>): ShikiFactory {
  let instance: Awaitable<HighlighterCore> | undefined;

  return {
    init(options) {
      return (instance = config.init(options));
    },
    getOrInit() {
      return instance ?? this.init();
    },
  };
}

export type HighlightHastOptions = CodeToHastOptionsCommon<BundledLanguage> &
  CodeOptionsMeta &
  CodeOptionsThemes<BundledTheme> & {
    fallbackLanguage?: BundledLanguage | (string & {});
  };

export async function highlightHast(
  highlighter: HighlighterCore,
  code: string,
  options: HighlightHastOptions,
): Promise<Root> {
  const { fallbackLanguage = 'text', ...resolved } = options;
  const { isSpecialLang } = await import('shiki/core');
  if (
    !isSpecialLang(resolved.lang) &&
    !(resolved.lang in highlighter.getBundledLanguages()) &&
    !highlighter.getLoadedLanguages().includes(resolved.lang)
  ) {
    resolved.lang = fallbackLanguage;
  }

  await Promise.all([
    loadMissingTheme(highlighter, getRequiredThemes(resolved)),
    highlighter.loadLanguage(resolved.lang as never),
  ]);

  return highlighter.codeToHast(code, resolved);
}
