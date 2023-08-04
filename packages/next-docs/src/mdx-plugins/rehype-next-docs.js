import Slugger from 'github-slugger'
import { toString as flattenNode } from 'hast-util-to-string'
import rehypePrettycode from 'rehype-pretty-code'
import { visit } from './utils'

const slugger = new Slugger()
const headings = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']
const customMetaRegex = /custom="([^"]+)"/

/**
 * @type {import('rehype-pretty-code').Options}
 */
const rehypePrettyCodeOptions = {
  theme: 'css-variables',
  keepBackground: false,
  onVisitLine(node) {
    if (node.children.length === 0) {
      node.children = [{ type: 'text', value: ' ' }]
    }
  },
  filterMetaString(s) {
    return s.replace(customMetaRegex, '')
  },
  onVisitHighlightedLine(node) {
    node.properties.className.push('line-highlighted')
  },
  onVisitHighlightedWord(node) {
    node.properties.className = ['word-highlighted']
  }
}

/**
 * Handle codeblocks and heading slugs
 */
export const rehypeNextDocs = () => async tree => {
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

      // Add default language `text` for code-blocks
      codeEl.properties.className ||= ['language-text']
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
