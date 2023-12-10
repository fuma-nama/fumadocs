import { flattenNode, visit } from './hast-utils'
import Slugger from 'github-slugger'
import type { Element, Root } from 'hast'
import rehypePrettycode, {
  type Options as RehypePrettyCodeOptions
} from 'rehype-pretty-code'
import type { Transformer } from 'unified'

const slugger = new Slugger()
const headings = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']
const customMetaRegex = /custom="([^"]+)"/

const rehypePrettyCodeOptions: RehypePrettyCodeOptions = {
  theme: {
    light: 'github-light',
    dark: 'github-dark'
  },
  defaultLang: {
    block: 'text'
  },
  grid: true,
  keepBackground: false,
  filterMetaString(s) {
    return s.replace(customMetaRegex, '')
  }
}

export type RehypeNextDocsOptions = {
  codeOptions?: RehypePrettyCodeOptions
}

/**
 * Handle codeblocks and heading slugs
 */
export function rehypeNextDocs({
  codeOptions
}: RehypeNextDocsOptions = {}): Transformer<Root, Root> {
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
        const codeEl = node.children[0] as Element

        // Allow custom code meta
        if (
          codeEl.data &&
          'meta' in codeEl.data &&
          typeof codeEl.data.meta === 'string'
        ) {
          // @ts-ignore
          node.nd_custom = codeEl.data.meta.match(customMetaRegex)?.[1]
        }
      }
    })

    // @ts-ignore
    await rehypePrettycode({ ...rehypePrettyCodeOptions, ...codeOptions })(tree)

    visit(tree, ['figure', 'pre'], node => {
      node.properties ||= {}

      // Remove default fragment element
      // Add title to pre element
      if ('data-rehype-pretty-code-figure' in node.properties) {
        const titleNode = node.children.find(
          child => child.type === 'element' && child.tagName === 'figcaption'
        ) as Element | undefined
        const preNode = node.children.find(
          child => child.type === 'element' && child.tagName === 'pre'
        ) as Element | undefined

        if (!preNode) return

        if (titleNode) {
          preNode.properties ||= {}
          preNode.properties.title = flattenNode(titleNode)
        }

        Object.assign(node, preNode)
      }

      // Add custom meta to properties
      // @ts-ignore
      node.properties.custom = node.nd_custom
    })
  }
}
