import { writeFileSync } from 'fs'
import path from 'path'
import { map } from '@/_map'
import { defaultValidators, fromMap, type Utils } from 'next-docs-mdx/map'
import type { FileInfo } from 'next-docs-mdx/types'
import type { StructuredData } from 'next-docs-zeta/mdx-plugins'
import { PHASE_PRODUCTION_BUILD } from 'next/constants'
import { z } from 'zod'

const frontmatterSchema = defaultValidators.frontmatter.extend({
  preview: z.string().optional(),
  index: z.boolean().default(false)
})

const getSlugs = (file: FileInfo) =>
  file.flattenedPath
    .split('/')
    .filter(p => !['index', ''].includes(p))
    .slice(1)

export const tabs: Record<string, Utils> = {
  ui: fromMap(map, {
    rootDir: 'ui',
    baseUrl: '/docs/ui',
    getSlugs,
    validate: {
      frontmatter: frontmatterSchema
    }
  }),
  headless: fromMap(map, {
    rootDir: 'headless',
    baseUrl: '/docs/headless',
    getSlugs,
    validate: {
      frontmatter: frontmatterSchema
    }
  }),
  mdx: fromMap(map, {
    rootDir: 'mdx',
    baseUrl: '/docs/mdx',
    getSlugs,
    validate: {
      frontmatter: frontmatterSchema
    }
  })
}

export function getUtils(mode: 'ui' | 'headless' | 'mdx' | string): Utils {
  return tabs[mode] ?? tabs['headless']
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

export type Index = {
  id: string
  title: string
  description?: string
  url: string
  structuredData: StructuredData
}

if (
  process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD &&
  !global.__NEXT_DOCS_INDEX_UPDATED
) {
  const mapPath = path.resolve('./.next/_map_indexes.json')
  const indexes: Index[] = Object.values(tabs).flatMap(tab => {
    return tab.pages.map(page => ({
      id: page.file.id,
      title: page.matter.title,
      description: page.matter.description,
      url: page.url,
      structuredData: page.data.structuredData
    }))
  })

  writeFileSync(mapPath, JSON.stringify(indexes))

  global.__NEXT_DOCS_INDEX_UPDATED = true
}
