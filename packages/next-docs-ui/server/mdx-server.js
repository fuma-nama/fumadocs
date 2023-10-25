import { jsx } from 'react/jsx-runtime'
import { Pre } from '../dist/_internal/mdx_client'
import {
  Card,
  Cards,
  default_image_sizes,
  Heading,
  Image,
  Link,
  MDXContent,
  Table
} from '../dist/_internal/mdx_server'

const defaultMdxComponents = {
  Card: p => jsx(Card, p),
  Cards: p => jsx(Cards, p),
  h1: p => jsx(Heading, { as: 'h1', ...p }),
  h2: p => jsx(Heading, { as: 'h2', ...p }),
  h3: p => jsx(Heading, { as: 'h3', ...p }),
  h4: p => jsx(Heading, { as: 'h4', ...p }),
  h5: p => jsx(Heading, { as: 'h5', ...p }),
  h6: p => jsx(Heading, { as: 'h6', ...p }),
  img: p => jsx(Image, p),
  a: p => jsx(Link, p),
  pre: p => jsx(Pre, p),
  table: p => jsx(Table, p)
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
