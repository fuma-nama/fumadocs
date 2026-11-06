## @fumadocs/astro@0.2.1

### `components` of `<Content />` on Astro

- The `components` of `<Content />` render like in Astro MDX, `.astro` components included, so `createRelativeLink()` resolves relative links.

## @fumadocs/astro@0.2.0

### Moved the managed setup to `@fumapress/astro`

- Refactored: `@fumadocs/astro` is the integration for your own routes again.
- `src/fumadocs.config.ts`, `@fumadocs/astro/config`, `@fumadocs/astro/plugins/*`, `HomeLayout.astro` and `ReactContent.astro` moved to `@fumapress/astro`.
- Removed the `layout` and `page` options, use `ui.renderPage` of `@fumapress/astro`.
- See `@fumapress/astro` for the plugins of the managed setup.
- Added the `lastModified` collection option: `page.data.lastModified` is the date of the page's last commit.
- `toFumadocsSource()` accepts `baseDir` as its third argument.

## @fumadocs/astro@0.1.2

### Managed setup

- With `src/fumadocs.config.ts`, Fumadocs creates the routes of docs pages, search, `llms.txt` and the 404 page, and renders the layout.
- Customize the UI with the `layout` and `page` options, your own React modules; `css` loads your stylesheet.
- Replace the search engine with `useSearch()` or the dialog with `SearchDialog`, exported from the `layout` module.
- Add `takumiPlugin()` for OG images and `openapiPlugin()` for OpenAPI pages.
- Add `HomeLayout.astro` for your own pages.
- Support `includeProcessedMarkdown: { output: 'function' }`: MDX components define their Markdown form with `asMarkdown()`.

## @fumadocs/astro@0.1.1

### Official Astro support

- New `@fumadocs/astro` integration, running the Markdown features of Fumadocs on the Sätteri processor of Astro. It adds the React and MDX integrations unless they are configured.
- MDX content renders as one React island with the `components` of its collection, Fumadocs UI components work in full. Without them, it renders as Astro MDX.
- The `wrapper` component receives the props of `<Content />`, for providers like i18n.
- Islands with `transition:persist` keep their state on navigation, the content of the new page moves into them.
- The `collections` option defines the content directories of Fumadocs, each can override the options of the integration. `pageLoader()` and `metaLoader()` load them by name into Astro content collections with the schemas of Fumadocs, and `toFumadocsSource()` creates the source of Fumadocs. Its pages load their content with `page.data.load()`, like other content sources.
- The Astro template uses `@fumadocs/astro`.
