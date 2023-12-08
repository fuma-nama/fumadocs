---
'next-docs-ui': major
---

**Add required property `url` to `<DocsPage />` component**

You must pass the URL of current page to `<DocsPage />` component.

```diff
export default function Page({ params }) {
  return (
    <DocsPage
+      url={page.url}
      toc={page.data.toc}
    >
      ...
    </DocsPage>
  )
}
```

**`footer` property is now optional**

Your `footer` property in `<DocsPage />` will be automatically generated if not specified. 

```ts
findNeighbour(tree, url)
```