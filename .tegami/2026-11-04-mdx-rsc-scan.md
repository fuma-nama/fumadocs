---
packages:
  'fumadocs-mdx': patch
---

### Faster Vite RSC builds

- The Vite plugin compiles only the imports of MDX files in the scan build of `@vitejs/plugin-rsc`, instead of compiling them twice.
