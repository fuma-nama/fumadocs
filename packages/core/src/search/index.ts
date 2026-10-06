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
}

export type ReactSortedResult = SortedResult<ReactNode>;

/**
 * @deprecated
 */
export interface HighlightedText<Content = string> {
  type: 'text';
  content: Content;
  styles?: {
    highlight?: boolean;
  };
}

function buildRegexFromQuery(query: string): RegExp | null {
  const source = query
    .trim()
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\s+/g, '|');
  return source ? new RegExp(source, 'gi') : null;
}

/**
 * Highlight matches of `query` in the text of `element` with the CSS Custom Highlight API, style them with `::highlight(fd-search)`.
 *
 * The highlights stay when `element` is moved, but not when its text changes, call it again in that case.
 *
 * @returns a function to remove the highlights
 */
export function highlightQuery(element: Element, query: string): () => void {
  const regex = buildRegexFromQuery(query);
  if (!regex || typeof Highlight === 'undefined') return () => {};

  let highlight = CSS.highlights.get('fd-search');
  if (!highlight) CSS.highlights.set('fd-search', (highlight = new Highlight()));

  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const ranges: StaticRange[] = [];
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    for (const match of node.data.matchAll(regex)) {
      const range = new StaticRange({
        startContainer: node,
        startOffset: match.index,
        endContainer: node,
        endOffset: match.index + match[0].length,
      });
      highlight.add(range);
      ranges.push(range);
    }
  }

  return () => {
    for (const range of ranges) highlight.delete(range);
  };
}

const processor = /* @__PURE__ */ remark();

/**
 * @deprecated search results are no longer highlighted, highlight the rendered results with `highlightQuery()` instead.
 */
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
    let out = '';
    const content = node.value;

    let i = 0;
    for (const match of content.matchAll(regex)) {
      if (i < match.index) {
        out += content.substring(i, match.index);
      }

      out += `<mark>${match[0]}</mark>`;
      i = match.index + match[0].length;
    }

    if (i < content.length) {
      out += content.substring(i);
    }

    node.type = 'html' as never;
    node.value = out;
  });
}
