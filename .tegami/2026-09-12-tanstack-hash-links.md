---
packages:
  npm:fumadocs-core: patch
---

## Fix same-page anchors on Tanstack Start

Tanstack Router's `Link` takes a pathname in `to` and reads the hash from a separate `hash` prop, so a same-page anchor like `[link](#installation)` was rendered as a link to the current page with the hash dropped, clicking it did nothing. The Tanstack adapter now renders a native `<a>` for those hrefs:

```mdx
Jump to [Installation](#installation).
```
