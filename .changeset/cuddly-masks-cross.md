---
'fumadocs-core': major
---

**Change usage of TOC component**

**why:** Improve the flexibility of headless components

**migrate:**

Instead of

```tsx
import * as Base from 'fumadocs-core/toc';
 
return (
  <Base.TOCProvider>
    <Base.TOCItem />
  </Base.TOCProvider>
);
```

Use

```tsx
import * as Base from 'fumadocs-core/toc';

return (
    <Base.AnchorProvider>
        <Base.ScrollProvider>
            <Base.TOCItem/>
            <Base.TOCItem/>
        </Base.ScrollProvider>
    </Base.AnchorProvider>
);
```
