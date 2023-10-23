import { jsx } from 'react/jsx-runtime'
import {
  Card,
  Cards,
  default_image_sizes,
  Heading,
  Image,
  Link,
  Pre,
  Table
} from '../dist/mdx'

const defaultMdxComponents = {
  Card: p => /* @__PURE__ */ jsx(Card, p),
  Cards: p => /* @__PURE__ */ jsx(Cards, p),
  h1: p => /* @__PURE__ */ jsx(Heading, { as: 'h1', ...p }),
  h2: p => /* @__PURE__ */ jsx(Heading, { as: 'h2', ...p }),
  h3: p => /* @__PURE__ */ jsx(Heading, { as: 'h3', ...p }),
  h4: p => /* @__PURE__ */ jsx(Heading, { as: 'h4', ...p }),
  h5: p => /* @__PURE__ */ jsx(Heading, { as: 'h5', ...p }),
  h6: p => /* @__PURE__ */ jsx(Heading, { as: 'h6', ...p }),
  img: p => /* @__PURE__ */ jsx(Image, p),
  a: p => /* @__PURE__ */ jsx(Link, p),
  pre: p => /* @__PURE__ */ jsx(Pre, p),
  table: p => /* @__PURE__ */ jsx(Table, p)
}

export { defaultMdxComponents as default, default_image_sizes }
