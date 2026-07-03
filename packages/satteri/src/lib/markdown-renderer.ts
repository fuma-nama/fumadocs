import type { ElementContent, Nodes } from 'hast';
import { markdownToHast } from 'satteri';
import { highlightHast, type HighlightHastOptions } from 'fumadocs-core/highlight';

export interface MarkdownRenderer {
  renderTypeToHast: (type: string) => Nodes | Promise<Nodes>;
  renderMarkdownToHast: (md: string) => Nodes | Promise<Nodes>;
}

export type ShikiOptions = Omit<HighlightHastOptions, 'lang' | 'structure'>;

function sanitizeHast(node: Nodes): Nodes {
  if (node.type === 'raw') {
    return { type: 'text', value: node.value };
  }

  if ('children' in node && Array.isArray(node.children)) {
    return {
      ...node,
      children: node.children.map((child) => sanitizeHast(child as Nodes)),
    } as Nodes;
  }

  return node;
}

function renderMarkdownToHast(md: string): Nodes {
  md = md.replace(/{@link (?<link>[^}]*)}/g, '$1');
  return sanitizeHast(markdownToHast(md, { features: { gfm: true } }));
}

export function markdownRenderer(options?: ShikiOptions): MarkdownRenderer {
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
    renderMarkdownToHast,
  };
}
