---
'next-docs-zeta': major
'next-docs-mdx': major
'next-docs-ui': major
---

**Pre-bundle page urls into raw pages.**

This means you don't need `getPageUrl` anymore for built-in adapters, including `next-docs-mdx` and Contentlayer. It is now replaced by the `url` property from the pages array provided by your adapter.

Due to this change, your old configuration might not continues to work.

```diff
import { fromMap } from 'next-docs-mdx/map'

fromMap({
-  slugs: ...
+  getSlugs: ...
})
```

For Contentlayer, the `getUrl` option is now moved to `createConfig`.