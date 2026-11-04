---
packages:
  '@fumadocs/astro': minor
---

### Moved the managed setup to `@fumapress/astro`

- Refactored: `@fumadocs/astro` is the integration for your own routes again.
- `src/fumadocs.config.ts`, `@fumadocs/astro/config`, `@fumadocs/astro/plugins/*`, `HomeLayout.astro` and `ReactContent.astro` moved to `@fumapress/astro`.
- Removed the `layout` and `page` options, use `ui.renderPage` of `@fumapress/astro`.
- See `@fumapress/astro` for the plugins of the managed setup.
- Added the `lastModified` collection option: `page.data.lastModified` is the date of the page's last commit.
- `toFumadocsSource()` accepts `baseDir` as its third argument.
