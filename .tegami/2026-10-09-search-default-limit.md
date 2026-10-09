---
packages:
  'fumadocs-core': patch
---

### Limit results of the advanced search server

- Without a `limit` in the request, it returns up to 60 results instead of every matched record.
- The `limit` in its `search` option applies to requests without one.
