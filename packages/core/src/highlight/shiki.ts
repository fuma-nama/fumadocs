import {
  type BundledHighlighterOptions,
  type BundledLanguage,
  type CodeOptionsMeta,
  type CodeOptionsThemes,
  type CodeToHastOptionsCommon,
  type Highlighter,
} from 'shiki';
import type { BundledTheme } from 'shiki/themes';
import {
  type Components,
  type Options as ToJsxOptions,
  toJsxRuntime,
} from 'hast-util-to-jsx-runtime';
import { Fragment, type ReactNode } from 'react';
import { jsx, jsxs } from 'react/jsx-runtime';
import type { Root } from 'hast';

export const defaultThemes = {
  light: 'github-light',
  dark: 'github-dark',
};

export type HighlightOptionsCommon = CodeToHastOptionsCommon<BundledLanguage> &
  CodeOptionsMeta & {
    /**
     * The Regex Engine for Shiki
     *
     * @defaultValue 'js'
     */
    engine?: 'js' | 'oniguruma';
    components?: Partial<Components>;

    fallbackLanguage?: BundledLanguage;
  };

export type HighlightOptionsThemes = CodeOptionsThemes<BundledTheme>;

export type HighlightOptions = HighlightOptionsCommon &
  (HighlightOptionsThemes | Record<never, never>);

const highlighters = new Map<string, Promise<Highlighter>>();

export async function highlightHast(
  code: string,
  options: HighlightOptions,
): Promise<Root> {
  const {
    lang: initialLang,
    fallbackLanguage,
    components: _,
    engine = 'js',
    ...rest
  } = options;
  let lang = initialLang;
  let themes: CodeOptionsThemes<BundledTheme>;
  let themesToLoad;

  if ('theme' in options && options.theme) {
    themes = { theme: options.theme };
    themesToLoad = [themes.theme];
  } else {
    themes = {
      themes:
        'themes' in options && options.themes ? options.themes : defaultThemes,
    };
    themesToLoad = Object.values(themes.themes).filter((v) => v !== undefined);
  }

  const highlighter = await getHighlighter(engine, {
    langs: [],
    themes: themesToLoad,
  });

  try {
    await highlighter.loadLanguage(lang as BundledLanguage);
  } catch {
    lang = fallbackLanguage ?? 'text';
    await highlighter.loadLanguage(lang as BundledLanguage);
  }

  return highlighter.codeToHast(code, {
    lang,
    ...rest,
    ...themes,
    defaultColor: 'themes' in themes ? false : undefined,
  });
}

export function hastToJsx(hast: Root, options?: Partial<ToJsxOptions>) {
  return toJsxRuntime(hast, {
    jsx,
    jsxs,
    development: false,
    Fragment,
    ...options,
  });
}

/**
 * Get Shiki highlighter instance of Fumadocs (mostly for internal use, you should use Shiki directly over this).
 *
 * @param engineType - Shiki Regex engine to use.
 * @param options - Shiki options.
 */
export async function getHighlighter(
  engineType: 'js' | 'oniguruma',
  options: Omit<
    BundledHighlighterOptions<BundledLanguage, BundledTheme>,
    'engine'
  >,
) {
  const { createHighlighter } = await import('shiki');
  let highlighter = highlighters.get(engineType);

  if (!highlighter) {
    let engine;

    if (engineType === 'js') {
      engine = import('shiki/engine/javascript').then((res) =>
        res.createJavaScriptRegexEngine(),
      );
    } else {
      engine = import('shiki/engine/oniguruma').then((res) =>
        res.createOnigurumaEngine(import('shiki/wasm')),
      );
    }

    highlighter = createHighlighter({
      ...options,
      engine,
    });

    highlighters.set(engineType, highlighter);
    return highlighter;
  }

  return highlighter.then(async (instance) => {
    await Promise.all([
      // @ts-expect-error unknown
      instance.loadLanguage(...options.langs),
      // @ts-expect-error unknown
      instance.loadTheme(...options.themes),
    ]);

    return instance;
  });
}

export async function highlight(
  code: string,
  options: HighlightOptions,
): Promise<ReactNode> {
  return hastToJsx(await highlightHast(code, options), {
    components: options.components,
  });
}
