import type { ElementContent, Nodes } from 'hast';
import { remark } from 'remark';
import { remarkGfm } from 'fumadocs-core/mdx-plugins/remark-gfm';
import { rehypeCode, type RehypeCodeOptions } from 'fumadocs-core/mdx-plugins/rehype-code';
import remarkRehype from 'remark-rehype';
import { getHighlighter } from 'fumadocs-core/highlight';

const shikiOptions = {
  lazy: true,
  langs: ['ts', 'tsx'],

  // disable default transformers & meta parser
  transformers: [],
  parseMetaString: undefined,

  themes: {
    light: 'github-light',
    dark: 'github-dark',
  },
} satisfies RehypeCodeOptions;

const processor = remark().use(remarkGfm).use(remarkRehype).use(rehypeCode, shikiOptions);

export async function renderTypeToHast(type: string): Promise<Nodes> {
  const highlighter = await getHighlighter('js', {
    langs: ['ts'],
    themes: Object.values(shikiOptions.themes),
  });

  const nodes = highlighter.codeToHast(type, {
    lang: 'ts',
    structure: 'inline',
    themes: shikiOptions.themes,
    defaultColor: false,
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
}

export async function renderMarkdownToHast(md: string): Promise<Nodes> {
  md = md.replace(/{@link (?<link>[^}]*)}/g, '$1'); // replace jsdoc links

  return processor.run(processor.parse(md));
}
