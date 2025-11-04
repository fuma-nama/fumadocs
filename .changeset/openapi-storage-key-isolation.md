---
'fumadocs-openapi': minor
---

Add `storageKeyPrefix` option to isolate `localStorage` for multiple API instances

When using multiple `createOpenAPI()` instances in the same application, the server selection state would bleed between different APIs because they all shared the same storage key prefix.
Set a prefix to avoid this.

**Usage:**

```tsx
// components/api-page.client.tsx
'use client';
import { defineClientConfig } from 'fumadocs-openapi/ui/client';

export default defineClientConfig({
  storageKeyPrefix: 'fumadocs-openapi-custom-',
});
```
