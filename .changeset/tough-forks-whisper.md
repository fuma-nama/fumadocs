---
'next-docs-mdx': major
---

**Rename configuration options**

The options of `createNextDocs` is now renamed to be more flexible and straightforward.

| Old | New |
| --- | --- |
| `dataExports` | `mdxOptions.valueToExport` |
| `pluginOptions` | `mdxOptions.rehypeNextDocsOptions` |

`rehypePlugins` and `remarkPlugins` can also be a function that accepts and returns plugins.