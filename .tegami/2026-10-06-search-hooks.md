---
packages:
  'fumadocs-core': minor
  'fumadocs-ui': minor
  '@fumadocs/base-ui': minor
  '@fumadocs/cli': patch
  'create-fumadocs-app': patch
---

### Search hooks for each provider

`fumadocs-core/search/client` exports a search hook for each search client, they return `{ search, setSearch, isLoading, result }`. `result` is the last completed search, its `data` and `error` along with the `query` they belong to.

```ts
import { useFetchSearch } from 'fumadocs-core/search/client';

const { search, setSearch, isLoading, result } = useFetchSearch({ locale });
```

- `useFetchSearch()`, `useStaticSearch()`, `useAlgoliaSearch()`, `useOramaCloudSearch()` and `useMeilisearch()`, importing one doesn't bundle the others.
- `useSearchClient()` searches with other search clients, like `flexsearchStaticClient()`.
- `useDocsSearch()` is deprecated.
- `<SearchDialogList />` highlights its `query` prop, defaulting to the search input. Pass `result.query` so highlights match the results while typing.
- The search dialogs of Fumadocs CLI and Create Fumadocs App use the new hooks.
