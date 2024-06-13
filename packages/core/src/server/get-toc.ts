import { remark } from 'remark';
import type { ReactNode } from 'react';
import { remarkHeading } from '@/mdx-plugins/remark-heading';

export interface TOCItemType {
  title: ReactNode;
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
  const result = await remark().use(remarkHeading).process(content);

  if ('toc' in result.data) return result.data.toc as TableOfContents;

  return [];
}
