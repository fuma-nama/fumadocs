import type { Nodes, Root } from 'hast';
import { fromDom } from 'hast-util-from-dom';
import { micromark, type Options } from 'micromark';
import { gfmTable, gfmTableHtml } from 'micromark-extension-gfm-table';
import type { SortedResult } from '@/search';
import type { SearchResultItem, SearchResultTable } from './use-search';

const options: Options = {
  allowDangerousHtml: true,
  extensions: [gfmTable()],
  htmlExtensions: [gfmTableHtml()],
};

/**
 * Parse the Markdown content of results with the HTML parser of browsers, and gather the rows of a table after its first row, tables are scoped to the page before them.
 */
export function parseResults(results: SortedResult[]): SearchResultItem[] {
  const items: SearchResultItem[] = [];
  const tables = new Map<string, SearchResultTable>();
  const template = document.createElement('template');

  for (const result of results) {
    if (result.type === 'page') tables.clear();
    template.innerHTML = micromark(result.content, options);
    const record = { ...result, hastContent: toHast(template.content) };
    const table = template.content.firstElementChild;
    if (!(table instanceof HTMLTableElement) || table.rows.length === 0) {
      items.push(record);
      continue;
    }

    let entry = result.table ? tables.get(result.table) : undefined;
    if (!entry) {
      const columns = table.rows[0].cells.length;
      // a row without header is parsed as the header row
      const body = table.tHead && table.tBodies.item(0);
      body?.remove();
      entry = {
        type: 'table',
        id: result.id,
        columns,
        header: body ? toHast(template.content) : undefined,
        rows: [],
      };
      items.push(entry);
      if (result.table) tables.set(result.table, entry);
    }
    entry.rows.push(record);
  }

  return items;
}

function toHast(fragment: DocumentFragment) {
  return fromDom(fragment, { afterTransform }) as Root;
}

/** elements unknown to HTML, like the JSX elements of records, become `custom` elements with a `tagName` property */
function afterTransform(node: Node, hast: Nodes) {
  if (hast.type === 'element' && node instanceof HTMLUnknownElement) {
    hast.properties.tagName = hast.tagName;
    hast.tagName = 'custom';
  }
}
