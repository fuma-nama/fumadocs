---
packages:
  "fumadocs-mdx": patch
---

### Sort glob results for deterministic codegen

`fumadocs-mdx`'s Node codegen now sorts glob-matched files before generating collections, so the output (and anything derived from `getPages()`) is stable across builds of unchanged content. The Vite codegen path was checked separately: Vite's own `import.meta.glob` already sorts matched files internally, so it did not need the same fix.
