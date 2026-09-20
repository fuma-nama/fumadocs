---
packages:
  npm:fumadocs-mdx: patch
---

## Fix `experimentalBuildCache` bloating frontmatter-only imports

With a warm build cache, `?only=frontmatter` imports were served the fully compiled page from cache instead of the frontmatter module, so every page was bundled two more times. The cache now only applies to full compilations.
