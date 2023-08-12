import { allDocs } from 'contentlayer/generated'
import { createSearchAPI } from 'next-docs-zeta/server'

export const { GET } = createSearchAPI('simple', {
  indexes: allDocs.map(page => ({
    title: page.title,
    content: page.body.raw,
    url: '/docs/' + page.slug
  }))
})
