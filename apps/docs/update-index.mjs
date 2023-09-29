import path from 'path'
import { config } from 'dotenv'
import {
  initIndex,
  setIndexSettings,
  updateDocuments
} from 'next-docs-zeta/algolia'
import { createUtils, loadContext } from 'next-docs-zeta/contentlayer'
import { allDocs, allMeta } from './.contentlayer/generated/index.mjs'

config({ path: path.resolve(process.cwd(), '.env.local') })

const ctx = loadContext(allMeta, allDocs)
const { getPageUrl } = createUtils(ctx)

const index = initIndex(process.env.ALGOLIA_APP_ID, process.env.ALGOLIA_API_KEY)

async function init() {
  await setIndexSettings(index)

  await updateDocuments(
    index,
    allDocs.map(docs => ({
      ...docs,
      url: getPageUrl(docs.slug),
      structured: docs.structuredData,
      extra_data: {
        tag: docs._raw.flattenedPath.startsWith('docs/ui') ? 'ui' : 'headless'
      }
    }))
  )

  console.log('updated')
}

await init()
