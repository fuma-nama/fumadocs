import { describe, expect, test } from 'vitest';
import { remark } from 'remark';
import remarkRehype from 'remark-rehype';
import { visit } from 'unist-util-visit';
import type { Element, Root } from 'hast';
import { rehypeCode } from '@/mdx-plugins';

async function process(source: string): Promise<Root> {
  const processor = remark().use(remarkRehype).use(rehypeCode, { inline: 'tailing-curly-colon' });

  return (await processor.run(processor.parse(source))) as Root;
}

/**
 * Shiki emits `<span style="--shiki-light:...">` token elements, raw text
 * doesn't. Counting them tells us whether the node was highlighted.
 */
function countTokens(tree: Root, tagName: 'pre' | 'code'): number {
  let count = 0;

  visit(tree, 'element', (node: Element) => {
    if (node.tagName !== tagName) return;
    const classes = node.properties?.class ?? node.properties?.className;
    if (!String(classes ?? '').includes('shiki')) return;

    visit(node, 'element', (child: Element) => {
      if (child.tagName === 'span' && typeof child.properties?.style === 'string') count++;
    });
  });

  return count;
}

describe('Rehype Code', () => {
  test('highlights a top-level code block', async () => {
    const tree = await process(['```ts', 'console.log("hello");', '```'].join('\n'));

    expect(countTokens(tree, 'pre')).toBeGreaterThan(0);
  });

  // the visitor used to `return 'skip'` on every unmatched element, which
  // aborted traversal of the entire subtree of the first wrapper element.
  test.each([
    ['list item', ['1. item', '', '   ```ts', '   console.log("hello");', '   ```'].join('\n')],
    ['blockquote', ['> ```ts', '> console.log("hello");', '> ```'].join('\n')],
  ])('highlights a code block nested inside a %s', async (_name, source) => {
    const tree = await process(source);

    expect(countTokens(tree, 'pre')).toBeGreaterThan(0);
  });

  test('highlights inline code nested inside a list item', async () => {
    const tree = await process('1. item `console.log("hello"){:ts}`');

    expect(countTokens(tree, 'code')).toBeGreaterThan(0);
  });
});
