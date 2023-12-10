import { visit } from './unist-visit'
import fs from 'fs'
import type { Root, RootContent } from 'mdast'
import path from 'path'
import type { Transformer } from 'unified'

const regex = /^\|reference:(.+)\|/

export type Options = {
  /** @default process.cwd() */
  cwd?: string
  /** @default true */
  trim?: boolean

  /**
   * Filter specific element types
   * @default ['text','code']
   * */
  visit?: string[]
}

/**
 * Copy content from referenced file
 *
 * @example
 * |reference:../path/to/file.ts|
 */
export function remarkDynamicContent(
  options: Options = {}
): Transformer<Root, Root> {
  const {
    cwd = process.cwd(),
    trim = true,
    visit: filter = ['text', 'code']
  } = options

  return tree => {
    visit(tree, filter, (node: RootContent) => {
      if (!('value' in node) || typeof node.value !== 'string') return
      const result = regex.exec(node.value)

      if (result && result[1]) {
        const dest = path.resolve(cwd, result[1])
        let value = fs.readFileSync(dest).toString()
        if (trim) value = value.trim()

        node.value = value
      }
    })
  }
}
