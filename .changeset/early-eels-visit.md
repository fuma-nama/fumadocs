---
'fumadocs-core': major
---

**Separate Contentlayer integration into another package**

why: As Fumadocs MDX is the preferred default source, Contentlayer should be optional.

migrate:

Install `fumadocs-contentlayer`.

```diff
- import { createContentlayerSource } from "fumadocs-core/contentlayer"
+ import { createContentlayerSource } from "fumadocs-contentlayer"

- import { createConfig } from "fumadocs-core/contentlayer/configuration"
+ import { createConfig } from "fumadocs-contentlayer/configuration"
```
