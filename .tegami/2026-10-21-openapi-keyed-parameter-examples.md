---
packages:
  'fumadocs-openapi': patch
---

### Parameter examples follow the selected request example

When a parameter has an example under the same key as a request body example, that example's request uses it, so each example can show its own path, query, header or cookie values. Without a matching key, a parameter still uses its first example.
