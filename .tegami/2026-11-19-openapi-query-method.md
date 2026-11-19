---
packages:
  'fumadocs-openapi': patch
---

### Support the HTTP QUERY method

- Generate pages and code samples for `query`, `options` and `trace` operations, with a playground for the methods browsers can send.
- Show QUERY in its own color, and OPTIONS, TRACE and unknown methods in gray.
- The playground sends its requests to the proxy as `POST`, so the proxy route only needs a `POST` handler and supports every method.
- The proxy keeps the method of non-POST requests on 301/302 redirects, like `fetch()`.
- Example request bodies leave out read-only properties for every method.
- The playground centers its empty parameters message, and response descriptions replace "No example available.".
