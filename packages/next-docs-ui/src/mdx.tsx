'use client'

import clientComponents, { Pre } from '@/_internal/mdx_client'
import serverComponents, {
  Card,
  Cards,
  default_image_sizes,
  Heading,
  Image,
  Link,
  MDXContent,
  Table
} from '@/_internal/mdx_server'

const defaultMdxComponents = {
  ...clientComponents,
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
