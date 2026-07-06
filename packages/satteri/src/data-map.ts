import type { StructuredData } from 'fumadocs-core/mdx-plugins/remark-structure';
import type { TOCItemType } from 'fumadocs-core/toc';
import type { RehypeTocESMItemType, RehypeTocItemType } from './rehype-toc';

/** host compiler hooks (e.g. a bundler loader), used for watch-mode dependency tracking */
export interface CompilerHooks {
  addDependency: (file: string) => void;
}

declare module 'satteri' {
  interface DataMap {
    frontmatter?: Record<string, unknown>;
    structuredData?: StructuredData;
    toc?: TOCItemType[];
    rehypeToc?: RehypeTocItemType[];
    _exports?: string[];
    _tocEsmExport?: { name: string; items: RehypeTocESMItemType[] };
    _imageImports?: string[];
    _valueToExport?: string[];
    _markdown?: string;
    _cwd?: string;
    _compiler?: CompilerHooks;
    extractedReferences?: { href: string }[];
  }
}
