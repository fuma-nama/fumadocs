---
packages:
  'fumadocs-core': minor
  'fumadocs-ui': minor
  '@fumadocs/base-ui': minor
  '@fumadocs/cli': patch
  'create-fumadocs-app': patch
---

### Search hooks for each provider

`fumadocs-core/search/client` exports a search hook for each search client, they return the props of `<SearchDialog />`: `{ search, onSearchChange, isLoading, result }`. `result` is the last completed search, its `data` and `error` along with the `query` they belong to.

```tsx
import { useFetchSearch } from 'fumadocs-core/search/client';

const search = useFetchSearch({ locale });

<SearchDialog {...search} {...props}>
  {/* ... */}
  <SearchDialogList />
</SearchDialog>;
```

- `useFetchSearch()`, `useStaticSearch()`, `useAlgoliaSearch()`, `useOramaCloudSearch()` and `useMeilisearch()`, importing one doesn't bundle the others.
- `useFlexsearchStatic()` and `useOramaCloudLegacySearch()` are exported from the paths of their clients, like `fumadocs-core/search/client/flexsearch-static`.
- `useDocsSearch()` is deprecated, its output can be spread to `<SearchDialog />` as well.
- `<SearchDialog />` accepts `result`, `<SearchDialogList />` shows its results, or `defaultItems` without results, and highlights its query instead of the search input.
- The search dialogs of Fumadocs CLI and Create Fumadocs App use the new hooks.
