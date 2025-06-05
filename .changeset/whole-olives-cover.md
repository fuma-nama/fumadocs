---
'fumadocs-core': patch
---

**Deprecate other parameters for `useDocsSearch()`**

The new usage passes options to a single object, improving the readability:

```ts
import { useDocsSearch } from 'fumadocs-core/search/client';

const { search, setSearch, query } = useDocsSearch({
    type: 'fetch',
    locale: 'optional',
    tag: 'optional',
    delayMs: 100,
    allowEmpty: false
});
```
