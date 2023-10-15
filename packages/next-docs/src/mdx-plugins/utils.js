/**
 * @typedef {import('hast').Nodes} Nodes
 * @typedef {import('hast').Parents} Parents
 */

/**
 * Visit a node with filtered tag names
 *
 * @param {Nodes} node
 *   Node to visit.
 * @param {Array<string>} tagNames
 * @param {(node: Nodes) => void} handler
 */
export function visit(node, tagNames, handler) {
  if (tagNames.includes(node.tagName)) {
    handler(node)
    return
  }

  node.children?.forEach(n => visit(n, tagNames, handler))
}

/**
 * Get the plain-text value of a hast node.
 *
 * @param {Nodes} node
 *   Node to serialize.
 * @returns {string}
 *   Serialized node.
 */
export function flattenNode(node) {
  // “The concatenation of data of all the Text node descendants of the context
  // object, in tree order.”
  if ('children' in node) {
    return all(node)
  }

  // “Context object’s data.”
  return 'value' in node ? node.value : ''
}

/**
 * @param {Nodes} node
 *   Node.
 * @returns {string}
 *   Serialized node.
 */
function one(node) {
  if (node.type === 'text') {
    return node.value
  }

  return 'children' in node ? all(node) : ''
}

/**
 * @param {Parents} node
 *   Node.
 * @returns {string}
 *   Serialized node.
 */
function all(node) {
  /** @type {Array<string>} */
  const result = []

  for (let i = 0; i < node.children.length; i++) {
    result[i] = one(node.children[i])
  }

  return result.join('')
}
