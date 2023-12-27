import { remark } from 'remark';
import { remarkToc } from '@/mdx-plugins/remark-toc';

export interface TOCItemType {
  title: string;
  url: string;
  depth: number;
}

export type TableOfContents = TOCItemType[];

/**
 * Get Table of Contents from markdown/mdx document (using remark)
 *
 * @param content - Markdown content
 */
export async function getTableOfContents(
  content: string,
): Promise<TableOfContents> {
  const result = await remark().use(remarkToc).process(content);

  if ('toc' in result.data) return result.data.toc as TableOfContents;

  return [];
}
