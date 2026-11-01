---
packages:
  '@fumadocs/astro': patch
---

### Managed setup

- With `src/fumadocs.config.ts`, Fumadocs creates the routes of docs pages, search, `llms.txt` and the 404 page, and renders the layout.
- Customize the UI with the `layout` and `page` options, your own React modules; `css` loads your stylesheet.
- Replace the search engine with `useSearch()` or the dialog with `SearchDialog`, exported from the `layout` module.
- Add `takumiPlugin()` for OG images and `openapiPlugin()` for OpenAPI pages.
- Add `HomeLayout.astro` for your own pages.
- Support `includeProcessedMarkdown: { output: 'function' }`: MDX components define their Markdown form with `asMarkdown()`.
