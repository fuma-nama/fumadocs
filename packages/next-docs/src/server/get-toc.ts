/* eslint-disable */

import Slugger from 'github-slugger'
import { remark } from 'remark'
import { visit } from 'unist-util-visit'
import type { TableOfContents, TOCItemType } from './types'

const slugger = new Slugger()
const textTypes = ['text', 'emphasis', 'strong', 'inlineCode']

function flattenNode(node: any) {
  const p: any[] = []
  visit(node, node => {
    if (!textTypes.includes(node.type)) return
    p.push(node.value)
  })
  return p.join(``)
}

function scan(node: any, items: TOCItemType[]) {
  if (node.type === 'heading') {
    const text = flattenNode(node)

    items.push({
      title: text,
      url: '#' + slugger.slug(text),
      depth: node.depth ?? 1
    })
  } else {
    node.children?.forEach((item: any) => scan(item, items))
  }
}

const getToc = () => (node: any, file: any) => {
  const toc: TOCItemType[] = []
  slugger.reset()

  scan(node, toc)

  file.data = {
    items: toc
  }
}

/**
 * Get Table of Contents from markdown/mdx document (using remark)
 *
 * @param content Markdown content
 */
export async function getTableOfContents(
  content: string
): Promise<TableOfContents> {
  const result = await remark().use(getToc).process(content)

  return (result.data.items as TableOfContents) ?? []
}
