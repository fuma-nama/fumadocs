---
packages:
  '@fumadocs/astro': minor
---

### Moved the managed setup to `@fumapress/astro`

- Refactored: `@fumadocs/astro` is the integration for your own routes again.
- `src/fumadocs.config.ts`, `@fumadocs/astro/config`, `@fumadocs/astro/plugins/*`, `HomeLayout.astro` and `ReactContent.astro` moved to `@fumapress/astro`.
- Removed the `layout` and `page` options, use `ui.renderPage` of `@fumapress/astro`.
- Added the `lastModified` collection option: `page.data.lastModified` is the date of the page's last commit.

| Before                                                       | Now                                                    |
| ------------------------------------------------------------ | ------------------------------------------------------ |
| `src/fumadocs.config.ts`                                     | `press.config.tsx` with `createPress()`                |
| `fumadocs({ layout, page })`                                 | `press()`, with `ui.renderPage` in `press.config.tsx`  |
| `plugins/openapi`, `asyncapi`, `graphql`, `notion`, `sanity` | `<pkg>/plugin`                                         |
| `plugins/takumi`, `llms.txt`, search, `link-validation`      | `@fumapress/astro/plugins/*` and `recommendedPreset()` |
| `plugins/git`                                                | `site.git` and `lastModified`                          |
| `plugins/mcp`                                                | `mcpPlugin()` of `@fumapress/ai`                       |
| `baseOptions`                                                | `ui.baseOptions`                                       |
| `head` component                                             | `head()` tags                                          |
| `css` option, `src/styles/global.css`                        | `src/app.css`                                          |
| `/og/<page>/image.webp`                                      | `<page>.webp`                                          |
