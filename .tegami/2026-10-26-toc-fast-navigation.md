---
packages:
  'fumadocs-ui': patch
  '@fumadocs/base-ui': patch
---

### Faster and more stable TOC

- `TOCItems` of the `normal` and `clerk` styles no longer throws "is not iterable" when navigating between pages quickly.
- The TOC track is measured once per change and drawn before paint: less work on navigation, no frame showing the previous page's track.
- The `normal` style highlights the active range right after the page loads, not only after the first scroll.
- Custom heading IDs containing quotes no longer crash the `normal` and `clerk` styles.

Fix [#3754](https://github.com/fuma-nama/fumadocs/issues/3754)
