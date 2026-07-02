import type { Element } from 'hast';
import type { MdxjsEsm } from 'satteri';
import type { StructuredData } from 'fumadocs-core/mdx-plugins/remark-structure';
import type { TOCItemType } from 'fumadocs-core/toc';

export interface TocJsxExportItem {
  title: Element;
  url: string;
  depth: number;
  _step?: number;
}

declare module 'satteri' {
  interface DataMap {
    frontmatter?: Record<string, unknown>;
    structuredData?: StructuredData;
    toc?: TOCItemType[];
    rehypeToc?: TocJsxExportItem[];
    _exports?: string[];
    _tocEsmExport?: { name: string; items: TocJsxExportItem[] };
    _imageImports?: MdxjsEsm[];
    _valueToExport?: string[];
    _markdown?: string;
    _cwd?: string;
    extractedReferences?: { href: string }[];
  }
}
