---
packages:
  'fumadocs-core': patch
  'fumadocs-ui': patch
  '@fumadocs/base-ui': patch
  '@fumadocs/language': patch
---

### Accessibility fixes

- Docs layouts render a visually hidden "Skip to Content" link as the first focusable element.
- Escape closes the mobile sidebar drawer, and focus returns to the trigger when the drawer closes.
- The heading "Copy Anchor Link" button is visible on keyboard focus.
- A `Tab` `id` only links to the tab by URL hash, panels keep the ids that tab triggers point `aria-controls` at.
- Multi-word tab labels produce ids without spaces.
- TOC `single` mode highlights the clicked item and no longer skips headings while scrolling.
- `DocsPage` `editOnGithub` defaults `sha` to `main` as documented.
