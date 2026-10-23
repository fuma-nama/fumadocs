import type { Element, Nodes, Root } from 'hast';
import { walk } from './walk';
import type { ProcessHtmlOptions } from './compiler';

const LanguagePrefix = 'language-';
// languages in HTML from other tools can be anything, render them as text instead of failing
const fallbackLanguage = 'plaintext';

function languageOf(properties: Element['properties']): string | undefined {
  const classes = properties.className;
  if (!Array.isArray(classes)) return;

  return classes.find((name) => typeof name === 'string' && name.startsWith(LanguagePrefix));
}

/**
 * Does the tree hold a code block worth loading a highlighter for?
 *
 * The highlighter reads the language from `<code>`, but Prism and friends write it on the
 * enclosing `<pre>`, so it is carried down when only the wrapper has one.
 */
function prepareCodeBlocks(tree: Root): boolean {
  let found = false;

  walk<Nodes>(tree, (element) => {
    if (element.type !== 'element' || element.tagName !== 'pre') return;

    const code = element.children[0];
    if (code?.type !== 'element' || code.tagName !== 'code') return 'skip';
    found = true;

    const language = languageOf(element.properties);
    if (language && !languageOf(code.properties)) {
      const classes = code.properties.className;
      code.properties.className = Array.isArray(classes) ? [...classes, language] : [language];
    }

    return 'skip';
  });

  return found;
}

/**
 * Highlight the `<pre><code>` blocks of a cleaned tree with Shiki or `highlighter`, reading the
 * language from the `language-*` class kept through style adaptation.
 *
 * Shiki and its languages are loaded lazily, so content without code blocks never pays for it.
 */
export async function highlightCode(tree: Root, options: ProcessHtmlOptions): Promise<Root> {
  if (options.rehypeCodeOptions === false || !prepareCodeBlocks(tree)) return tree;

  if (options.highlighter) {
    const [{ unified }, { rehypeCodeFromHighlighter }] = await Promise.all([
      import('unified'),
      import('fumadocs-core/mdx-plugins/rehype-code.core'),
    ]);

    return unified()
      .use(rehypeCodeFromHighlighter, options.highlighter, options.rehypeCodeOptions)
      .run(tree);
  }

  const [{ unified }, { rehypeCode }] = await Promise.all([
    import('unified'),
    import('fumadocs-core/mdx-plugins/rehype-code'),
  ]);

  return unified()
    .use(rehypeCode, {
      // the `tab` meta only exists in Markdown, and its transformer emits MDX nodes
      tab: false,
      fallbackLanguage,
      ...options.rehypeCodeOptions,
    })
    .run(tree);
}
