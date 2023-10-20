import { type Literal, type Root } from 'mdast'
import type { Transformer } from 'unified'
import { parse as parseYaml } from 'yaml'
import { getMdastExport } from './utils'

export interface RemarkMdxFrontmatterOptions {
  /**
   * Exported name
   * @default 'frontmatter'
   */
  name?: string
}

/**
 * A remark plugin to expose frontmatter data as named exports.
 *
 * @param options Optional options to configure the output.
 * @returns A unified transformer.
 */
function remarkMdxFrontmatter({
  name = 'frontmatter'
}: RemarkMdxFrontmatterOptions = {}): Transformer<Root, Root> {
  return ast => {
    let data: unknown = {}
    const node = ast.children.find(child => child.type === 'yaml')

    if (node) {
      const { value } = node as Literal
      data = parseYaml(value)
    }

    // @ts-ignore Supported by MDX
    ast.children.unshift(getMdastExport(name, data))
  }
}

export default remarkMdxFrontmatter
