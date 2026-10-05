---
packages:
  'fumadocs-ui': patch
  '@fumadocs/base-ui': patch
---

### Focus inside the AI chat panel when opened

The `aiChat` panel turns visible as soon as it opens, so its input can take focus right away. It still hides only after the closing transition.
