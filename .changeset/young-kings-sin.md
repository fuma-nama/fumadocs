---
'fumadocs-ui': major
---

**Remove Nav component export**

why: Replaced by the DocsLayout and Layout component, it is now an internal component

migration: Use the Layout component for sharing the navbar across pages

```diff
- import { Nav } from "fumadocs-ui/nav"
+ import { Layout } from "fumadocs-ui/layout"
```