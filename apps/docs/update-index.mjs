import { readFileSync } from 'fs'
import { resolve } from 'path'
import env from '@next/env'
import algosearch from 'algoliasearch'
import { sync } from 'next-docs-zeta/search-algolia/server'

env.loadEnvConfig(process.cwd())

const indexes = JSON.parse(
  readFileSync(resolve('./.next/_map_indexes.json')).toString()
)

const client = algosearch(
  process.env.ALGOLIA_APP_ID,
  process.env.ALGOLIA_API_KEY
)

sync(client, {
  documents: indexes.map(docs => ({
    _id: docs.id,
    title: docs.title,
    url: docs.url,
    structured: docs.structuredData,
    extra_data: {
      tag: docs.url.startsWith('/docs/ui') ? 'ui' : 'headless'
    }
  }))
}).then(() => {
  console.log('search updated')
})
