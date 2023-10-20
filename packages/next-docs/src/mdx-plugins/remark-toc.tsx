// @ts-nocheck
import type { TOCItemType } from '@/server/types'
import Slugger from 'github-slugger'
import type { Root } from 'mdast'
import type { Transformer } from 'unified'
import { visit } from 'unist-util-visit'
import { flattenNode } from './remark-utils'

const slugger = new Slugger()
const textTypes = ['text', 'emphasis', 'strong', 'inlineCode']

/**
 * Attach an array of `TOCItemType` to `vfile.data.toc`
 */
export function remarkToc(): Transformer<Root, Root> {
  return (node, file) => {
    const toc: TOCItemType[] = []
    slugger.reset()

    visit(node, ['heading'], node => {
      const text = flattenNode(node, textTypes)

      toc.push({
        title: text,
        url: '#' + slugger.slug(text),
        depth: node.depth
      })
    })

    file.data.toc = toc
  }
}
