---
'fumadocs-core': minor
'fumadocs-ui': minor
---

**Bump algolia search to v5**

This also introduced changes to some APIs since `algoliasearch` v4 and v5 has many differences.

Now we highly recommend to pass an index name to `sync()`: 

```ts
import { algoliasearch } from 'algoliasearch';
import { sync } from 'fumadocs-core/search/algolia';
const client = algoliasearch('id', 'key');

void sync(client, {
    indexName: 'document',
    documents: records,
});
```

For search client, pass them to `searchOptions`:

```tsx
'use client';

import { liteClient } from 'algoliasearch/lite';
import type { SharedProps } from 'fumadocs-ui/components/dialog/search';
import SearchDialog from 'fumadocs-ui/components/dialog/search-algolia';

const client = liteClient(appId, apiKey);

export default function CustomSearchDialog(props: SharedProps) {
    return (
        <SearchDialog
            searchOptions={{
                client,
                indexName: 'document',
            }}
            {...props}
            showAlgolia
        />
    );
}
```
