---
'fumadocs-openapi': major
---

**Renew Generate API.**

**why:** Improve flexibility.

**migrate:**

- Removed the `render` option from `generate` and `generateTags`, use `frontmatter` to customise frontmatter, `imports` to customise imports.

- Removed the `render` option from `generateFiles`, use `options` to customise OpenAPI docs generation instead.
