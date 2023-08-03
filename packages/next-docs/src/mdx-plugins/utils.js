export function visit(node, tagNames, handler) {
  if (tagNames.includes(node.tagName)) {
    handler(node)
    return
  }

  node.children?.forEach(n => visit(n, tagNames, handler))
}
