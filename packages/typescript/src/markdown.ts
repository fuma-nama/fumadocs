import type { ElementContent, Nodes } from 'hast';
import { remark } from 'remark';
import { remarkGfm } from 'fumadocs-core/mdx-plugins/remark-gfm';
import { rehypeCode } from 'fumadocs-core/mdx-plugins/rehype-code';
import remarkRehype from 'remark-rehype';
import { highlightHast } from 'fumadocs-core/highlight';
import type { CodeToHastOptionsCommon, CodeOptionsThemes, BundledTheme } from 'shiki';

export interface MarkdownRenderer {
  renderTypeToHast: (type: string) => Nodes | Promise<Nodes>;
  renderMarkdownToHast: (md: string) => Nodes | Promise<Nodes>;
}

export type ShikiOptions = Omit<CodeToHastOptionsCommon, 'lang'> & CodeOptionsThemes<BundledTheme>;

export function markdownRenderer(options?: ShikiOptions): MarkdownRenderer {
  const processor = remark()
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeCode, {
      langs: ['ts', 'tsx'],
      // disable default transformers & meta parser
      transformers: [],
      parseMetaString: undefined,
      ...options,
    });
  return {
    async renderTypeToHast(type) {
      const nodes = await highlightHast(type, {
        lang: 'ts',
        structure: 'inline',
        defaultColor: false,
        ...options,
      });

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
