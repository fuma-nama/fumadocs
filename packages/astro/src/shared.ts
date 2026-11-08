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

export const dynamicPageKey = '_dynamicPage';

/** a page of a dynamic file is a virtual file next to it, so its relative imports resolve the same */
export function dynamicPageFile(file: string, params: Record<string, string>): string {
  return `${file}.${Buffer.from(JSON.stringify(params)).toString('base64url')}.page.mdx`;
}

export function parseDynamicPageFile(
  file: string,
): { file: string; params: Record<string, string> } | undefined {
  const match = /^(.+\.mdx)\.([\w-]+)\.page\.mdx$/.exec(file);
  if (match)
    return { file: match[1], params: JSON.parse(Buffer.from(match[2], 'base64url').toString()) };
}
