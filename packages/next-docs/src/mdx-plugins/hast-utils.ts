import type { Content, Element, Parent, Root } from 'hast'

/**
 * Visit a node with filtered tag names
 */
export function visit(
  node: Content | Root,
  tagNames: string[],
  handler: (node: Element) => void
): void {
  if (node.type === 'element')
    if (tagNames.includes(node.tagName)) {
      handler(node)
      return
    }

  if ('children' in node)
    node.children.forEach(n => visit(n, tagNames, handler))
}

export function flattenNode(node: Content): string {
  if ('children' in node) {
    return all(node)
  }

  if (node.type === 'text') {
    return node.value
  }

  return ''
}

function one(node: Content): string {
  if (node.type === 'text') {
    return node.value
  }

  return 'children' in node ? all(node) : ''
}

function all(node: Parent): string {
  const result: string[] = []

  for (let i = 0; i < node.children.length; i++) {
    result[i] = one(node.children[i])
  }

  return result.join('')
}
