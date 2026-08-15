---
packages:
  npm:fumadocs-ui: patch
  npm:@fumadocs/base-ui: patch
---

## Add a `main` landmark to docs, notebook and flux pages

Docs pages exposed no `main` landmark: the layout root `#nd-docs-layout` is a `div` and the page container is `<article id="nd-page">`, so `document.querySelectorAll('main, [role=main]')` returned nothing on a rendered docs page. `HomeLayout`'s container is already `<main id="nd-home-layout">`, so docs layouts were the outlier.

The page container now carries `role="main"` in the docs, notebook and flux layouts. The `<article>` element is kept, so the page keeps its article semantics while screen-reader landmark navigation and "skip to main content" affordances get a target. The attribute is applied before the spread props, so a custom `slots.page` container can still override it.
