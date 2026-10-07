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

`result` is the last completed search, its `items` have their content decoded into `hastContent`.

- `useDocsSearch()` is deprecated.
- `useFlexsearchStatic()` and `useOramaCloudLegacySearch()` are exported from the paths of their clients.
- `<SearchDialogList />` shows `defaultItems` without results.
- `renderMarkdown` of `<SearchDialogListItem />` renders `content` instead of `hastContent`. Without it, the string content of custom items is shown as text.
- The templates of Fumadocs CLI and Create Fumadocs App use the new hooks.
