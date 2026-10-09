---
packages:
  'fumadocs-core': patch
  '@fumadocs/satteri': patch
  'fumadocs-epub': patch
---

### Fix Markdown output and search records

- `remarkImage()` with `onError: 'hide'` removes the right images when a paragraph has several, and Sätteri removes them from the Markdown too.
- `files` code blocks of `remarkMdxFiles()` nest the entries under the last item of a folder (after `└──`), and trees indented with spaces only.
- The remark and rehype plugins no longer slow down quadratically on large documents, like `rehypeToc()` taking 17 ms instead of 239 ms on a 5 MB page.
- `fumadocs-epub` removes every unresolved image, the second of two adjacent ones was kept.
- Sätteri: headings with expression props, like `<Badge value={1} />` or local images, compile again, without these elements in their `toc` entry.
- Sätteri: `remarkStructure()` records every node type listed in `types`, like `fumadocs-core`. A blockquote is one search record instead of two. In the Markdown, includes and type tables stay inside their list item or blockquote, heading IDs no longer break setext and closed ATX headings, and nested replacements no longer duplicate the source after them.
