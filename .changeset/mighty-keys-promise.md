---
'next-docs-mdx': minor
---

**Support last modified timestamp for Git**

Enable this in `next.config.mjs`:

```js
const withNextDocs = createNextDocs({
  mdxOptions: {
    lastModifiedTime: 'git',
  },
});
```

Access it via `page.data.exports.lastModified`.