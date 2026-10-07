---
packages:
  'fumadocs-core': minor
  'fumadocs-ui': minor
  '@fumadocs/base-ui': minor
  '@fumadocs/cli': patch
  'create-fumadocs-app': patch
---

### Search hooks for each provider

`fumadocs-core/search/client` exports a hook for each search client, like `useFetchSearch()`. They return the props of `<SearchDialog />`:

```tsx
const search = useFetchSearch({ locale });

<SearchDialog {...search} {...props}>
  <SearchDialogList />
</SearchDialog>;
```

`data` is the last successful search, its `items` have their content parsed into `hastContent`. `error` is set when the last search failed.

- `experimental_useSearch()` creates a search hook from a memoized search function.
- `useDocsSearch()` is deprecated.
- `useFlexsearchStatic()` and `useOramaCloudLegacySearch()` are exported from the paths of their clients.
- `<SearchDialogList />` shows `defaultItems` without results.
- `useSearchList()` is removed, `useSearch()` returns `getActive()`, `setActive()` and `subscribeActive()` for the active item.
- `<SearchDialogListItem />` renders a `div` instead of a `button`, table rows render their cells only.
- `renderMarkdown` of `<SearchDialogListItem />` renders `content` instead of `hastContent`. Without it, the string content of custom items is shown as text.
- The templates of Fumadocs CLI and Create Fumadocs App use the new hooks.
