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

export function rehypeCode(options?: Partial<RehypeCodeOptions>) {
  return highlightPlugin(
    'rehype-code',
    createRehypeCodeTransformer.call({} as never, options),
    options?.inline,
  );
}

/**
 * Highlight code blocks, a function is created with the transformers of Fumadocs.
 */
export function rehypeCodeFromHighlighter(
  highlighter: Highlighter | ((options: { transformers: ShikiTransformer[] }) => Highlighter),
  options?: RehypeCodeFromHighlighterOptions,
) {
  return highlightPlugin(
    'rehype-code',
    createHighlighterTransformer(highlighter, options),
    options?.inline,
  );
}
