'use client'

import { useMDXComponent } from 'next-contentlayer/hooks'
import defaultComponents from 'next-docs-ui/mdx'

const components = {
  ...defaultComponents
}

export function Content({ code }: { code: string }) {
  const MDX = useMDXComponent(code)

  return <MDX components={components} />
}
