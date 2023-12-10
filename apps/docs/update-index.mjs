import env from '@next/env'
import algosearch from 'algoliasearch'
import { readFileSync } from 'fs'
import { sync } from 'next-docs-zeta/search-algolia/server'
import { resolve } from 'path'

env.loadEnvConfig(process.cwd())

/**
 * @type {Array<import('./utils/source').Index>}
 */
const indexes = JSON.parse(
  readFileSync(resolve('./.next/_map_indexes.json')).toString()
)

const client = algosearch(
  process.env.ALGOLIA_APP_ID,
  process.env.ALGOLIA_API_KEY
)

sync(client, {
  document: process.env.NEXT_PUBLIC_ALGOLIA_INDEX,
  documents: indexes.map(docs => ({
    _id: docs.id,
    title: docs.title,
    url: docs.url,
    structured: docs.structuredData,
    extra_data: {
      tag: docs.url.split('/')[2]
    }
  }))
}).then(() => {
  console.log('search updated')
})
