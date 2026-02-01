import type {
  BundledLanguage,
  CodeOptionsMeta,
  CodeOptionsThemes,
  CodeToHastOptionsCommon,
  BundledTheme,
  HighlighterCore,
  ThemeRegistrationAny,
  LanguageRegistration,
} from 'shiki';
import { type Components, toJsxRuntime } from 'hast-util-to-jsx-runtime';
import { Fragment, type ReactNode } from 'react';
import { jsx, jsxs } from 'react/jsx-runtime';
import type { Root } from 'hast';
import type { ResolvedShikiConfig } from '../config';
import type { DistributiveOmit } from '@/types';

export type CoreHighlightOptions = CodeToHastOptionsCommon<BundledLanguage> &
  CodeOptionsMeta & {
    config: ResolvedShikiConfig;
    components?: Partial<Components>;
    fallbackLanguage?: BundledLanguage;
  } & (CodeOptionsThemes<BundledTheme> | Record<never, never>);

export async function highlightHast(
  code: string,
  options: DistributiveOmit<CoreHighlightOptions, 'components'>,
): Promise<Root> {
  const { fallbackLanguage = 'text', config, ...resolved } = options;
  let themesToLoad: (ThemeRegistrationAny | string)[];

  if (!('theme' in resolved) && !('themes' in resolved)) {
    Object.assign(resolved, config.defaultThemes);
  }

  if ('theme' in resolved) {
    themesToLoad = [resolved.theme];
  } else if ('themes' in resolved) {
    themesToLoad = Object.values(resolved.themes).filter((v) => v !== undefined);
    resolved.defaultColor ??= false;
  } else {
    throw new Error('impossible');
  }

  const { isSpecialLang } = await import('shiki/core');
  const highlighter = await config.createHighlighter();
  if (
    !isSpecialLang(resolved.lang) &&
    !(resolved.lang in highlighter.getBundledLanguages()) &&
    !highlighter.getLoadedLanguages().includes(resolved.lang)
  ) {
    resolved.lang = fallbackLanguage;
  }

  await Promise.all([
    loadMissingTheme(highlighter, ...themesToLoad),
    loadMissingLanguage(highlighter, resolved.lang),
  ]);

  return highlighter.codeToHast(code, resolved);
}

async function loadMissingTheme(
  highlighter: HighlighterCore,
  ...themes: (ThemeRegistrationAny | string)[]
) {
  const { isSpecialTheme } = await import('shiki/core');

  const missingThemes = themes.filter((theme) => {
    if (isSpecialTheme(theme)) return false;
    try {
      highlighter.getTheme(theme);
      return false;
    } catch {
      return true;
    }
  });

  if (missingThemes.length > 0) await highlighter.loadTheme(...(missingThemes as never[]));
}

async function loadMissingLanguage(
  highlighter: HighlighterCore,
  ...langs: (LanguageRegistration | string)[]
) {
  const { isSpecialLang } = await import('shiki/core');

  const missingLangs = langs.filter((lang) => {
    if (isSpecialLang(lang)) return false;
    try {
      highlighter.getLanguage(lang);
      return false;
    } catch {
      return true;
    }
  });

  if (missingLangs.length > 0) await highlighter.loadLanguage(...(missingLangs as never[]));
}

/**
 * Get Shiki highlighter instance of Fumadocs (mostly for internal use, you should use Shiki directly over this).
 *
 * @param engineType - Shiki Regex engine to use.
 * @param options - Shiki options.
 */
export async function getHighlighter(
  config: ResolvedShikiConfig,
  options?: {
    langs?: (BundledLanguage | LanguageRegistration)[];
    themes?: (BundledTheme | ThemeRegistrationAny)[];
  },
) {
  const highlighter = await config.createHighlighter();

  await Promise.all([
    options?.langs && loadMissingLanguage(highlighter, ...options.langs),
    options?.themes && loadMissingTheme(highlighter, ...options.themes),
  ]);

  return highlighter;
}

export async function highlight(code: string, options: CoreHighlightOptions): Promise<ReactNode> {
  return toJsxRuntime(await highlightHast(code, options), {
    jsx,
    jsxs,
    development: false,
    Fragment,
    components: options.components,
  });
}
