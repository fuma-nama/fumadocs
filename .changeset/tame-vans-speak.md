---
'fumadocs-openapi': major
---

**Change interface for `useScalar`**

From:

```tsx
import { createOpenAPI } from 'fumadocs-openapi/server';
import { APIPlayground } from 'fumadocs-openapi/scalar';

export const openapi = createOpenAPI({
    useScalar: true
});
```

To:

```tsx
import { createOpenAPI } from 'fumadocs-openapi/server';
import { APIPlayground } from 'fumadocs-openapi/scalar';

export const openapi = createOpenAPI({
    renderer: {
        APIPlayground,
    },
});
```
