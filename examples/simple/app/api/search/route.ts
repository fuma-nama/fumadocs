import { getPageUrl } from '@/app/source'
import { allDocs } from 'contentlayer/generated'
import { createSearchAPI } from 'next-docs-zeta/search/server'

export const { GET } = createSearchAPI('simple', {
  indexes: allDocs.map(page => ({
    title: page.title,
    content: page.body.raw,
    url: getPageUrl(page.slug)
  }))
})
