---
packages:
  '@fumadocs/base-ui': minor
  '@fumadocs/cli': patch
  '@fumadocs/language': patch
---

### Introduce Spacious Layout

A new docs layout that puts the page in an inset panel beside the sidebar, with page-level actions at the top of the panel.

- Use it from `fumadocs-ui/layouts/spacious` and `fumadocs-ui/layouts/spacious/page`, and import the styles from `fumadocs-ui/css/generated/spacious.css`.
- Pass `aiChat.panel` to render your AI chat in the layout, docked beside the page on wide screens and floating over it on smaller ones.
- Customize it with `npx @fumadocs/cli customize`, only available for Base UI.

The Chinese presets of `@fumadocs/language` include translations for its new strings.
