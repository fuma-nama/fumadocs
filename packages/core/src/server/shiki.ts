import {
  type BundledLanguage,
  type CodeOptionsThemes,
  type ShikiTransformer,
  type CodeOptionsMeta,
  type HighlighterCoreOptions,
  type CodeToHastOptionsCommon,
  type Highlighter,
  createHighlighter,
} from 'shiki';
import type { BundledTheme } from 'shiki/themes';
import { type Components, toJsxRuntime } from 'hast-util-to-jsx-runtime';
import { Fragment, type ReactNode } from 'react';
import { jsx, jsxs } from 'react/jsx-runtime';

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

let instance: Promise<Highlighter> | undefined;

export async function highlight(
  code: string,
  options: HighlightOptions,
): Promise<ReactNode> {
  const { lang, components, engine, ...rest } = options;

  if (!instance) {
    instance = createHighlighter({
      langs: [],
      themes: [],
      engine,
    });
  }

  let themes: CodeOptionsThemes<BundledTheme> = { themes: defaultThemes };
  if ('theme' in options && options.theme) {
    themes = { theme: options.theme };
  } else if ('themes' in options && options.themes) {
    themes = { themes: options.themes };
  }

  const highlighter = await instance;
  await Promise.all([
    highlighter.loadLanguage(lang as BundledLanguage),

    'theme' in themes
      ? highlighter.loadTheme(themes.theme as BundledTheme)
      : highlighter.loadTheme(
          ...(Object.values(themes.themes).filter(
            (v) => v !== undefined,
          ) as BundledTheme[]),
        ),
  ]);

  const hast = highlighter.codeToHast(code, {
    lang,
    ...rest,
    ...themes,
    transformers: [createStyleTransformer(), ...(rest.transformers ?? [])],
    defaultColor: 'themes' in themes ? false : undefined,
  });

  return toJsxRuntime(hast, {
    jsx,
    jsxs,
    development: false,
    components,
    Fragment,
  });
}
