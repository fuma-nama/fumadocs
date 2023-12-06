---
'next-docs-zeta': major
'next-docs-mdx': major
'next-docs-ui': major
---

**Pre-bundle page urls into raw pages.**

This means you don't need `getPageUrl` anymore for built-in adapters, including `next-docs-mdx` and Contentlayer. It is now replaced by the `url` property from the pages array provided by your adapter.