---
packages:
  npm:fumadocs-ui: patch
  npm:@fumadocs/base-ui: patch
---

## Add a `main` landmark to docs, notebook and flux pages

The page container slot now wraps `<article id="nd-page">` in a `<main class="contents">` in the docs, notebook and flux layouts. All props, `id="nd-page"` and the layout classes stay on the `<article>`, so existing selectors and refs keep working.
