import type { StructuredData } from 'fumadocs-core/mdx-plugins/remark-structure';
import type { TOCItemType } from 'fumadocs-core/toc';
import type { RehypeTocItemType } from './rehype-toc';

/** host compiler hooks (e.g. a bundler loader), used for watch-mode dependency tracking */
export interface CompilerHooks {
  addDependency: (file: string) => void;
}

declare module 'satteri' {
  interface DataMap {
    /** `remark-structure` */
    structuredData?: StructuredData;
    /** `remark-heading` */
    toc?: TOCItemType[];
    /** `rehype-toc` */
    rehypeToc?: RehypeTocItemType[];
    /** `remark-llms` */
    markdown?: string;
    /** `remark-image` */
    _imageImports?: string[];

    _cwd?: string;
    _compiler?: CompilerHooks;
    _valueToExport?: string[];
    frontmatter?: Record<string, unknown>;
  }
}

export type BuildEnvironment = 'bundler' | 'runtime';
