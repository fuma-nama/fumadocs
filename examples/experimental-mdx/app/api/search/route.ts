import { allPages, getPageUrl } from '@/app/source'
import { createSearchAPI } from 'next-docs-zeta/search/server'

export const { GET } = createSearchAPI('advanced', {
  indexes: allPages.map(page => ({
    title: page.matter.title,
    structuredData: page.data.structuredData,
    id: page.file.id,
    url: getPageUrl(page.slugs)
  }))
})
