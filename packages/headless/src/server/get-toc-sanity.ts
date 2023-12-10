/* eslint-disable */
import type { TableOfContents, TOCItemType } from './types'
import Slugger from 'github-slugger'

const slugger = new Slugger()

type Block = {
  _type: string
  children?: Block[]
  style?: string
  text?: string
}

/**
 * Parse TOC from portable text (Sanity)
 *
 * @param value Blocks
 * @param slugFn A function that generates slug from title
 */
export function getTableOfContentsFromPortableText(
  value: any
): TableOfContents {
  if (!Array.isArray(value)) {
    throw new Error('Invalid body type')
  }

  slugger.reset()
  const result: TOCItemType[] = []

  for (const block of value) {
    dfs(block, result)
  }

  return result
}

function dfs(block: Block, list: TOCItemType[]) {
  if (
    block.style != null &&
    block.style.length === 2 &&
    block.style[0] === 'h'
  ) {
    const depth = Number(block.style[1])

    if (Number.isNaN(depth)) return
    const text = flattenNode(block)

    list.push({
      title: text,
      url: slugger.slug(text),
      depth: depth
    })

    return
  }

  block.children?.forEach(child => dfs(child, list))
}

function flattenNode(block: Block): string {
  let text = ''

  if (block._type === 'span') {
    return block.text!
  }

  block.children?.forEach(child => {
    text += flattenNode(child)
  })

  return text
}
