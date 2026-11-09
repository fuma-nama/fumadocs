---
packages:
  'fumadocs-mdx': patch
---

### Meta Files and Frontmatter in Code with the Macro

- Vite builds with the React plugin load JSON meta files of macro collections again.
- Frontmatter in code applies to dynamic pages of lazy collections the macro can't detect as lazy, like `async` set through a spread.
