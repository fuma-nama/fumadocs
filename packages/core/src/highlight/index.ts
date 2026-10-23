import type {
  BundledLanguage,
  BundledTheme,
  CodeOptionsMeta,
  CodeOptionsThemes,
  CodeToHastOptionsCommon,
  LanguageRegistration,
  ThemeRegistrationAny,
} from 'shiki';
import type { ReactNode } from 'react';
import type { Root } from 'hast';
import { defaultShikiFactory, wasmShikiFactory } from './shiki/full';
import { type Components, toJsx } from '@/utils/hast-to-jsx';
import { highlightHast as highlightHastBase } from './shiki';
import { applyDefaultThemes, loadMissingLanguage, loadMissingTheme } from './utils';

/**
 * A syntax highlighter, like Shiki or Highlights.
 */
export interface Highlighter {
  /** Load languages before highlighting, for highlighters loading them on demand. Unsupported languages are highlighted as plain text. */
  loadLanguage?: (...langs: string[]) => Promise<void>;
  /** Highlight code into `pre > code > span.line`, with `meta` added to `<pre>`. */
  codeToHast: (code: string, options: HighlightCodeOptions) => Root;
}

export interface HighlightCodeOptions {
  lang: string;
  /**
   * `inline` renders the content of `<code>` only.
   *
   * @defaultValue 'classic'
   */
  structure?: 'classic' | 'inline';
  /** Attributes of the code block, like its title. */
  meta?: Record<string, unknown>;
}

export type HighlightOptions = HighlightHastOptions & {
  components?: Partial<Components>;
};

export type HighlightHastOptions = CodeToHastOptionsCommon<BundledLanguage> &
  CodeOptionsMeta & {
    fallbackLanguage?: BundledLanguage | (string & {});
    /**
     * The Regex Engine for Shiki
     *
     * @defaultValue 'js'
     */
    engine?: 'js' | 'oniguruma';
  } & (CodeOptionsThemes<BundledTheme> | Record<never, never>);

export async function highlightHast(code: string, options: HighlightHastOptions): Promise<Root> {
  const engine = options.engine ?? 'js';
  const factory = engine === 'js' ? defaultShikiFactory : wasmShikiFactory;
  const instance = await factory.getOrInit();

  return highlightHastBase(instance, code, applyDefaultThemes(options));
}

/**
 * Get Shiki highlighter instance of Fumadocs (mostly for internal use, you should use Shiki directly over this).
 *
 * @param engineType - Shiki Regex engine to use.
 * @param options - Shiki options.
 */
export async function getHighlighter(
  engineType: 'js' | 'oniguruma',
  options: {
    langs?: (BundledLanguage | LanguageRegistration)[];
    themes?: (BundledTheme | ThemeRegistrationAny)[];
  } = {},
) {
  const factory = engineType === 'js' ? defaultShikiFactory : wasmShikiFactory;
  const instance = await factory.getOrInit();

  await Promise.all([
    options.langs && loadMissingLanguage(instance, options.langs),
    options.themes && loadMissingTheme(instance, options.themes),
  ]);
  return instance;
}

export async function highlight(code: string, options: HighlightOptions): Promise<ReactNode> {
  return toJsx(await highlightHast(code, options), { components: options.components });
}
