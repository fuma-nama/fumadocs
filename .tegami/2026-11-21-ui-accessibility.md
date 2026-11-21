---
packages:
  'fumadocs-ui': patch
  '@fumadocs/base-ui': patch
---

### Accessibility fixes

- The footer of the default and Algolia search dialogs renders inside the dialog, and no longer in the page while the dialog is closed.
- Text meets WCAG AA contrast in every color preset, in light and dark mode, including muted text, active items and search results.
- Collapsed sidebars of the notebook, glass and flux layouts leave the tab order, and the flux sidebar and the spacious drawer follow their triggers in it.
- The skip-to-content link shows when focused, the glass layout's table of contents opens on keyboard focus, and tabs and table-of-contents and menu triggers show a focus ring.
- The glass sidebar's folder toggles are named after their folders, and the language select keeps the visible language in its name and marks options with `lang`.
