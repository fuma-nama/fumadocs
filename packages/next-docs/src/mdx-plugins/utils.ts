// @ts-nocheck
import type { Node } from 'hast'

/**
 * Visit a node with filtered tag names
 */
export function visit(
  node: Node,
  tagNames: string[],
  handler: (node: Node) => void
) {
  if (tagNames.includes(node.tagName)) {
    handler(node)
    return
  }

  node.children?.forEach(n => visit(n, tagNames, handler))
}

export function flattenNode(node: Node): string {
  if ('children' in node) {
    return all(node)
  }

  return 'value' in node ? node.value : ''
}

function one(node: Node): string {
  if (node.type === 'text') {
    return node.value
  }

  return 'children' in node ? all(node) : ''
}

function all(node: Node) {
  const result: string[] = []

  for (let i = 0; i < node.children.length; i++) {
    result[i] = one(node.children[i])
  }

  return result.join('')
}
