---
packages:
  npm:fumadocs-core: patch
---

## `toDocuments()` for Algolia and Orama Cloud

Build the search indexes of every page, instead of mapping pages by hand:

```ts
// app/static.json/route.ts
import { toDocuments } from 'fumadocs-core/search/algolia';
import { source } from '@/lib/source';

export const GET = async () => Response.json(await toDocuments(source));
```

It awaits `structuredData` when your collection is async (React Router and TanStack Start), a step that was easy to miss. Pass `tag` to filter results by a value of your choice:

```ts
toDocuments(source, { tag: (page) => page.slugs[0] });
```

Exported from `fumadocs-core/search/algolia` and `fumadocs-core/search/orama-cloud`.
