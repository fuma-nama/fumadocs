import type { TableOfContents } from './types'
import { remarkToc } from '@/mdx-plugins/remark-toc'
import { remark } from 'remark'

/**
 * Get Table of Contents from markdown/mdx document (using remark)
 *
 * @param content Markdown content
 */
export async function getTableOfContents(
  content: string
): Promise<TableOfContents> {
  const result = await remark().use(remarkToc).process(content)

  return (result.data.toc as TableOfContents) ?? []
}
