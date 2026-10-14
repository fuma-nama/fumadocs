---
packages:
  'fumadocs-ui': patch
  '@fumadocs/base-ui': patch
  '@fumadocs/language': patch
---

### Show failed searches in the search dialog

- `<SearchDialog />` accepts the `error` of search hooks, `<SearchDialogList />` shows it above the previous results.

Fix [#3698](https://github.com/fuma-nama/fumadocs/issues/3698)
