---
packages:
  '@fumadocs/astro': minor
---

### Moved the managed setup to `@fumapress/astro`

- Refactored: `@fumadocs/astro` is the integration for your own routes again.
- `src/fumadocs.config.ts`, `@fumadocs/astro/config`, `@fumadocs/astro/plugins/*`, the `layout` and `page` options, `HomeLayout.astro` and `ReactContent.astro` moved to `@fumapress/astro`.
- Added the `lastModified` collection option: `page.data.lastModified` is the date of the page's last commit.

| Before                                                       | Now                                  |
| ------------------------------------------------------------ | ------------------------------------ |
| `src/fumadocs.config.ts`                                     | `press.config.tsx`                   |
| `fumadocs({ layout, page })`                                 | `press({ layout, page })`            |
| `plugins/openapi`, `asyncapi`, `graphql`, `notion`, `sanity` | `<pkg>/plugin`                       |
| `plugins/takumi`, `llms.txt`, search, `link-validation`      | `@fumapress/core` preset and plugins |
| `plugins/git`                                                | `site.git` and `lastModified`        |
| `plugins/mcp`                                                | `mcpPlugin()` of `@fumapress/ai`     |
| `baseOptions`                                                | `defaultLayoutProps`                 |
| `head` component                                             | `head()` tags                        |
| `css` option, `src/styles/global.css`                        | `src/app.css`                        |
| `/og/<page>/image.webp`                                      | `<page>.webp`                        |
