---
packages:
  'fumadocs-core': patch
  'fumadocs-mdx': patch
---

### `remarkInclude` in `fumadocs-core`

`<include>` moved from Fumadocs MDX to `fumadocs-core/mdx-plugins/remark-include`, a unified plugin for any MDX or Markdown pipeline.

- `fumadocs-mdx/config` no longer exports `remarkInclude`, import it from `fumadocs-core/mdx-plugins`.
- `getProcessor` parses included files by their format, like a `.md` file included in an `.mdx` page.
- Headings in an included section get IDs unique among the page's own headings.
- Circular includes throw instead of hanging, and included code files no longer end with an empty line.
- `fumadocs-mdx` requires `fumadocs-core` 16.17.8.
