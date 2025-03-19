import {
  type BundledLanguage,
  type CodeOptionsThemes,
  type ShikiTransformer,
  type CodeOptionsMeta,
  type CodeToHastOptionsCommon,
  type RegexEngine,
  type Awaitable,
  type Highlighter,
  type BundledHighlighterOptions,
} from 'shiki';
import type { BundledTheme } from 'shiki/themes';
import { type Components, toJsxRuntime } from 'hast-util-to-jsx-runtime';
import { Fragment, type ReactNode } from 'react';
import { jsx, jsxs } from 'react/jsx-runtime';
import type { Root } from 'hast';

export function createStyleTransformer(): ShikiTransformer {
  return {
    name: 'rehype-code:styles',
    line(hast) {
      if (hast.children.length === 0) {
        // Keep the empty lines when using grid layout
        hast.children.push({
          type: 'text',
          value: ' ',
        });
      }
    },
  };
}

export const defaultThemes = {
  light: 'github-light',
  dark: 'github-dark',
};

export type HighlightOptions = CodeToHastOptionsCommon<BundledLanguage> &
  (CodeOptionsThemes<BundledTheme> | Record<never, never>) &
  CodeOptionsMeta & {
    engine?: Awaitable<RegexEngine>;
    components?: Partial<Components>;
  };

const highlighters = new Map<string, Promise<Highlighter>>();

export async function _highlight(code: string, options: HighlightOptions) {
  const { lang, components: _, engine, ...rest } = options;

  let themes: CodeOptionsThemes<BundledTheme> = { themes: defaultThemes };
  if ('theme' in options && options.theme) {
    themes = { theme: options.theme };
  } else if ('themes' in options && options.themes) {
    themes = { themes: options.themes };
  }

  const highlighter = await getHighlighter('custom', {
    engine,
    langs: [lang],
    themes:
      'theme' in themes
        ? [themes.theme]
        : Object.values(themes.themes).filter((v) => v !== undefined),
  });

  return highlighter.codeToHast(code, {
    lang,
    ...rest,
    ...themes,
    transformers: [createStyleTransformer(), ...(rest.transformers ?? [])],
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

export async function getHighlighter(
  engineType: 'js' | 'oniguruma' | 'custom',
  options: BundledHighlighterOptions<BundledLanguage, BundledTheme>,
) {
  const { createHighlighter } = await import('shiki');
  let highlighter = highlighters.get(engineType);

  if (!highlighter) {
    let engine = options.engine;

    if (engineType === 'js') {
      const { createJavaScriptRegexEngine } = await import(
        'shiki/engine/javascript'
      );
      engine = createJavaScriptRegexEngine();
    }

    if (engineType === 'oniguruma' || !engine) {
      const { createOnigurumaEngine } = await import('shiki/engine/oniguruma');
      engine = createOnigurumaEngine(import('shiki/wasm'));
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
