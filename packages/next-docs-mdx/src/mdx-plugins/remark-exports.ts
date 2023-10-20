import type { Root } from 'mdast'
import type { Transformer } from 'unified'
import { getMdastExport } from './utils'

type Options = {
  /**
   * Values to export from `vfile.data`
   */
  values: string[]
}

/**
 * Export properties from `vfile.data`
 */
function remarkMdxExport({ values }: Options): Transformer<Root, Root> {
  return (tree, vfile) => {
    for (const name of values) {
      if (!(name in vfile.data)) return

      // @ts-ignore
      tree.children.unshift(getMdastExport(name, vfile.data[name]))
    }
  }
}

export { remarkMdxExport as default, Options }
