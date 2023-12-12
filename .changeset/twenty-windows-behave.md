---
'next-docs-ui': major
---

**Separate MDX components**

Previously, you can only import the code block component from `next-docs-ui/mdx` (Client Component) and `next-docs-ui/mdx-server` (Server Component).

This may lead to confusion, hence, it is now separated into multiple files. You can import these components regardless it is either a client or a server component.

Notice that `MDXContent` is now renamed to `DocsBody`, you must import it from `next-docs-ui/page` instead.

```diff
- import { MDXContent } from "next-docs-ui/mdx"
- import { MDXContent } from "next-docs-ui/mdx-server"

+ import { DocsBody } from "next-docs-ui/page"
```

```diff
- import { Card, Cards } from "next-docs-ui/mdx"
+ import { Card, Cards } from "next-docs-ui/mdx/card"

- import { Pre } from "next-docs-ui/mdx"
+ import { Pre } from "next-docs-ui/mdx/pre"

- import { Heading } from "next-docs-ui/mdx"
+ import { Heading } from "next-docs-ui/mdx/heading"

- import defaultComponents from "next-docs-ui/mdx"
+ import defaultComponents from "next-docs-ui/mdx/default-client"

- import defaultComponents from "next-docs-ui/mdx-server"
+ import defaultComponents from "next-docs-ui/mdx/default"
```