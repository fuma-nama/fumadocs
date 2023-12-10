import { visit } from './unist-visit'
import type { Literal, RootContent } from 'mdast'

const textTypes = ['text', 'inlineCode', 'code']

export function flattenNode(node: RootContent): string {
  const p: string[] = []

  visit(node, textTypes, (child: Literal) => {
    p.push(child.value)
  })

  return p.join('')
}
