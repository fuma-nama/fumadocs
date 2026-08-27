---
packages:
  npm:fumadocs-ui: patch
  npm:@fumadocs/base-ui: patch
---

## Fix Next.js `<Link>` not scrolling to top under docs layouts

The page container rendered `<main style="display: contents">`, which Next.js' scroll handler treats as a hidden element: `display: contents` generates no box, so its `getBoundingClientRect()` is all-zero, indistinguishable from `display: none`. The handler skips it (and the sticky TOC siblings) without ever descending into children, dropping the scroll-to-top on navigation entirely.

The `<main>` element in Docs, Notebook and Flux page containers is now a real grid item (`display: grid; grid-area: main`) wrapping the unchanged `#nd-page` article, which centers via the grid instead of `mx-auto`. Rendering is identical, but if your custom CSS has element rules on `main` that were previously inert, they now apply.
