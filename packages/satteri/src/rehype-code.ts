import type { ShikiTransformer } from 'shiki';
import type { Highlighter } from 'fumadocs-core/highlight';
import {
  rehypeCode as createRehypeCodeTransformer,
  type RehypeCodeOptions,
} from 'fumadocs-core/mdx-plugins/rehype-code';
import {
  rehypeCodeFromHighlighter as createHighlighterTransformer,
  type RehypeCodeFromHighlighterOptions,
} from 'fumadocs-core/mdx-plugins/rehype-code.core';
import { highlightPlugin } from './utils';

export type { RehypeCodeOptions } from 'fumadocs-core/mdx-plugins/rehype-code';
export type { RehypeCodeFromHighlighterOptions } from 'fumadocs-core/mdx-plugins/rehype-code.core';

export interface HighlightCompileOptions {
  /**
   * Compile the tokens of a highlighted line as JSX elements, or as their HTML: compiled MDX is about half the size,
   * but the `span` of MDX components no longer applies to tokens.
   *
   * @defaultValue 'jsx'
   */
  tokens?: 'jsx' | 'html';
}

export function rehypeCode({
  tokens,
  ...options
}: Partial<RehypeCodeOptions> & HighlightCompileOptions = {}) {
  return highlightPlugin('rehype-code', createRehypeCodeTransformer.call({} as never, options), {
    inline: options.inline,
    tokens,
  });
}

/**
 * Highlight code blocks, a function is created with the transformers of Fumadocs.
 */
export function rehypeCodeFromHighlighter(
  highlighter: Highlighter | ((options: { transformers: ShikiTransformer[] }) => Highlighter),
  { tokens, ...options }: RehypeCodeFromHighlighterOptions & HighlightCompileOptions = {},
) {
  return highlightPlugin('rehype-code', createHighlighterTransformer(highlighter, options), {
    inline: options.inline,
    tokens,
  });
}
