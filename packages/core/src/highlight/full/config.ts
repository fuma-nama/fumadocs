import { createHighlighter, createOnigurumaEngine } from 'shiki';
import { defineShikiConfig } from '../config';

export const withJSEngine = defineShikiConfig({
  defaultThemes: {
    themes: {
      light: 'github-light',
      dark: 'github-dark',
    },
  },
  async createHighlighter() {
    const { createJavaScriptRegexEngine } = await import('shiki/engine/javascript');

    return createHighlighter({
      langs: [],
      themes: [],
      engine: createJavaScriptRegexEngine(),
    });
  },
});

export const withWASMEngine = defineShikiConfig({
  defaultThemes: {
    themes: {
      light: 'github-light',
      dark: 'github-dark',
    },
  },
  createHighlighter() {
    return createHighlighter({
      langs: [],
      themes: [],
      engine: createOnigurumaEngine(import('shiki/wasm')),
    });
  },
});
