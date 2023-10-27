import Slugger from 'github-slugger'
import type { Root } from 'hast'
import rehypePrettycode, {
  type Options as RehypePrettyCodeOptions
} from 'rehype-pretty-code'
import type { Transformer } from 'unified'
import { flattenNode, visit } from './hast-utils'

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
export function rehypeNextDocs(): Transformer<Root, Root> {
  return async tree => {
    slugger.reset()

    visit(tree, ['pre', ...headings], node => {
      if (headings.includes(node.tagName)) {
        node.properties ||= {}

        if (!('id' in node.properties)) {
          node.properties.id = slugger.slug(flattenNode(node))
        }

        return
      }

      if (node.tagName === 'pre') {
        const [codeEl] = node.children

        // Allow custom code meta
        if (typeof codeEl.data?.meta === 'string') {
          // @ts-ignore
          node.nd_custom = codeEl.data.meta.match(customMetaRegex)?.[1]
        }
      }
    })

    // @ts-ignore
    await rehypePrettycode(rehypePrettyCodeOptions)(tree)

    visit(tree, ['div', 'pre'], node => {
      node.properties ||= {}

      // Remove default fragment div
      // Add title to pre element
      if ('data-rehype-pretty-code-fragment' in node.properties) {
        if (node.children.length === 0) return
        let title: string | undefined = undefined

        for (const child of node.children) {
          if (child.type !== 'element') continue
          child.properties ||= {}

          if ('data-rehype-pretty-code-title' in child.properties) {
            title = flattenNode(child)
          }

          if (child.tagName === 'pre') {
            child.properties.title = title
            Object.assign(node, child)
            break
          }
        }
      }

      // Add custom meta to properties
      // @ts-ignore
      node.properties.custom = node.nd_custom
    })
  }
}
