---
'fumadocs-ui': minor
---

**Move TOC closer to page body on larger viewports**

Changed layout positioning, all layout components now use `fixed` position.

This may impact sites that:

- using custom styling on Fumadocs layouts.
- added a custom footer (see below).

For custom footer, make sure to add them into `<DocsLayout />` instead:

```tsx
<DocsLayout>
    {children}
    <div className="h-[400px] bg-fd-secondary">Hello World</div>
</DocsLayout>
```
