import { remarkToc } from '@/mdx-plugins'
import { remark } from 'remark'
import type { TableOfContents } from './types'

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
