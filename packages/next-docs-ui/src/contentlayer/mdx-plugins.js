function visit(node, tagNames, handler) {
  if (tagNames.includes(node.tagName)) {
    handler(node)
    return
  }

  node.children?.forEach(n => visit(n, tagNames, handler))
}

/**
 * Should be added before rehype-pretty-code
 */
export const rehypeCodeBlocksPreProcess = () => tree => {
  visit(tree, ['pre'], preEl => {
    const [codeEl] = preEl.children

    // Add default language `text` for code-blocks
    codeEl.properties.className ||= ['language-text']
  })
}

/**
 * Should be added after rehype-pretty-code
 */
export const rehypeCodeBlocksPostProcess = () => tree => {
  visit(tree, ['div'], node => {
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
  })
}
