import {
  type BundledLanguage,
  type CodeOptionsThemes,
  type ShikiTransformer,
  codeToHast,
  type CodeOptionsMeta,
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
  Partial<CodeOptionsThemes<BundledTheme>> &
  CodeOptionsMeta & {
    components?: Partial<Components>;
  };

export async function highlight(
  code: string,
  options: HighlightOptions,
): Promise<ReactNode> {
  const { lang, components, ...rest } = options;
  const baseOptions = {
    ...rest,
    lang,
    transformers: [createStyleTransformer(), ...(rest.transformers ?? [])],
  };

  let hast: Root;
  if ('theme' in options && options.theme) {
    hast = await codeToHast(code, {
      ...baseOptions,
      theme: options.theme,
    });
  } else {
    hast = await codeToHast(code, {
      ...baseOptions,
      defaultColor: false,
      themes:
        'themes' in options && options.themes ? options.themes : defaultThemes,
    });
  }

  return toJsxRuntime(hast, {
    jsx,
    jsxs,
    development: false,
    components,
    Fragment,
  });
}
