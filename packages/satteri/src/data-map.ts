import type { MdxjsEsm } from 'satteri';
import type { StructuredData } from 'fumadocs-core/mdx-plugins/remark-structure';
import type { TOCItemType } from 'fumadocs-core/toc';

export interface TocJsxExportItem {
  title: string;
  url: string;
  depth: number;
  _step?: number;
}

/** host compiler hooks (e.g. a bundler loader), used for watch-mode dependency tracking */
export interface CompilerHooks {
  addDependency: (file: string) => void;
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
    _compiler?: CompilerHooks;
    extractedReferences?: { href: string }[];
  }
}
