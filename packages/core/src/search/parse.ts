import type { Element, Root } from 'hast';
import type { Processor } from 'unified';
import { remark } from 'remark';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import { gfmTable } from 'micromark-extension-gfm-table';
import { gfmTableFromMarkdown } from 'mdast-util-gfm-table';
import { visit } from 'unist-util-visit';
import type { SortedResult } from '@/search';
import type { SearchResultItem, SearchResultRecord, SearchResultTable } from './use-search';

const processor = remark()
  .use(remarkTable)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypeCustomElements);

/**
 * Parse the Markdown content of results, and gather the rows of a table after its first row, tables are scoped to the page before them.
 */
export function parseResults(results: SortedResult[]): SearchResultItem[] {
  const items: SearchResultItem[] = [];
  const tables = new Map<string, SearchResultTable>();

  for (const result of results) {
    if (result.type === 'page') tables.clear();
    const record: SearchResultRecord = {
      ...result,
      hastContent: processor.runSync(processor.parse(result.content)),
    };
    const table = record.hastContent.children.find((node) => node.type === 'element');
    // a row without header is parsed as the header row
    const [head, body] = table?.tagName === 'table' ? (table.children as Element[]) : [];
    const row = (body ?? head)?.children[0] as Element | undefined;
    if (!table || !row) {
      items.push(record);
      continue;
    }

    let entry = result.table ? tables.get(result.table) : undefined;
    if (!entry) {
      entry = {
        type: 'table',
        id: result.id,
        columns: row.children.length,
        header: body && { type: 'root', children: [{ ...table, children: [head] }] },
        rows: [],
      };
      items.push(entry);
      if (result.table) tables.set(result.table, entry);
    }
    entry.rows.push(record);
  }

  return items;
}

function remarkTable(this: Processor) {
  const data = this.data() as Record<string, unknown[]>;
  (data.micromarkExtensions ??= []).push(gfmTable());
  (data.fromMarkdownExtensions ??= []).push(gfmTableFromMarkdown());
}

/** elements unknown to HTML, like the JSX elements of records, become `custom` elements with a `tagName` property */
function rehypeCustomElements() {
  return (tree: Root) => {
    if (typeof document === 'undefined') return;

    visit(tree, 'element', (node) => {
      if (document.createElement(node.tagName) instanceof HTMLUnknownElement) {
        node.properties.tagName = node.tagName;
        node.tagName = 'custom';
      }
    });
  };
}
