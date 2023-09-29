/* eslint-disable @typescript-eslint/no-explicit-any */
import Slugger from 'github-slugger'
import { remark } from 'remark'
import remarkGfm from 'remark-gfm'
import remarkMdx from 'remark-mdx'
import { visit } from 'unist-util-visit'
import type { Plugin } from './types'

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

function flattenNode(node: any) {
  const p: any[] = []
  visit(node, textTypes, node => {
    if (typeof node.value !== 'string') return
    p.push(node.value)
  })
  return p.join(``)
}

const structurize =
  ({ types = ['paragraph', 'blockquote', 'heading'] }: Options = {}) =>
  (node: any, file: any) => {
    slugger.reset()
    const data: StructuredData = { contents: [], headings: [] }
    let lastHeading: string | undefined = ''

    visit(node, types, element => {
      if (element.type === 'heading') {
        const heading = flattenNode(element)
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
        content: flattenNode(element)
      })

      return 'skip'
    })

    file.data = data
  }

/**
 * Extract data from markdown/mdx content
 */
export function structure(
  content: string,
  remarkPlugins: Plugin[] = [],
  options: Options = {}
): StructuredData {
  const result = remark()
    .use(remarkGfm)
    .use(remarkMdx)
    .use(remarkPlugins)
    .use([structurize, options])
    .processSync(content)

  return result.data as StructuredData
}
