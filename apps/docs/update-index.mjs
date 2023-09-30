import path from 'path'
import algosearch from 'algoliasearch'
import { config } from 'dotenv'
import { sync } from 'next-docs-zeta/algolia'
import { createUtils, loadContext } from 'next-docs-zeta/contentlayer'
import { allDocs, allMeta } from './.contentlayer/generated/index.mjs'

config({ path: path.resolve(process.cwd(), '.env.local') })

const ctx = loadContext(allMeta, allDocs)
const { getPageUrl } = createUtils(ctx)

const client = algosearch(
  process.env.ALGOLIA_APP_ID,
  process.env.ALGOLIA_API_KEY
)

sync(client, {
  documents: allDocs.map(docs => ({
    ...docs,
    url: getPageUrl(docs.slug),
    structured: docs.structuredData,
    extra_data: {
      tag: docs._raw.flattenedPath.startsWith('docs/ui') ? 'ui' : 'headless'
    }
  }))
}).then(() => {
  console.log('search updated')
})
