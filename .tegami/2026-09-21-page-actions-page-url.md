---
packages:
  npm:fumadocs-ui: patch
  npm:@fumadocs/base-ui: patch
---

## AI page actions name the page by the URL the reader is on

The "Open in ..." prompts built the page URL from the router pathname and the origin.
Next's `usePathname()` omits a configured `basePath`, so a site mounted under one sent assistants a URL that did not exist.

The prompt now uses the reader's current URL, without query and hash, and falls back to the pathname during server rendering.
A new `pageUrl` prop on `ViewOptionsPopover` sets a canonical URL instead.
