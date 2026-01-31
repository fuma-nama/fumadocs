import { defineShikiConfig } from '../config';

const defaultThemes = {
  themes: {
    light: 'github-light',
    dark: 'github-dark',
  },
};

export const withJSEngine = defineShikiConfig({
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

export const withWASMEngine = defineShikiConfig({
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
