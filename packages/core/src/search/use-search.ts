import { useCallback, useEffect, useState } from 'react';
import type { Root } from 'hast';
import type { SortedResult } from '@/search';
import type { Awaitable } from '@/types';
import { buildRegexFromQuery } from './highlight';

export interface UseSearchOptions {
  /**
   * The debounced delay for performing a search (in ms).
   *
   * @defaultValue 100
   */
  delayMs?: number;

  /**
   * still perform search even if query is empty.
   *
   * @defaultValue false
   */
  allowEmpty?: boolean;
}

export interface SearchResultRecord extends SortedResult {
  /** `content` decoded */
  hastContent: Root;
}

export interface SearchResultTable {
  type: 'table';
  /** the id of its first row */
  id: string;
  columns: number;
  /** tables like the props of type tables have no header */
  header?: Root;
  rows: SearchResultRecord[];
}

export type SearchResultItem = SearchResultRecord | SearchResultTable;

export interface SearchResult {
  /** the query of the last completed search */
  query: string;
  /** `undefined` when nothing is searched */
  items?: SearchResultItem[];
  /** the search failed, `items` are kept from the search before */
  error?: Error;
}

export interface UseSearchReturn {
  search: string;
  onSearchChange: (search: string) => void;
  isLoading: boolean;
  /** the last completed search */
  result: SearchResult;
}

const idle: { result: SearchResult; run?: unknown } = { result: { query: '' } };

/**
 * The base of search hooks.
 *
 * @param run - memoized search function, search again when changed
 */
export function useSearch(
  run: (query: string) => Awaitable<SortedResult[]>,
  { delayMs = 100, allowEmpty = false }: UseSearchOptions = {},
): UseSearchReturn {
  const [search, setSearch] = useState('');
  const [done, setDone] = useState(idle);
  const empty = search.length === 0 && !allowEmpty;
  if (empty && done !== idle) setDone(idle);

  useEffect(() => {
    if (empty) return;

    let active = true;
    const timer = setTimeout(async () => {
      try {
        const [results, { decodeResults }] = await Promise.all([run(search), import('./decode')]);
        const items = decodeResults(results);
        if (active) setDone({ result: { query: search, items }, run });
      } catch (error) {
        if (active)
          setDone((prev) => ({
            result: { ...prev.result, query: search, error: error as Error },
            run,
          }));
      }
    }, delayMs);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search, empty, delayMs, run]);

  return {
    search,
    onSearchChange: setSearch,
    isLoading: !empty && (done.result.query !== search || done.run !== run),
    result: done.result,
  };
}

/**
 * Highlight matches of `query` in the text of an element with the CSS Custom Highlight API, style them with `::highlight(fd-search)`.
 *
 * Text in elements with `data-highlight-ignore` is skipped. The highlights stay when the element is moved, but not when its text changes, give it a new `key` in that case.
 *
 * @returns a ref callback for the element
 */
export function useHighlightQuery(query: string) {
  return useCallback(
    (element: Element | null) => {
      const regex = buildRegexFromQuery(query);
      if (!element || !regex || typeof Highlight === 'undefined') return () => {};

      let highlight = CSS.highlights.get('fd-search');
      if (!highlight) CSS.highlights.set('fd-search', (highlight = new Highlight()));

      const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
        (node) => {
          if (!(node instanceof Element)) return NodeFilter.FILTER_ACCEPT;
          return node.hasAttribute('data-highlight-ignore')
            ? NodeFilter.FILTER_REJECT
            : NodeFilter.FILTER_SKIP;
        },
      );
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
    },
    [query],
  );
}
