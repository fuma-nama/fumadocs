import { allDocs } from 'contentlayer/generated'
import { createSearchAPI } from 'next-docs-zeta/server'

export const { GET } = createSearchAPI('advanced', {
  indexes: allDocs.map(docs => ({
    id: docs._id,
    title: docs.title,
    content: docs.body.raw,
    url: '/docs/' + docs.slug,
    structuredData: docs.structuredData,
    tag: docs._raw.flattenedPath.startsWith('docs/ui') ? 'ui' : 'headless'
  })),
  tag: true
})
