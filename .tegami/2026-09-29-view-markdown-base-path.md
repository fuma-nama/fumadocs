---
packages:
  'fumadocs-ui': patch
  '@fumadocs/base-ui': patch
---

### Apply the Vite base path to the "View as Markdown" link

`<ViewOptionsPopover />` linked to `markdownUrl` without the Vite `base`, so sites served under a base path got a 404. It now prefixes the URL like `<MarkdownCopyButton />` does.

Fix [#3620](https://github.com/fuma-nama/fumadocs/issues/3620)
