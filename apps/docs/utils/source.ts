import { writeFileSync } from 'fs'
import path from 'path'
import { map } from '@/_map'
import {
  createPageUtils,
  defaultValidators,
  fromMap,
  type Utils
} from 'next-docs-mdx/map'
import type { Meta, Page } from 'next-docs-mdx/types'
import { PHASE_PRODUCTION_BUILD } from 'next/constants'
import { z } from 'zod'

const frontmatterSchema = defaultValidators.frontmatter.extend({
  preview: z.string().optional(),
  index: z.boolean().default(false)
})

const ui = fromMap(map, {
  rootDir: 'ui',
  validate: {
    frontmatter: frontmatterSchema
  }
})

const headless = fromMap(map, {
  rootDir: 'headless',
  validate: {
    frontmatter: frontmatterSchema
  }
})

const mdx = fromMap(map, {
  rootDir: 'mdx',
  validate: {
    frontmatter: frontmatterSchema
  }
})

export const metas: Meta[] = [...mdx.metas, ...headless.metas, ...ui.metas]
export const pages: Page[] = [...mdx.pages, ...headless.pages, ...ui.pages]
export const { getPage, getPageUrl } = createPageUtils(
  { pages, metas },
  '/docs',
  []
)

export function getUtils(mode: 'ui' | 'headless' | 'mdx' | string): Utils {
  switch (mode) {
    case 'ui':
      return ui
    case 'mdx':
      return mdx
    default:
      return headless
  }
}

declare module 'next-docs-mdx/types' {
  interface Frontmatter extends z.infer<typeof frontmatterSchema> {}
}

// Access and export MDX pages data to json file
// So that we can update search indexes after the build
declare global {
  // eslint-disable-next-line no-var
  var __NEXT_DOCS_INDEX_UPDATED: boolean
}

global.__NEXT_DOCS_INDEX_UPDATED = false

if (
  process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD &&
  !global.__NEXT_DOCS_INDEX_UPDATED
) {
  const mapPath = path.resolve('./.next/_map_indexes.json')
  const indexes = pages.map(page => ({
    id: page.file.id,
    title: page.matter.title,
    description: page.matter.description,
    url: getPageUrl(page.slugs, page.file.locale),
    structuredData: page.data.structuredData
  }))

  writeFileSync(mapPath, JSON.stringify(indexes))

  global.__NEXT_DOCS_INDEX_UPDATED = true
}
