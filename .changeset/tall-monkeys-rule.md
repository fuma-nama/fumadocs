---
'next-docs-zeta': major
'next-docs-ui': patch
---

Update search utilities import paths.

Search Utilities in `next-docs-zeta/server` is now moved to `next-docs-zeta/search` and `next-docs-zeta/server-algolia`.

Client-side Changes:
`next-docs-zeta/search` -> `next-docs-zeta/search/client`
`next-docs-zeta/search-algolia` -> `next-docs-zeta/search-algolia/client`

If you're using Next Docs UI, make sure to import the correct path.
