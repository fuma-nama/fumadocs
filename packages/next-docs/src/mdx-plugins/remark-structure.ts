import Slugger from 'github-slugger'
import type { Root } from 'mdast'
import { remark } from 'remark'
import remarkGfm from 'remark-gfm'
import remarkMdx from 'remark-mdx'
import type { PluggableList, Transformer } from 'unified'
import { visit } from 'unist-util-visit'
import { flattenNode } from './remark-utils'

type Heading = {
  id: string
  content: string
}

type Content = {
  heading: string | undefined
  content: string
}

export type StructuredData = {
  headings: Heading[]
  /**
   * Refer to paragraphs, a heading may contains multiple contents as well
   */
  contents: Content[]
}

type Options = {
  /**
   * Types to be scanned
   *
   * @default ["heading", "blockquote", "paragraph"]
   */
  types?: string[]
}

const slugger = new Slugger()
const textTypes = ['text', 'inlineCode']

/**
 * Attach structured data to VFile, you can access via `vfile.data.structuredData`.
 */
export function remarkStructure({
  types = ['paragraph', 'blockquote', 'heading']
}: Options = {}): Transformer<Root, Root> {
  return (node, file) => {
    slugger.reset()
    const data: StructuredData = { contents: [], headings: [] }
    let lastHeading: string | undefined = ''

    visit(node, types, element => {
      if (element.type === 'heading') {
        const heading = flattenNode(element, textTypes)
        const slug = slugger.slug(heading)

        data.headings.push({
          id: slug,
          content: heading
        })

        lastHeading = slug
        return 'skip'
      }

      data.contents.push({
        heading: lastHeading,
        // @ts-ignore
        content: flattenNode(element, textTypes)
      })

      return 'skip'
    })

    file.data.structuredData = data
  }
}

/**
 * Extract data from markdown/mdx content
 */
export function structure(
  content: string,
  remarkPlugins: PluggableList = [],
  options: Options = {}
): StructuredData {
  const result = remark()
    .use(remarkGfm)
    .use(remarkMdx)
    .use(remarkPlugins)
    .use([remarkStructure, options])
    .processSync(content)

  return result.data.structuredData as StructuredData
}
