import { buildRegexFromQuery } from '@/search';
import { codeToHtml } from 'shiki';
import type { ShikiTransformer } from 'shiki';
import type { Element, ElementContent, Root } from 'hast';
import type { ParsedCodeBlock } from './types';

const CODE_FENCE_RE = /^ {0,3}```([^\s`]*)[^\n]*\n([\s\S]*?)\n {0,3}```$/;

export function parseCodeBlock(content: string): ParsedCodeBlock | null {
  const match = content.trim().match(CODE_FENCE_RE);
  if (!match) {
    return null;
  }

  return {
    lang: match[1] || 'text',
    code: match[2],
  };
}

const HIGHLIGHT_STYLE = 'background-color: rgba(255, 255, 0, 0.3);';

function highlightHastNode(node: Element | Root, regex: RegExp): void {
  if (node.type === 'element' && node.tagName === 'span') {
    const text = node.children
      .filter((child): child is ElementContent & { value: string } => child.type === 'text')
      .map((child) => child.value)
      .join('');

    const matches = text ? [...text.matchAll(regex)] : [];
    if (matches.length > 0) {
      const children: ElementContent[] = [];
      let lastIndex = 0;

      const pushText = (value: string) => {
        if (value) children.push({ type: 'text', value });
      };

      for (const match of matches) {
        const start = match.index ?? 0;
        pushText(text.slice(lastIndex, start));
        children.push({
          type: 'element',
          tagName: 'span',
          properties: { class: 'highlight', style: HIGHLIGHT_STYLE },
          children: [{ type: 'text', value: match[0] }],
        });
        lastIndex = start + match[0].length;
      }
      pushText(text.slice(lastIndex));

      node.children = children;
      return;
    }
  }

  for (const child of node.children) {
    if (child.type === 'element') highlightHastNode(child, regex);
  }
}

export async function highlightCodeBlock(
  codeBlock: ParsedCodeBlock,
  query: string,
): Promise<string> {
  const wordHighlightTransformer: ShikiTransformer = {
    name: 'word-highlight',
    code(node) {
      const regex = buildRegexFromQuery(query);
      if (regex) highlightHastNode(node, regex);
    },
  };

  const blockHeightTransformer: ShikiTransformer = {
    name: 'code-block-height',
    pre(node) {
      node.properties.style = `max-height: none; height: auto; ${node.properties?.style || ''}`;
    },
  };

  return codeToHtml(codeBlock.code, {
    lang: codeBlock.lang,
    theme: codeBlock.lang ? 'one-dark-pro' : 'github-light',
    transformers: [wordHighlightTransformer, blockHeightTransformer],
  });
}
