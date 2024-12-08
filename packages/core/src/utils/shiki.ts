import {
  type BundledLanguage,
  type CodeOptionsThemes,
  type ShikiTransformer,
  type CodeOptionsMeta,
  type HighlighterCoreOptions,
  type CodeToHastOptionsCommon,
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
  Pick<HighlighterCoreOptions, 'engine'> &
  Partial<CodeOptionsThemes<BundledTheme>> &
  CodeOptionsMeta & {
    components?: Partial<Components>;
  };

export async function _highlight(code: string, options: HighlightOptions) {
  const { getSingletonHighlighter } = await import('shiki');
  const { lang, components: _, engine: defaultEngine, ...rest } = options;

  let themes: CodeOptionsThemes<BundledTheme> = { themes: defaultThemes };
  if ('theme' in options && options.theme) {
    themes = { theme: options.theme };
  } else if ('themes' in options && options.themes) {
    themes = { themes: options.themes };
  }

  let engine = defaultEngine;
  if (!engine) {
    const { createOnigurumaEngine } = await import('shiki/engine/oniguruma');

    engine = await createOnigurumaEngine(await import('shiki/wasm'));
  }

  const highlighter = await getSingletonHighlighter({
    langs: [lang],
    engine,
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

export async function highlight(
  code: string,
  options: HighlightOptions,
): Promise<ReactNode> {
  return _renderHighlight(await _highlight(code, options), options);
}
