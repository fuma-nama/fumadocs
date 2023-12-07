---
'next-docs-mdx': major
---

**Make file paths relative to `rootDir` when resolving files**

For a more simplified usage, the resolved file paths will be relative to `rootDir`.

You can now generate slugs automatically depending on the root directory you have configured.

```ts
const utils = fromMap(map, {
    rootDir: 'ui',
    validate: {
      frontmatter: frontmatterSchema
    }
  })
```

The configuration above will generate `/hello` slugs for a file named `/content/ui/hello.mdx`, while the previous one generates `/ui/hello`.