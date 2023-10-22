import type { MDXComponents } from 'mdx/types'
import defaultComponents, { default_image_sizes } from 'next-docs-ui/mdx-server'
import NextImage from 'next/image'

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...defaultComponents,
    Image: p => <NextImage sizes={default_image_sizes} {...p} />,
    ...components
  }
}
