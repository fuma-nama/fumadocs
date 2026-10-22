---
packages:
  'fumadocs-core': patch
  '@fumadocs/satteri': patch
---

### Processed Markdown links page-relative images at their served URLs

- Images imported by Remark Image get the URLs bundlers serve them at in Remark LLMs, instead of their relative paths
- Stringifiers output JS expressions with `s.expression()`, for Markdown only known at runtime
- Search records of included content with images are no longer cut
- The Sätteri preset only imports images in bundlers, at runtime it resolves their sizes like the MDX preset
