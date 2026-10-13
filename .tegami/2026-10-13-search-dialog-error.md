---
packages:
  'fumadocs-ui': patch
  '@fumadocs/base-ui': patch
  '@fumadocs/language': patch
---

### Show failed searches in the search dialog

- `<SearchDialog />` accepts the `error` of search hooks. After a failed search, `<SearchDialogList />` shows "Search failed" instead of the results of the search before it, and Enter no longer opens one of them.
