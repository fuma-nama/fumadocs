import type { StructuredData } from 'fumadocs-core/mdx-plugins/remark-structure';
import type { TOCItemType } from 'fumadocs-core/toc';

/** the key in `remarkPluginFrontmatter` holding {@link FumadocsData} */
export const dataKey = '_fumadocs';

export interface FumadocsData {
  toc: TOCItemType[];
  structuredData: StructuredData;
  /** with `includeProcessedMarkdown` */
  markdown?: string;
  /** with `output: 'function'`, the key of its function output in `registerMarkdown()` */
  markdownId?: string;
}

/** `getText('processed')` without `includeProcessedMarkdown` */
export class NoProcessedMarkdownError extends Error {
  constructor() {
    super(
      "getText('processed') requires `includeProcessedMarkdown` in the options of the Fumadocs integration.",
    );
  }
}

/** a node of the island tree, see `island-plugin.ts` */
export type IslandNode =
  | string
  | { $slot: string }
  | [tagName: string, properties: Record<string, unknown> | 0, ...children: IslandNode[]]
  | [jsx: 1, name: string | null, props: Record<string, unknown>, ...children: IslandNode[]];
