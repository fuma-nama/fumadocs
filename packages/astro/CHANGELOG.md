## @fumadocs/astro@0.3.0

### Code Blocks on Astro

- Code blocks are highlighted again, instead of rendering inside a second code block.

### Path params at runtime

- Refactored path params: each file of a dynamic path compiles once, and its content reads the params as `props` when rendering.
- Refactored `remarkShow`: conditions are checked when rendering, and the `define` option and `showElement` export are removed.
- The table of contents, structured data and processed Markdown of a page only include the `<show>` branches that show for its props, and give the values of its expressions.
- Headings with expressions get their IDs from the rendered text, and duplicate IDs only count the headings that show.
- Added the `props` option of `getPage()`: the content and outputs of the page follow these props, with its path params.
- Processed Markdown and search records resolve JSX elements like the page, with the components that it imports or declares and the MDX components of its props.
- Search records of Fumadocs MDX keep the elements of every component by default, set `filterElement` of `remarkStructure` to choose them.
- Deprecated the `components` option of `getText()`, pass MDX components as page props.
- Added `unstable_runtimeOutputs` in file data for custom content sources: the plugins export the outputs of a page as functions of its props. Without it, a document with `<show>` fails to compile.
- Added `rehypeHeading`, which gives headings their IDs from code. Fumadocs MDX, `@fumadocs/astro` and local Markdown enable it.
- Added `slugImportSource` of `remarkHeading`: a module that slugs heading IDs from the rendered text, for a custom `slug`.
- The client loader of Fumadocs MDX takes the params of a page: `preload(path, params)`, `getComponent(path, params)` and `useContent(path, props, params)`.
- Table of contents titles resolve MDX components from the page props.
- Loading a page of an async collection or of `@fumadocs/astro` no longer renders its structured data: `structuredData` of the loaded page is read without rendering, `structuredData()` renders it.
- Added the `search` target of `renderToMarkdown()`, which renders search records: `asMarkdown()` returns the target, so a component can give agents more than search indexes.
- Added the `markdown` namespace of `replaceSource()`, for edits of processed Markdown only.
- Search records no longer include the imports of included files.
- The frontmatter in code of Fumadocs MDX can use imports declared after it, and keeps the other variables declared in its statement.
- `@fumadocs/astro` supports frontmatter in code and meta files in code, like `meta.ts`.
- Async pages of Fumadocs MDX load their content once, and render without suspending again once loaded.

## @fumadocs/astro@0.2.2

### Path params and `<show>`

- A folder or file named `[name]` makes a page for each value listed in `staticParams` of its meta file or frontmatter.
- Each page is compiled for its params, read as `props`, and a file at a static path replaces the page of its value.
- `<show when={...}>` shows content on a condition. Conditions on params and inlined env vars are decided before headings, TOC, search and Markdown.
- The `define` option of Remark Show sets the values resolved at build time, like Vite's `define`, also per page.
- Custom sources give a dynamic file `dataAt()`, and `getStaticParams()` lists its params from any storage.

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
