import type { Root } from 'mdast';
import type { ReactNode } from 'react';
import { remark } from 'remark';
import { visit } from 'unist-util-visit';
import type { StructuredDataContent } from '@/mdx-plugins/remark-structure';
import { buildRegexFromQuery } from './highlight';

export interface SortedResult<Content = string> {
  id: string;
  url: string;
  type: 'page' | 'heading' | 'text';
  content: Content;

  /**
   * breadcrumbs to be displayed on UI
   */
  breadcrumbs?: Content[];

  /** the table of a table row, unique in its page */
  table?: string;
}

export type ReactSortedResult = SortedResult<ReactNode>;

/**
 * A table row as structured data: a Markdown table of the row, after the header row of its table.
 */
export function tableRowToStructuredData({
  table,
  heading,
  row,
  header,
}: {
  /** the id of its table, unique in its page */
  table: string;
  heading?: string;
  /** the cells, as inline Markdown */
  row: string[];
  /** the cells of the header row, tables like the props of type tables have none */
  header?: string[];
}): StructuredDataContent {
  const formatRow = (cells: string[]) => {
    let out = '|';
    for (const cell of cells)
      out += ` ${cell.replace(/\s*\n\s*/g, ' ').replace(/(?<!\\)\|/g, '\\|')} |`;
    return out;
  };
  const delimiter = `|${' --- |'.repeat((header ?? row).length)}`;

  return {
    heading,
    content: header
      ? `${formatRow(header)}\n${delimiter}\n${formatRow(row)}`
      : `${formatRow(row)}\n${delimiter}`,
    table,
  };
}

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

/**
 * @deprecated search results are no longer highlighted, highlight the rendered results with `useHighlightQuery()` instead.
 */
export function createContentHighlighter(query: string | RegExp) {
  const processor = remark();
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
