// @ts-nocheck
import rehypeImgSize from 'rehype-img-size'
import rehypePrettycode, {
  type Options as CodeOptions
} from 'rehype-pretty-code'
import remarkGfm from 'remark-gfm'
import rehypeSlug from './rehype-slug'

function visit(node, tagNames, handler) {
  if (tagNames.includes(node.tagName)) {
    handler(node)
    return
  }

  node.children?.forEach(n => visit(n, tagNames, handler))
}

const customMetaRegex = /custom="([^"]+)"/

/**
 * Should be added before rehype-pretty-code
 */
const rehypeCodeBlocksPreprocess = () => tree => {
  visit(tree, ['pre'], preEl => {
    const [codeEl] = preEl.children

    // Allow custom code meta
    if (typeof codeEl.data?.meta === 'string') {
      preEl.nd_custom = codeEl.data.meta.match(customMetaRegex)?.[1]
    }

    // Add default language `text` for code-blocks
    codeEl.properties.className ||= ['language-text']
  })
}

/**
 * Should be added after rehype-pretty-code
 */
const rehypeCodeBlocksPostprocess = () => tree => {
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

/**
 * Default options for rehype-pretty-code
 */
const rehypePrettyCodeOptions: Partial<CodeOptions> = {
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

export {
  rehypeCodeBlocksPostprocess,
  rehypeCodeBlocksPreprocess,
  rehypePrettycode,
  rehypeImgSize,
  rehypeSlug,
  remarkGfm,
  rehypePrettyCodeOptions
}
