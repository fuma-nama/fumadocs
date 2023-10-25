'use client'

import clientComponents from '@/_internal/mdx_client'
import serverComponents from '@/_internal/mdx_server'

const defaultMdxComponents = {
  ...clientComponents,
  ...serverComponents
}

export * from '@/_internal/mdx_client'
export * from '@/_internal/mdx_server'
export default defaultMdxComponents
