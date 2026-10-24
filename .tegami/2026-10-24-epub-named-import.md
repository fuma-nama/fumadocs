---
packages:
  'fumadocs-epub': patch
---

### Export without a bundler

- Use the named `EPub` export of `epub-gen-memory`, its CommonJS default export broke the export on runtimes without a bundler, like Astro.
