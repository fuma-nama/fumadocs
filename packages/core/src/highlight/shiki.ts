import {
  type Awaitable,
  type BundledHighlighterOptions,
  type BundledLanguage,
  type CodeOptionsMeta,
  type CodeOptionsThemes,
  type CodeToHastOptionsCommon,
  type Highlighter,
  type RegexEngine,
} from 'shiki';
import type { BundledTheme } from 'shiki/themes';
import { type Components, toJsxRuntime } from 'hast-util-to-jsx-runtime';
import { Fragment, type ReactNode } from 'react';
import { jsx, jsxs } from 'react/jsx-runtime';
import type { Root } from 'hast';

export const defaultThemes = {
  light: 'github-light',
  dark: 'github-dark',
};

export type HighlightOptionsCommon = CodeToHastOptionsCommon<BundledLanguage> &
  CodeOptionsMeta & {
    engine?: 'js' | 'oniguruma' | Awaitable<RegexEngine>;
    components?: Partial<Components>;

    fallbackLanguage?: BundledLanguage;
  };

export type HighlightOptionsThemes = CodeOptionsThemes<BundledTheme>;

export type HighlightOptions = HighlightOptionsCommon &
  (HighlightOptionsThemes | Record<never, never>);

const highlighters = new Map<string, Promise<Highlighter>>();

export async function _highlight(code: string, options: HighlightOptions) {
  const {
    lang: initialLang,
    fallbackLanguage,
    components: _,
    engine,
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

  let highlighter;
  if (typeof engine === 'string') {
    highlighter = await getHighlighter(engine, {
      langs: [],
      themes: themesToLoad,
    });
  } else {
    highlighter = await getHighlighter('custom', {
      engine,
      langs: [],
      themes: themesToLoad,
    });

    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[Fumadocs `highlight()`] Avoid passing `engine` directly. For custom engines, use `shiki` directly instead.',
      );
    }
  }

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

export function _renderHighlight(hast: Root, options?: HighlightOptions) {
  return toJsxRuntime(hast, {
    jsx,
    jsxs,
    development: false,
    components: options?.components,
    Fragment,
  });
}

/**
 * Get Shiki highlighter instance of Fumadocs (mostly for internal use, don't recommend you to use it).
 *
 * @param engineType - engine type, the engine specified in `options` will only be effective when this is set to `custom`.
 * @param options - Shiki options.
 */
export async function getHighlighter(
  engineType: 'js' | 'oniguruma' | 'custom',
  options: BundledHighlighterOptions<BundledLanguage, BundledTheme>,
) {
  const { createHighlighter } = await import('shiki');
  let highlighter = highlighters.get(engineType);

  if (!highlighter) {
    let engine;

    if (engineType === 'js') {
      engine = import('shiki/engine/javascript').then((res) =>
        res.createJavaScriptRegexEngine(),
      );
    } else if (engineType === 'oniguruma' || !options.engine) {
      engine = import('shiki/engine/oniguruma').then((res) =>
        res.createOnigurumaEngine(import('shiki/wasm')),
      );
    } else {
      engine = options.engine;
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
  return _renderHighlight(await _highlight(code, options), options);
}
