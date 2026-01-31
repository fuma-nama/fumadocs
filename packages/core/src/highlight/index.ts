import type { BundledHighlighterOptions, BundledLanguage, BundledTheme } from 'shiki';
import type { ReactNode } from 'react';
import type { Root } from 'hast';
import type { DistributiveOmit } from '@/types';
import * as base from './core';
import { withJSEngine, withWASMEngine } from './full/config';

export type HighlightOptions = DistributiveOmit<base.CoreHighlightOptions, 'config'> & {
  /**
   * The Regex Engine for Shiki
   *
   * @defaultValue 'js'
   */
  engine?: 'js' | 'oniguruma';
};

export async function highlightHast(code: string, options: HighlightOptions): Promise<Root> {
  const engine = options.engine ?? 'js';
  return base.highlightHast(code, {
    ...options,
    config: engine === 'js' ? withJSEngine : withWASMEngine,
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
  options: Omit<BundledHighlighterOptions<BundledLanguage, BundledTheme>, 'engine' | 'langAlias'>,
) {
  return base.getHighlighter(engineType === 'js' ? withJSEngine : withWASMEngine, options);
}

export async function highlight(code: string, options: HighlightOptions): Promise<ReactNode> {
  return base.hastToJsx(await highlightHast(code, options), {
    components: options.components,
  });
}
