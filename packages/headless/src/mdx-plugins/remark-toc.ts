import { flattenNode } from './remark-utils'
import { visit } from './unist-visit'
import type { TOCItemType } from '@/server/types'
import Slugger from 'github-slugger'
import type { Heading, Root } from 'mdast'
import type { Transformer } from 'unified'

const slugger = new Slugger()

/**
 * Attach an array of `TOCItemType` to `vfile.data.toc`
 */
export function remarkToc(): Transformer<Root, Root> {
  return (node, file) => {
    const toc: TOCItemType[] = []
    slugger.reset()

    visit(node, ['heading'], (heading: Heading) => {
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
