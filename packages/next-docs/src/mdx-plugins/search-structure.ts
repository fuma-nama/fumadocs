/* eslint-disable @typescript-eslint/no-explicit-any */
import Slugger from 'github-slugger'
import { remark } from 'remark'
import remarkGfm from 'remark-gfm'
import { visit } from 'unist-util-visit'

export type Heading = {
  id: string
  content: string
}

export type Content = {
  heading: string | undefined
  content: string
}

type StructuredData = {
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

export async function structure(content: string) {
  const result = await remark().use(remarkGfm).use(structurize).process(content)

  return result.data as StructuredData
}
