---
'next-docs-ui': major
---

**Page Footer is now a client component**

This allows the footer component to find items within the current page tree, which fixes the problem where a item from another page tree is appeared. 

Also removed the `url` and `tree` properties from `DocsPage` since we can pass them via React Context API.

```diff
export default async function Page({ params }) {
  return (
    <DocsPage
-      url={page.url}
-      tree={pageTree}
    >
      ...
    </DocsPage>
  );
}
```

The `footer` property in `DocsPage` has also updated, now you can specify or replace the default footer component.

```tsx
<DocsPage footer={{ items: {} }}>...</DocsPage>
```