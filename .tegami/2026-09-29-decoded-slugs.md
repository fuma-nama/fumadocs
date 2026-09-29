---
packages:
  'fumadocs-core': patch
---

### Get pages by decoded slugs

`getPage()` accepts both URI encoded and decoded slugs. React Router and TanStack Router pass decoded params, so pages with spaces or non-ASCII characters in their slugs were not found.

Fix [#3613](https://github.com/fuma-nama/fumadocs/issues/3613)
