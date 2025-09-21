import type { ReactNode } from 'react';

export interface SortedResult<Content = string> {
  id: string;
  url: string;
  type: 'page' | 'heading' | 'text';
  content: Content;

  /**
   * breadcrumbs to be displayed on UI
   */
  breadcrumbs?: Content[];
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
  const terms = Array.from(
    new Set(
      trimmed
        .split(/\s+/)
        .map((t) => t.trim())
        .filter(Boolean),
    ),
  );
  if (terms.length === 0) return null;
  const escaped = terms.map(escapeRegExp).join('|');
  return new RegExp(`(${escaped})`, 'gi');
}

export function createContentHighlighter(query: string | RegExp) {
  const regex = typeof query === 'string' ? buildRegexFromQuery(query) : query;

  return {
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
  };
}
