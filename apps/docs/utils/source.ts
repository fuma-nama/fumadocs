import { writeFileSync } from 'fs'
import path from 'path'
import { map } from '@/_map'
import {
  createPageUtils,
  getPageTreeBuilder,
  resolveFiles
} from 'next-docs-mdx/map'
import type { PageTree } from 'next-docs-zeta/server'
import { PHASE_PRODUCTION_BUILD } from 'next/constants'

const resolved = resolveFiles({ map, root: 'docs' })

export const { getPage, getPageUrl } = createPageUtils(resolved, '/docs', [])

const builder = getPageTreeBuilder(resolved, { getUrl: getPageUrl })

const uiTree = builder.build({ root: 'docs/ui' })

const headlessTree = builder.build({
  root: 'docs/headless'
})

export function getTree(mode: 'ui' | 'headless' | string): PageTree {
  if (mode === 'ui') {
    return uiTree
  }

  return headlessTree
}

export const { pages, metas } = resolved

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
