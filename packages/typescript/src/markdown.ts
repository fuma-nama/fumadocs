import type { ElementContent, Nodes } from 'hast';
import { remark } from 'remark';
import { remarkGfm } from 'fumadocs-core/mdx-plugins/remark-gfm';
import { rehypeCodeFromHighlighter } from 'fumadocs-core/mdx-plugins/rehype-code.core';
import remarkRehype from 'remark-rehype';
import type { Highlighter } from 'fumadocs-core/highlight';
import { createShikiHighlighter } from 'fumadocs-core/highlight/shiki';
import { defaultShikiFactory } from 'fumadocs-core/highlight/shiki/full';
import type { CodeToHastOptionsCommon, CodeOptionsThemes, BundledTheme } from 'shiki';

export interface MarkdownRenderer {
  renderTypeToHast: (type: string) => Nodes | Promise<Nodes>;
  renderMarkdownToHast: (md: string) => Nodes | Promise<Nodes>;
}

export type ShikiOptions = Omit<CodeToHastOptionsCommon, 'lang'> & CodeOptionsThemes<BundledTheme>;

export function markdownRenderer(
  highlighter?: Highlighter,
  shiki?: ShikiOptions,
): MarkdownRenderer {
  highlighter ??= createShikiHighlighter(() => defaultShikiFactory.getOrInit(), {
    defaultColor: false,
    fallbackLanguage: 'plaintext',
    transformers: [],
    ...(shiki ?? { themes: { light: 'github-light', dark: 'github-dark' } }),
  });
  const processor = remark()
    .use(remarkGfm)
    .use(remarkRehype)
    // code blocks here have no title
    .use(rehypeCodeFromHighlighter, highlighter, { parseMetaString: undefined });

  return {
    async renderTypeToHast(type) {
      await highlighter.loadLanguage?.('ts');
      const nodes = highlighter.codeToHast(type, { lang: 'ts', structure: 'inline' });

      return {
        type: 'element',
        tagName: 'span',
        properties: {
          class: 'shiki',
        },
        children: [
          {
            type: 'element',
            tagName: 'code',
            properties: {},
            children: nodes.children as ElementContent[],
          },
        ],
      };
    },
    renderMarkdownToHast(md) {
      md = md.replace(/{@link (?<link>[^}]*)}/g, '$1'); // replace jsdoc links

      return processor.run(processor.parse(md));
    },
  };
}
