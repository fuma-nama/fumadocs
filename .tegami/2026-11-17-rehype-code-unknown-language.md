---
packages:
  'fumadocs-core': patch
  '@fumadocs/satteri': patch
---

### Clearer error for unknown code languages

- Rehype Code names the unknown language of a code block and suggests `fallbackLanguage`.
- Sätteri accepts `rehypeCodeOptions` without `themes`, the defaults fill in the rest.
