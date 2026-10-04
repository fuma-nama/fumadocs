---
packages:
  '@fumadocs/base-ui': patch
---

### Improve Spacious layout on mobile

The page sits in an inset panel on mobile too, while the navbar and table of contents bar stay on the outer surface.

- The sidebar drawer floats as an inset panel, like the AI chat.
- The navbar and table of contents bar stay below the `<Banner />`.
- Like the Docs layout, `--fd-docs-row-3` is the bottom of these bars, so API pages scroll their content below them.
