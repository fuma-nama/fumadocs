---
packages:
  'fumadocs-mdx': patch
---

### Macro collections in workspace packages

- Declare macro collections in a workspace package and import them from several apps, each loading its own content.
- Fix `!` patterns in the `files` option of collections not excluding files on Vite.
- Accept `rehypeCodeOptions` without `themes`, the defaults fill in the rest.
