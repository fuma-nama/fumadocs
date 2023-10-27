import { writeFileSync } from 'fs'
import path from 'path'
import { map } from '@/_map'
import {
  createPageUtils,
  defaultValidators,
  getPageTreeBuilder,
  resolveFiles
} from 'next-docs-mdx/map'
import type { PageTree } from 'next-docs-zeta/server'
import { PHASE_PRODUCTION_BUILD } from 'next/constants'
import { z } from 'zod'

const frontmatterSchema = defaultValidators.frontmatter.extend({
  preview: z.string().optional(),
  index: z.boolean().default(false)
})

const resolved = resolveFiles({
  map,
  validate: {
    frontmatter: frontmatterSchema
  }
})

export const { getPage, getPageUrl } = createPageUtils(resolved, '/docs', [])

const builder = getPageTreeBuilder(resolved, { getUrl: getPageUrl })

const uiTree = builder.build({ root: 'ui' })
const mdxTree = builder.build({ root: 'mdx' })
const headlessTree = builder.build({
  root: 'headless'
})

export function getTree(mode: 'ui' | 'headless' | 'mdx' | string): PageTree {
  switch (mode) {
    case 'ui':
      return uiTree
    case 'mdx':
      return mdxTree
    default:
      return headlessTree
  }
}

export const { pages, metas } = resolved

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
