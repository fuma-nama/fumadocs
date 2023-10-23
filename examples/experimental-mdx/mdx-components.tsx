import type { MDXComponents } from 'mdx/types'
import defaultComponents from 'next-docs-ui/mdx-server'

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...defaultComponents,
    Image: p => <defaultComponents.img {...p} />,
    ...components
  }
}
