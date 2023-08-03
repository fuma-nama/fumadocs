// @ts-nocheck
import Slugger from 'github-slugger'
import { toString } from 'hast-util-to-string'
import { visit } from './utils'

const slugs = new Slugger()

export default function rehypeSlug() {
  return tree => {
    slugs.reset()

    visit(tree, ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'], node => {
      if (node.properties && !('id' in node.properties)) {
        node.properties.id = slugs.slug(toString(node))
      }
    })
  }
}
