import { createShikiFactory } from 'fumadocs-core/highlight/shiki';

const bash = () => import('shiki/langs/shellscript.mjs');
const csharp = () => import('shiki/langs/csharp.mjs');
const javascript = () => import('shiki/langs/javascript.mjs');
const python = () => import('shiki/langs/python.mjs');
const rust = () => import('shiki/langs/rust.mjs');
const yaml = () => import('shiki/langs/yaml.mjs');

/**
 * Replaces `fumadocs-core/highlight/shiki/full` in both bundles, so they ship these languages only.
 */
export const defaultShikiFactory = createShikiFactory({
  async init(options) {
    const [{ createBundledHighlighter }, { createJavaScriptRegexEngine }] = await Promise.all([
      import('shiki/core'),
      import('shiki/engine/javascript'),
    ]);

    // the languages of code usages and responses, keyed with their aliases
    const createHighlighter = createBundledHighlighter({
      langs: {
        bash,
        sh: bash,
        shell: bash,
        shellscript: bash,
        csharp,
        cs: csharp,
        css: () => import('shiki/langs/css.mjs'),
        csv: () => import('shiki/langs/csv.mjs'),
        go: () => import('shiki/langs/go.mjs'),
        html: () => import('shiki/langs/html.mjs'),
        java: () => import('shiki/langs/java.mjs'),
        javascript,
        js: javascript,
        json: () => import('shiki/langs/json.mjs'),
        python,
        py: python,
        rust,
        rs: rust,
        xml: () => import('shiki/langs/xml.mjs'),
        yaml,
        yml: yaml,
      },
      themes: {
        'github-light': () => import('shiki/themes/github-light.mjs'),
        'github-dark': () => import('shiki/themes/github-dark.mjs'),
      },
      engine: () => createJavaScriptRegexEngine(),
    });

    return createHighlighter({ langs: [], themes: [], langAlias: options?.langAlias });
  },
});

export { defaultShikiFactory as wasmShikiFactory };
