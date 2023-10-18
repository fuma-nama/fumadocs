// @ts-nocheck
import Slugger from 'github-slugger'
import type { Root } from 'hast'
import rehypePrettycode, {
  type Options as RehypePrettyCodeOptions
} from 'rehype-pretty-code'
import type { Transformer } from 'unified'
import { flattenNode, visit } from './utils'

const slugger = new Slugger()
const headings = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']
const customMetaRegex = /custom="([^"]+)"/

const rehypePrettyCodeOptions: RehypePrettyCodeOptions = {
  theme: 'css-variables',
  defaultLang: {
    block: 'text'
  },
  grid: true,
  keepBackground: false,
  filterMetaString(s) {
    return s.replace(customMetaRegex, '')
  }
}

/**
 * Handle codeblocks and heading slugs
 */
export const rehypeNextDocs = (): Transformer<Root, Root> => async tree => {
  slugger.reset()

  visit(tree, ['pre', ...headings], node => {
    if (headings.includes(node.tagName)) {
      if (!node.properties || !('id' in node.properties)) {
        node.properties.id = slugger.slug(flattenNode(node))
      }

      return
    }

    if (node.tagName === 'pre') {
      const [codeEl] = node.children

      // Allow custom code meta
      if (typeof codeEl.data?.meta === 'string') {
        node.nd_custom = codeEl.data.meta.match(customMetaRegex)?.[1]
      }
    }
  })

  await rehypePrettycode(rehypePrettyCodeOptions)(tree)

  visit(tree, ['div', 'pre'], node => {
    // Remove default fragment div
    // Add title to pre element
    if ('data-rehype-pretty-code-fragment' in node.properties) {
      if (node.children.length === 0) return

      let preEl = node.children[0]

      if ('data-rehype-pretty-code-title' in preEl.properties) {
        const title = preEl.children[0].value
        preEl = node.children[1]

        if (!preEl) return
        preEl.properties.title = title
      }

      Object.assign(node, preEl)
    }

    // Add custom meta to properties
    node.properties.custom = node.nd_custom
  })
}
