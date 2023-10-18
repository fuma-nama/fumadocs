import path from 'path'
import algosearch from 'algoliasearch'
import { config } from 'dotenv'
import { sync } from 'next-docs-zeta/search-algolia/server'
import { allDocs } from './.contentlayer/generated/index.mjs'

config({ path: path.resolve(process.cwd(), '.env.local') })

const client = algosearch(
  process.env.ALGOLIA_APP_ID,
  process.env.ALGOLIA_API_KEY
)

sync(client, {
  documents: allDocs.map(docs => ({
    ...docs,
    url: getPageUrl(['docs', ...docs.slug.split('/')]),
    structured: docs.structuredData,
    extra_data: {
      tag: docs._raw.flattenedPath.startsWith('docs/ui') ? 'ui' : 'headless'
    }
  }))
}).then(() => {
  console.log('search updated')
})

/**
 * @param {Array<string>} slug
 * @returns {string}
 */
function getPageUrl(slug) {
  const url = slug
    .filter(segment => segment != null && segment.length > 0)
    .join('/')

  if (url.startsWith('//')) {
    return url.slice(1)
  }

  return url
}
