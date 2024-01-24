---
'fumadocs-ui': major
---

**Update import paths of MDX components**

why: To improve consistency, all MDX components are located in `/components/*` instead.

migrate:

```diff
- import { Card, Cards } from "fumadocs-ui/mdx/card"
+ import { Card, Cards } from "fumadocs-ui/components/card"

- import { Heading } from "fumadocs-ui/mdx/heading"
+ import { Heading } from "fumadocs-ui/components/heading"

- import { Codeblock, Pre } from "fumadocs-ui/mdx/pre"
+ import { Codeblock, Pre } from "fumadocs-ui/components/codeblock"
```
