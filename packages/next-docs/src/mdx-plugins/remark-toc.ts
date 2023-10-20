import type { TOCItemType } from '@/server/types'
import Slugger from 'github-slugger'
import type { Heading, Root } from 'mdast'
import type { Transformer } from 'unified'
import { visit } from 'unist-util-visit'
import { flattenNode } from './remark-utils'

const slugger = new Slugger()

/**
 * Attach an array of `TOCItemType` to `vfile.data.toc`
 */
export function remarkToc(): Transformer<Root, Root> {
  return (node, file) => {
    const toc: TOCItemType[] = []
    slugger.reset()

    visit(node, ['heading'], child => {
      const heading = child as Heading
      const text = flattenNode(heading)

      toc.push({
        title: text,
        url: '#' + slugger.slug(text),
        depth: heading.depth
      })

      return 'skip'
    })

    file.data.toc = toc
  }
}
