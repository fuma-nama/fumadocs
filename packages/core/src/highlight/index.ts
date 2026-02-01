import type {
  BundledLanguage,
  BundledTheme,
  LanguageRegistration,
  ThemeRegistrationAny,
} from 'shiki';
import type { ReactNode } from 'react';
import type { Root } from 'hast';
import type { DistributiveOmit } from '@/types';
import * as base from './core';
import { defineShikiConfig } from './config';

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
    config: engine === 'js' ? configDefault : configWASM,
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
  options?: {
    langs?: (BundledLanguage | LanguageRegistration)[];
    themes?: (BundledTheme | ThemeRegistrationAny)[];
  },
) {
  return base.getHighlighter(engineType === 'js' ? configDefault : configWASM, options);
}

export async function highlight(code: string, options: HighlightOptions): Promise<ReactNode> {
  const engine = options.engine ?? 'js';

  return base.highlight(code, {
    ...options,
    config: engine === 'js' ? configDefault : configWASM,
  });
}

const defaultThemes = {
  themes: {
    light: 'github-light',
    dark: 'github-dark',
  },
};

export const configDefault = defineShikiConfig({
  defaultThemes,
  async createHighlighter() {
    const { createHighlighter } = await import('shiki');
    const { createJavaScriptRegexEngine } = await import('shiki/engine/javascript');

    return createHighlighter({
      langs: [],
      themes: [],
      engine: createJavaScriptRegexEngine(),
    });
  },
});

/** config using the WASM powered Regex engine */
export const configWASM = defineShikiConfig({
  defaultThemes,
  async createHighlighter() {
    const { createHighlighter, createOnigurumaEngine } = await import('shiki');
    return createHighlighter({
      langs: [],
      themes: [],
      engine: createOnigurumaEngine(import('shiki/wasm')),
    });
  },
});
