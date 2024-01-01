---
'next-docs-zeta': major
---

**Change `remarkToc` to `remarkHeading`**

The previous `remarkToc` plugin only extracts table of contents from documents, now it also adds the `id` property to all heading elements.

```diff
- import { remarkToc } from "next-docs-zeta/mdx-plugins"
+ import { remarkHeading } from "next-docs-zeta/mdx-plugins"
```