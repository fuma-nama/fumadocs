---
'fumadocs-ui': minor
---

**Move Sidebar context into docs layouts**

`fumadocs-ui/contexts/sidebar` is removed, you can still reference the context with:

```ts
import { useSidebar } from 'fumadocs-ui/components/sidebar/base';
```

Make sure you're only accessing it in `<DocsLayout />`.
