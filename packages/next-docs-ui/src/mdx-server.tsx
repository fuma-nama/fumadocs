import serverComponents, {
  Card,
  Cards,
  default_image_sizes,
  Heading,
  Image,
  Link,
  MDXContent,
  Table
} from '@/internal/mdx-server'

const client = await import('@/internal/mdx-client')

const Pre = (p => <client.Pre {...p} />) as typeof client.Pre

const defaultMdxComponents = {
  pre: Pre,
  ...serverComponents
}

export {
  defaultMdxComponents as default,
  Pre,
  Card,
  Cards,
  Heading,
  Image,
  Link,
  MDXContent,
  Table,
  default_image_sizes
}
