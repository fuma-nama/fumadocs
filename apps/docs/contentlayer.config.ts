import { makeSource } from 'contentlayer/source-files'
import { createConfig } from 'next-docs-zeta/contentlayer/configuration'
import { structure } from 'next-docs-zeta/mdx-plugins'

const config = createConfig({
  docsComputedFields: {
    structuredData: {
      type: 'json',
      resolve: page => {
        return structure(page.body.raw)
      }
    }
  }
})

export default makeSource(config)
