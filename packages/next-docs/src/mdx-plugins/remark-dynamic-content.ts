/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from 'fs'
import path from 'path'
import type { Plugin } from 'unified'
import { visit } from 'unist-util-visit'

const regex = /^\|reference:(.+)\|/

type Options = {
  /** @default process.cwd() */
  cwd?: string
  /** @default true */
  trim?: boolean
}

/**
 * Copy content from referenced file
 *
 * @example
 * |reference:../path/to/file.ts|
 */
export function remarkDynamicContent(options: Options = {}): Plugin {
  const { cwd = process.cwd(), trim = true } = options

  return (tree: any) => {
    visit(tree, ['text', 'code'], node => {
      const result = regex.exec(node.value)

      if (result && result[1]) {
        const dest = path.resolve(cwd, result[1])

        node.value = fs.readFileSync(dest).toString()
        if (trim) node.value = node.value.trim()
      }
    })
  }
}
