---
packages:
  'fumadocs-core': patch
  '@fumadocs/satteri': patch
---

### Fix Markdown output and search records

- `remarkImage()` with `onError: 'hide'` removes the right images when a paragraph has several, and Sätteri removes them from the Markdown too.
- `files` code blocks of `remarkMdxFiles()` nest the entries under the last item of a folder (after `└──`), and trees indented with spaces only.
- Sätteri: headings with expression props, like `<Badge value={1} />` or local images, compile again, without these elements in their `toc` entry.
- Sätteri: a blockquote is one search record instead of two. In the Markdown, includes and type tables stay inside their list item or blockquote, heading IDs no longer break setext and closed ATX headings, and nested replacements no longer duplicate the source after them.
