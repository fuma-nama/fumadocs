---
packages:
  'fumadocs-core': patch
  'fumadocs-mdx': patch
  '@fumadocs/local-md': patch
  '@fumadocs/local-content': patch
  '@fumadocs/satteri': patch
---

### Frontmatter and Meta Files in Code

- An MDX page can export `frontmatter`, merged into its frontmatter and validated by the schema. On a dynamic page, it reads the params as `props`.
- Meta files can be modules, like `meta.ts`. The meta file of a dynamic folder can export a function of the folder's params.
