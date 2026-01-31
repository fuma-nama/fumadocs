import type {
  BundledHighlighterOptions,
  BundledLanguage,
  CodeOptionsMeta,
  CodeOptionsThemes,
  CodeToHastOptionsCommon,
  BundledTheme,
} from 'shiki';
import {
  type Components,
  type Options as ToJsxOptions,
  toJsxRuntime,
} from 'hast-util-to-jsx-runtime';
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
  const { lang: initialLang, fallbackLanguage, config, ...rest } = options;
  let lang = initialLang;
  let themesToLoad: unknown[];

  if (!('theme' in rest) && !('themes' in rest)) {
    Object.assign(rest, config.defaultThemes);
  }

  if ('theme' in rest) {
    themesToLoad = [rest.theme];
  } else if ('themes' in rest) {
    themesToLoad = Object.values(rest.themes).filter((v) => v !== undefined);
  } else {
    throw new Error('impossible');
  }

  const highlighter = await config.createHighlighter();
  await highlighter.loadTheme(...(themesToLoad as never[]));

  try {
    await highlighter.loadLanguage(lang as never);
  } catch {
    lang = fallbackLanguage ?? 'text';
    await highlighter.loadLanguage(lang as never);
  }

  return highlighter.codeToHast(code, {
    lang,
    defaultColor: 'themes' in rest ? false : undefined,
    ...rest,
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
  config: ResolvedShikiConfig,
  options: Omit<BundledHighlighterOptions<BundledLanguage, BundledTheme>, 'engine' | 'langAlias'>,
) {
  const highlighter = await config.createHighlighter();

  await Promise.all([
    highlighter.loadLanguage(...(options.langs as never[])),
    highlighter.loadTheme(...(options.themes as never[])),
  ]);

  return highlighter;
}

export async function highlight(
  code: string,
  { components, ...rest }: CoreHighlightOptions,
): Promise<ReactNode> {
  return hastToJsx(await highlightHast(code, rest), {
    components,
  });
}
