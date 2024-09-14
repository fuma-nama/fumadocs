---
'fumadocs-core': major
---

**Remove Algolia Search Client**

**why:** Replace by the new search client

**migrate:**

```ts
import { useDocsSearch } from 'fumadocs-core/search/client';

const { search, setSearch, query } = useDocsSearch(
  {
    type: 'algolia',
    index,
    ...searchOptions,
  },
);
```
