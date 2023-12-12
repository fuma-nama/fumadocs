---
'next-docs-mdx': major
---

**Remove `/docs` from default root content path**

Previously, the default root content path is `./content/docs`. All your documents must be placed under the root directory.

Since this update, it is now `./content` by default. To keep the old behaviours, you may manually specify `rootContentPath`.

```js
const withNextDocs = createNextDocs({
  rootContentPath: "./content/docs"
})
```

**Notice that due to this change, your `baseUrl` property will be `/` by default**

```diff
const withNextDocs = createNextDocs({
+  baseUrl: "/docs"
})
```