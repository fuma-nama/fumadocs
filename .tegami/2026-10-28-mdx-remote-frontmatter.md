---
packages:
  '@fumadocs/mdx-remote': patch
---

### `compileFile()` parses frontmatter

- `compileFile()` strips the frontmatter from the content and parses it into `file.data.frontmatter`, unless the file already has it. Content compiled for the client no longer renders its frontmatter.
- `compile()` works when destructured from the compiler.
