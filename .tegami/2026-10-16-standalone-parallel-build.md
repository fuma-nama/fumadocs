---
packages:
  '@fumadocs/openapi-standalone': patch
---

### Faster static builds

- With at least 200 pages, `generateStatic()` renders them in worker threads, up to half the logical cores.
