---
packages:
  'fumadocs-core': minor
  '@fumadocs/satteri': minor
  'fumadocs-mdx': patch
  'fumadocs-typescript': minor
  'fumadocs-docgen': minor
  'fumadocs-obsidian': patch
  'fumadocs-python': patch
---

### Markdown and search records from the authored source

`remarkLLMs()` and `remarkStructure()` of `fumadocs-core` slice their Markdown from the authored source like Sätteri, instead of stringifying the syntax tree. It is much faster, Markdown is no longer escaped or reformatted, and local images keep their addresses. Re-sync your search indexes to pick up the new records.

- Plugins record the Markdown of content they replace with `replaceSource()` or `embedSource()` from `fumadocs-core/mdx-plugins/stringifier`, in place of `data._stringify`, and add search records with `data.structuredData`. Nodes they insert otherwise are left out.
- Search records are always Markdown, also in Sätteri. `filterElement` replaces `stringify.filterElement`, it chooses the JSX elements kept as HTML tags (`File`, `TypeTable`, `Callout` and `Card` by default) that search dialogs render as components. Other elements and links are replaced by their content, images are removed, and an element on one line is recorded like a paragraph.
- Removed `defaultStringifier()` (use `createStringifier()`), `StringifyOptions`, `allowedMdxAttributes`, `filterMdxAttributes`, `placeholder()` (use `mdxAsPlaceholder`), and the `stringify` and `mdast-util-to-markdown` options of both plugins.
- Included content goes through the plugins like the document's own, Sätteri includes `.md` files as Markdown.
- `<auto-files>` shows its files in a code block, `auto-type-table` its props in a Markdown table, created by `typeTableToMarkdown()` from `fumadocs-typescript`.
- `remarkShow()` and `fileGenerator()` of `fumadocs-docgen` record their Markdown, generators receive the `file` to do the same.
- Records of `fumadocs-obsidian` resolve wikilinks, and leave comments, block IDs, callout markers and embeds out. Comments are removed before parsing, so they no longer split a paragraph.
- Pages of `fumadocs-python` compile from their MDX, so they have Markdown and search records.
- `fumadocs-mdx`, `fumadocs-docgen` and `fumadocs-obsidian` require `fumadocs-core` 16.17.0.

Fix [#3662](https://github.com/fuma-nama/fumadocs/issues/3662)
