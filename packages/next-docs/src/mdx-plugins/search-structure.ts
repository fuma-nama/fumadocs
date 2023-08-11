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
  contents: Content[]
}

const slugger = new Slugger()
const textTypes = ['text', 'emphasis', 'strong', 'inlineCode']
const skippedTypes = ['table', 'tableRow', 'tableCell']

function flattenNode(node: any) {
  const p: any[] = []
  visit(node, node => {
    if (!textTypes.includes(node.type)) return
    p.push(node.value)
  })
  return p.join(``)
}

const structurize = () => (node: any, file: any) => {
  slugger.reset()
  const data: StructuredData = { contents: [], headings: [] }
  let lastHeading: string | undefined = ''
  let lastContent: string[] = []

  const applyContent = () => {
    if (lastContent.length === 0) return

    data.contents.push({
      content: lastContent.join(''),
      heading: lastHeading
    })

    lastHeading = undefined
    lastContent = []
  }

  visit(node, element => {
    if (skippedTypes.includes(element.type)) {
      applyContent()
      return 'skip'
    }

    if (element.type === 'heading') {
      applyContent()
      const heading = flattenNode(element)
      const slug = slugger.slug(heading)

      data.headings.push({
        id: slug,
        content: heading
      })

      lastHeading = slug
      return 'skip'
    }

    if (textTypes.includes(element.type)) {
      lastContent.push(element.value)
    }
  })

  applyContent()

  file.data = data
}

/**
 * Extract data from markdown/mdx content
 */
export function structure(
  content: string,
  remarkPlugins: Plugin[] = []
): StructuredData {
  const result = remark()
    .use(remarkGfm)
    .use(remarkMdx)
    .use(remarkPlugins)
    .use(structurize)
    .processSync(content)

  return result.data as StructuredData
}
