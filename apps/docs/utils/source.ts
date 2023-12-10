import { map } from '@/_map'
import { writeFileSync } from 'fs'
import { defaultValidators, fromMap, type Utils } from 'next-docs-mdx/map'
import type { StructuredData } from 'next-docs-zeta/mdx-plugins'
import { PHASE_PRODUCTION_BUILD } from 'next/constants'
import path from 'path'
import { z } from 'zod'

const frontmatterSchema = defaultValidators.frontmatter.extend({
  preview: z.string().optional(),
  index: z.boolean().default(false)
})

export const tabs: Record<string, Utils> = {
  ui: fromMap(map, {
    rootDir: 'docs/ui',
    baseUrl: '/docs/ui',
    validate: {
      frontmatter: frontmatterSchema
    }
  }),
  headless: fromMap(map, {
    rootDir: 'docs/headless',
    baseUrl: '/docs/headless',
    validate: {
      frontmatter: frontmatterSchema
    }
  }),
  mdx: fromMap(map, {
    rootDir: 'docs/mdx',
    baseUrl: '/docs/mdx',
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

export type Index = {
  id: string
  title: string
  description?: string
  url: string
  structuredData: StructuredData
}

// Access and export MDX pages data to json file
// So that we can update search indexes after the build
const g = globalThis as unknown as {
  __NEXT_DOCS_INDEX_UPDATED?: boolean
}

if (
  process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD &&
  !g.__NEXT_DOCS_INDEX_UPDATED
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

  g.__NEXT_DOCS_INDEX_UPDATED = true
}
