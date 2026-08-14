import type { Element, Root } from 'hast';
import { visit, SKIP } from 'unist-util-visit';
import type { RehypeCodeOptions } from 'fumadocs-core/mdx-plugins/rehype-code';

const LanguagePrefix = 'language-';

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

  visit(tree, 'element', (element) => {
    if (element.tagName !== 'pre') return;

    const code = element.children[0];
    if (code?.type !== 'element' || code.tagName !== 'code') return SKIP;
    found = true;

    const language = languageOf(element.properties);
    if (language && !languageOf(code.properties)) {
      const classes = code.properties.className;
      code.properties.className = Array.isArray(classes) ? [...classes, language] : [language];
    }

    return SKIP;
  });

  return found;
}

/**
 * Highlight the `<pre><code>` blocks of a cleaned tree with Shiki, reading the language from the
 * `language-*` class kept through style adaptation.
 *
 * Shiki and its languages are loaded lazily, so content without code blocks never pays for it.
 */
export async function highlightCode(tree: Root, options?: RehypeCodeOptions): Promise<Root> {
  if (!prepareCodeBlocks(tree)) return tree;

  const [{ unified }, { rehypeCode }] = await Promise.all([
    import('unified'),
    import('fumadocs-core/mdx-plugins/rehype-code'),
  ]);

  return unified()
    .use(rehypeCode, {
      // the `tab` meta only exists in Markdown, and its transformer emits MDX nodes
      tab: false,
      ...options,
    })
    .run(tree);
}
