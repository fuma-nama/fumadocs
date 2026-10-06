import type { Root } from 'mdast';
import type { ReactNode } from 'react';
import { remark } from 'remark';
import { visit } from 'unist-util-visit';

export interface SortedResult<Content = string> {
  id: string;
  url: string;
  type: 'page' | 'heading' | 'text';
  content: Content;

  /**
   * breadcrumbs to be displayed on UI
   */
  breadcrumbs?: Content[];
  /**
   * @deprecated it is now included in `content` as Markdown using `<mark />`.
   */
  contentWithHighlights?: HighlightedText<Content>[];
}

export type ReactSortedResult = SortedResult<ReactNode>;

export interface HighlightedText<Content = string> {
  type: 'text';
  content: Content;
  styles?: {
    highlight?: boolean;
  };
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildRegexFromQuery(q: string): RegExp | null {
  const trimmed = q.trim();
  if (trimmed.length === 0) return null;
  const terms = Array.from(new Set(trimmed.split(/\s+/).filter(Boolean)));
  if (terms.length === 0) return null;
  const escaped = terms.map(escapeRegExp).join('|');
  return new RegExp(`(${escaped})`, 'gi');
}

const processor = remark();

export function createContentHighlighter(query: string | RegExp) {
  const regex = typeof query === 'string' ? buildRegexFromQuery(query) : query;

  return {
    /**
     * @deprecated use `highlightMarkdown()` instead.
     */
    highlight(content: string): HighlightedText[] {
      if (!regex) return [{ type: 'text', content }];
      const out: HighlightedText[] = [];

      let i = 0;
      for (const match of content.matchAll(regex)) {
        if (i < match.index) {
          out.push({
            type: 'text',
            content: content.substring(i, match.index),
          });
        }

        out.push({
          type: 'text',
          content: match[0],
          styles: {
            highlight: true,
          },
        });

        i = match.index + match[0].length;
      }

      if (i < content.length) {
        out.push({
          type: 'text',
          content: content.substring(i),
        });
      }

      return out;
    },
    /**
     * @param content - Markdown, it assumes the content is already sanitized & safe, no escape is performed.
     */
    highlightMarkdown(content: string): string {
      if (!regex) return content;
      const tree = processor.parse(content);
      highlightInTree(tree, regex);
      return processor.stringify(tree).trim();
    },
  };
}

function highlightInTree(tree: Root, regex: RegExp) {
  visit(tree, 'text', (node) => {
    node.type = 'html' as never;
    node.value = mark(node.value, regex);
  });

  visit(tree, 'inlineCode', (node) => {
    if (node.value.search(regex) === -1) return;
    node.type = 'html' as never;
    node.value = `<code>${mark(node.value, regex, escapeHtml)}</code>`;
  });
}

function mark(content: string, regex: RegExp, escape = (s: string) => s): string {
  let out = '';

  let i = 0;
  for (const match of content.matchAll(regex)) {
    if (i < match.index) {
      out += escape(content.substring(i, match.index));
    }

    out += `<mark>${escape(match[0])}</mark>`;
    i = match.index + match[0].length;
  }

  if (i < content.length) {
    out += escape(content.substring(i));
  }

  return out;
}

// raw HTML parses the `<` that a code span showed as text
function escapeHtml(s: string): string {
  return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}
