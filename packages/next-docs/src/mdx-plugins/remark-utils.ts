// @ts-nocheck
import type { Content } from 'mdast'
import { visit } from 'unist-util-visit'

export function flattenNode(node: Content, textTypes: string[]): string {
  const p: string[] = []
  visit(node, textTypes, node => {
    if (typeof node.value !== 'string') return
    p.push(node.value)
  })
  return p.join('')
}
