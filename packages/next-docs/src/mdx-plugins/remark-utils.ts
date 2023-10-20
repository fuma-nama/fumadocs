import type { Content, Literal } from 'mdast'
import { visit } from 'unist-util-visit'

const textTypes = ['text', 'inlineCode', 'code']

export function flattenNode(node: Content): string {
  const p: string[] = []

  visit(node, textTypes, child => {
    p.push((child as Literal).value)
  })

  return p.join('')
}
