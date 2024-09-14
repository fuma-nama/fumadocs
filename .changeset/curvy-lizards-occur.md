---
'fumadocs-core': major
---

**Change usage of `useDocsSearch`**

**why:** Allow static search

**migrate:**

Pass client option, it can be algolia, static, or fetch (default).

```ts
import { useDocsSearch } from 'fumadocs-core/search/client';

const { search, setSearch, query } = useDocsSearch(
  {
    type: 'fetch',
    api: '/api/search' // optional
  },
);
```
